import type { WalletClient } from 'viem'
import { executeReplenishmentJob, executeTreasuryRecovery, pickV3Batch } from './automation'
import type { V3Client, V3Deployment } from './runtime'

const address = '0x0000000000000000000000000000000000000001' as const
const hash = '0x0123456789abcdef' as const
const deployment: V3Deployment = { address, runtimeHash: hash, chainId: 31337 }
const job = {
  poolId: BigInt(2),
  token: address,
  epoch: 5,
  amount: BigInt(75),
  minimum: BigInt(70),
  deadline: BigInt(5000),
}

function worker() {
  const readContract = jest
    .fn()
    .mockImplementation(({ functionName }) =>
      functionName === 'fundingLane' ? { purchased: false, lastEpoch: 0 } : [5, BigInt(75)],
    )
  const simulateContract = jest.fn().mockResolvedValue({ request: {} })
  const waitForTransactionReceipt = jest.fn()
  const getContractEvents = jest.fn()
  const estimateContractGas = jest.fn().mockResolvedValue(BigInt(57_000))
  const client = {
    readContract,
    simulateContract,
    waitForTransactionReceipt,
    getContractEvents,
    estimateContractGas,
  } as unknown as V3Client
  const writeContract = jest.fn().mockResolvedValue(hash)
  const executor = { writeContract } as unknown as WalletClient
  const run = () => executeReplenishmentJob(client, executor, deployment, address, job)
  const recover = () => executeTreasuryRecovery(client, executor, deployment, address, job.poolId, job.token)
  return { run, recover, readContract, writeContract, simulateContract, waitForTransactionReceipt, getContractEvents }
}

describe('V3 automation', () => {
  it('rotates a bounded batch through all configured pools', () => {
    const total = BigInt(13)
    const visited = new Set<number>()
    for (let tick = 0; tick < 13; tick++) {
      const batch = pickV3Batch(total, BigInt(tick))
      expect(new Set(batch).size).toBe(4)
      batch.forEach((poolId) => visited.add(Number(poolId)))
    }
    expect(visited.size).toBe(13)
    expect(pickV3Batch(BigInt(0), BigInt(0))).toEqual([])
  })

  it('checks the recorded funding window before sending after an interruption', async () => {
    const test = worker()
    test.readContract.mockResolvedValueOnce({ purchased: true, lastEpoch: job.epoch })
    await expect(test.run()).resolves.toMatchObject({ status: 'already-executed' })
    expect(test.writeContract).not.toHaveBeenCalled()
  })

  it('defers expired quotes without a wallet broadcast', async () => {
    const test = worker()
    test.simulateContract.mockRejectedValueOnce(new Error('price moved'))
    await expect(test.run()).resolves.toMatchObject({ status: 'deferred' })
    expect(test.writeContract).not.toHaveBeenCalled()
  })

  it('proves a confirmed purchase with its receipt and the exact funding event', async () => {
    const test = worker()
    test.waitForTransactionReceipt.mockResolvedValueOnce({ status: 'success', blockNumber: BigInt(72) })
    test.getContractEvents.mockResolvedValueOnce([{ transactionHash: hash }])
    await expect(test.run()).resolves.toMatchObject({ status: 'confirmed', hash })
    expect(test.getContractEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'Replenished',
        args: { poolId: job.poolId, token: job.token, epoch: job.epoch },
      }),
    )
  })

  it('returns the pending hash when receipt status cannot be established', async () => {
    const test = worker()
    test.waitForTransactionReceipt.mockRejectedValueOnce(new Error('receipt unavailable'))
    await expect(test.run()).resolves.toMatchObject({ status: 'pending', hash })
    expect(test.writeContract).toHaveBeenCalledTimes(1)
  })

  it('skips settled inventory and independently retries a token that cannot be recovered', async () => {
    const test = worker()
    test.readContract.mockResolvedValueOnce({ inventory: BigInt(0) }).mockResolvedValueOnce({ inventory: BigInt(75) })
    test.simulateContract.mockRejectedValueOnce(new Error('transfers blocked'))
    await expect(test.recover()).resolves.toBeUndefined()
    await expect(test.recover()).resolves.toMatchObject({ action: 'treasury-recovery', status: 'deferred' })
    expect(test.writeContract).not.toHaveBeenCalled()
  })

  it('requires the expiry settlement event from the submitted transaction', async () => {
    const test = worker()
    test.readContract.mockResolvedValueOnce({ inventory: BigInt(75) })
    test.simulateContract.mockResolvedValueOnce({ request: {}, result: BigInt(75) })
    test.waitForTransactionReceipt.mockResolvedValueOnce({
      status: 'success',
      transactionHash: hash,
      blockNumber: BigInt(72),
    })
    test.getContractEvents.mockResolvedValueOnce([{ transactionHash: hash }])
    await expect(test.recover()).resolves.toMatchObject({ action: 'treasury-recovery', status: 'confirmed', hash })
    expect(test.getContractEvents).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'ExpiredRewardsRecovered', args: { poolId: job.poolId, token: job.token } }),
    )
  })
})
