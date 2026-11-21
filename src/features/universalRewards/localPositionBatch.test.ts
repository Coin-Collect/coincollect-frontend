import { ContractFunctionZeroDataError } from 'viem'
import type { NftRef } from './reader'
import { readV3BatchLimit, type V3Client, type V3Deployment } from './runtime'
import { manageV3Positions, sendV3Call } from './transactions'

const mockLocalMode = { enabled: false }
jest.mock('config/localFork', () => ({
  get isLocalForkMode() {
    return mockLocalMode.enabled
  },
  getLocalForkRpcUrl: () => 'http://127.0.0.1:18545',
}))

const address = '0x0000000000000000000000000000000000000001'
const local: V3Deployment = { address, chainId: 31337, runtimeHash: '0x1234' }
const polygon = { ...local, chainId: 137 }
const refs: NftRef[] = [{ sourceChainId: BigInt(137), collection: address, tokenId: BigInt(1) }]
const readContract = jest.fn()
const client = { readContract } as unknown as V3Client
const block = BigInt(10)

beforeEach(() => {
  mockLocalMode.enabled = false
  readContract.mockReset()
})

test('never probes or builds experimental batches for a Polygon deployment', async () => {
  mockLocalMode.enabled = true
  await expect(readV3BatchLimit(client, polygon, block)).resolves.toBe(0)
  expect(readContract).not.toHaveBeenCalled()
  expect(() => manageV3Positions(polygon, BigInt(1), refs, 'claimBatch')).toThrow('individual NFT confirmations')
  const localCall = manageV3Positions(local, BigInt(1), refs, 'claimBatch')
  const wallet = {} as Parameters<typeof sendV3Call>[2]
  await expect(sendV3Call(client, polygon, wallet, address, localCall)).rejects.toThrow('individual NFT confirmations')
})

test('requires local fork mode even if the deployment reports chain 31337', async () => {
  await expect(readV3BatchLimit(client, local, block)).resolves.toBe(0)
  expect(readContract).not.toHaveBeenCalled()
  expect(() => manageV3Positions(local, BigInt(1), refs, 'exitBatch')).toThrow('individual NFT confirmations')
})

test('recognizes the local experiment and preserves the individual fallback on a frozen ledger', async () => {
  mockLocalMode.enabled = true
  readContract
    .mockResolvedValueOnce(BigInt(32))
    .mockRejectedValueOnce(new ContractFunctionZeroDataError({ functionName: 'batchPositionLimit' }))
    .mockResolvedValueOnce(BigInt(1000))
  await expect(readV3BatchLimit(client, local, block)).resolves.toBe(32)
  await expect(readV3BatchLimit(client, local, block)).resolves.toBe(0)
  await expect(readV3BatchLimit(client, local, block)).resolves.toBe(0)
})
