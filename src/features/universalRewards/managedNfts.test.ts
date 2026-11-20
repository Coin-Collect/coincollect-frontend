import { encodeAbiParameters, keccak256, zeroAddress, type Address } from 'viem'
import { discoverManagedIds, readManagedAdapter, type ManagedCollection } from './managedNfts'
import type { V3Client } from './runtime'

const nft = '0x0000000000000000000000000000000000000011'
const adapter = '0x0000000000000000000000000000000000000022'
const ledger = '0x0000000000000000000000000000000000000033'
const account = '0x0000000000000000000000000000000000000044'
const block = BigInt(1010)

it('looks up the canonical source-chain and collection pair', async () => {
  const readContract = jest.fn().mockResolvedValue(adapter)
  const address = await readManagedAdapter(
    { readContract } as unknown as V3Client,
    { address: ledger, chainId: 31337, runtimeHash: keccak256('0x') },
    BigInt(8453),
    nft,
    block,
  )
  expect(address).toBe(adapter)
  const key = keccak256(encodeAbiParameters([{ type: 'uint256' }, { type: 'address' }], [BigInt(8453), nft]))
  expect(readContract).toHaveBeenCalledWith(expect.objectContaining({ args: [key], blockNumber: block }))
})

it('deduplicates transfer batches and removes positions with zero live balance', async () => {
  const rule: ManagedCollection = {
    adapter,
    collection: nft,
    sourceChainId: BigInt(137),
    standard: 1155,
    maxUnits: 20,
    limit: 8,
    units: BigInt(0),
    journal: zeroAddress,
    paused: false,
    nextObservation: undefined,
  }
  const getLogs = jest
    .fn()
    .mockResolvedValueOnce([{ args: { id: BigInt(25) } }])
    .mockResolvedValueOnce([{ args: { ids: [BigInt(25), BigInt(26), BigInt(27)] } }])
  const readContract = jest.fn().mockImplementation(({ args }: { args: [Address, bigint] }) => {
    return Promise.resolve(args[1] === BigInt(26) ? BigInt(0) : BigInt(1))
  })
  const client = { getBlockNumber: async () => block, getLogs, readContract } as unknown as V3Client
  await expect(discoverManagedIds(client, rule, account)).resolves.toEqual([BigInt(25), BigInt(27)])
  expect(readContract).toHaveBeenCalledTimes(3)
  expect(getLogs).toHaveBeenCalledWith(expect.objectContaining({ args: { to: account }, toBlock: block }))
})
