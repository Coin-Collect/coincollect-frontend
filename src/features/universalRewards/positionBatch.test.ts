import { ContractFunctionZeroDataError, decodeFunctionData, keccak256, type WalletClient } from 'viem'
import { positionBatchAbi } from './positionBatch'
import type { NftRef } from './reader'
import { readV3BatchLimit, type V3Client, type V3Deployment } from './runtime'
import { manageV3Positions, sendV3Call, withV3GasHeadroom } from './transactions'

const address = '0x0000000000000000000000000000000000000001'
const code = '0x1234'
const polygon: V3Deployment = { address, chainId: 137, runtimeHash: keccak256(code) }
const local = { ...polygon, chainId: 31337 }
const refs: NftRef[] = [1, 2, 3].map((id) => ({ sourceChainId: BigInt(137), collection: address, tokenId: BigInt(id) }))
const block = BigInt(10)
const missingBatch = () => new ContractFunctionZeroDataError({ functionName: 'batchPositionLimit' })
const readContract = jest.fn()

beforeEach(() => {
  readContract.mockReset()
})

test('probes the configured ledger for batch support on both supported networks', async () => {
  const client = { readContract } as unknown as V3Client
  readContract.mockResolvedValueOnce(BigInt(32)).mockResolvedValueOnce(BigInt(32))
  await expect(readV3BatchLimit(client, polygon, block)).resolves.toBe(32)
  await expect(readV3BatchLimit(client, local, block)).resolves.toBe(32)
  expect(readContract).toHaveBeenCalledTimes(2)
  expect(readContract).toHaveBeenLastCalledWith(
    expect.objectContaining({ address, functionName: 'batchPositionLimit', blockNumber: block }),
  )
})

test('keeps the per-NFT fallback on a ledger without a valid batch limit', async () => {
  const client = { readContract } as unknown as V3Client
  readContract.mockRejectedValueOnce(missingBatch()).mockResolvedValueOnce(BigInt(1000))
  await expect(readV3BatchLimit(client, polygon, block)).resolves.toBe(0)
  await expect(readV3BatchLimit(client, local, block)).resolves.toBe(0)
})

test.each(['claimBatch', 'exitBatch'] as const)('%s submits the complete NFT selection exactly once', async (name) => {
  const call = manageV3Positions(polygon, BigInt(1), refs, name)
  expect(decodeFunctionData({ abi: positionBatchAbi, data: call.data })).toEqual({
    functionName: name,
    args: [BigInt(1), refs],
  })
  const estimate = BigInt(100_000)
  const gas = withV3GasHeadroom(estimate, { ledger: address, call })
  expect(gas).toBe(BigInt(595_000))
  const sendTransaction = jest.fn().mockResolvedValue('0x12')
  const provider = {
    getChainId: jest.fn().mockResolvedValue(137),
    getCode: jest.fn().mockResolvedValue(code),
    readContract: jest.fn().mockResolvedValue(BigInt(32)),
    call: jest.fn().mockResolvedValue({}),
    estimateGas: jest.fn().mockResolvedValue(estimate),
    getGasPrice: jest.fn().mockResolvedValue(BigInt(1)),
    getBalance: jest.fn().mockResolvedValue(BigInt(10_000_000)),
  }
  const wallet = {
    sendTransaction,
    getChainId: provider.getChainId,
    getAddresses: jest.fn().mockResolvedValue([address]),
  } as unknown as WalletClient
  const client = provider as unknown as V3Client
  await expect(sendV3Call(client, polygon, wallet, address, call)).resolves.toBe('0x12')
  expect(sendTransaction).toHaveBeenCalledTimes(1)
  expect(sendTransaction).toHaveBeenCalledWith(expect.objectContaining({ ...call, gas }))

  sendTransaction.mockClear()
  provider.call.mockClear()
  provider.readContract.mockRejectedValueOnce(missingBatch())
  await expect(sendV3Call(client, polygon, wallet, address, call)).rejects.toThrow('individual NFT confirmations')
  expect(provider.call).not.toHaveBeenCalled()
  expect(sendTransaction).not.toHaveBeenCalled()
})
