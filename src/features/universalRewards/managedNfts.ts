import { encodeAbiParameters, keccak256, parseAbi, parseAbiItem, zeroAddress, type Address } from 'viem'
import { finalizedNftJournalAbi, managedNftCollectionAbi, universalRewardsV33Abi } from './abi'
import { isV3MissingSelector, type V3Client, type V3Deployment } from './runtime'

export const managed1155Abi = parseAbi([
  'function balanceOf(address account,uint256 id) view returns (uint256)',
  'function rewardsHook() view returns (address)',
  'function uri(uint256 id) view returns (string)',
])
export const managed721Abi = parseAbi([
  'function ownerOf(uint256 id) view returns (address)',
  'function tokenURI(uint256 id) view returns (string)',
])
const transfer721 = parseAbiItem('event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)')
const transferSingle = parseAbiItem(
  'event TransferSingle(address indexed operator,address indexed from,address indexed to,uint256 id,uint256 value)',
)
const transferBatch = parseAbiItem(
  'event TransferBatch(address indexed operator,address indexed from,address indexed to,uint256[] ids,uint256[] values)',
)
export const SETTLEMENT_SOURCE = BigInt(137)

export async function describeManagedCollection(
  client: V3Client,
  adapter: Address,
  poolId?: bigint,
  blockNumber?: bigint,
) {
  const position = { address: adapter, abi: managedNftCollectionAbi, blockNumber }
  const [sourceChainId, collection, standard, maxUnits, limit, journal, units] = await Promise.all([
    client.readContract({ ...position, functionName: 'sourceChainId' }),
    client.readContract({ ...position, functionName: 'sourceCollection' }),
    client.readContract({ ...position, functionName: 'standard' }),
    client.readContract({ ...position, functionName: 'maxUnits' }),
    poolId === undefined ? undefined : client.readContract({ ...position, functionName: 'unitLimit', args: [poolId] }),
    client.readContract({ ...position, functionName: 'journal' }),
    poolId === undefined
      ? BigInt(0)
      : client.readContract({ ...position, functionName: 'activeUnits', args: [poolId] }),
  ])
  const stream =
    journal === zeroAddress
      ? undefined
      : await client.readContract({
          address: journal,
          abi: finalizedNftJournalAbi,
          functionName: 'streams',
          args: [adapter],
          blockNumber,
        })
  return {
    adapter,
    sourceChainId,
    collection,
    standard,
    maxUnits,
    limit: limit ?? maxUnits,
    units,
    journal: stream?.[0],
    paused: stream?.[6],
    nextObservation: stream?.[1],
  }
}

export type ManagedCollection = Awaited<ReturnType<typeof describeManagedCollection>>

export async function readManagedAdapter(
  client: V3Client,
  deployment: V3Deployment,
  sourceChainId: bigint,
  collection: Address,
  blockNumber: bigint,
) {
  const key = keccak256(encodeAbiParameters([{ type: 'uint256' }, { type: 'address' }], [sourceChainId, collection]))
  try {
    return await client.readContract({
      address: deployment.address,
      abi: universalRewardsV33Abi,
      functionName: 'managedAdapter',
      args: [key],
      blockNumber,
    })
  } catch (error) {
    if (isV3MissingSelector(error)) return undefined
    throw error
  }
}

export async function readManagedCollection(
  client: V3Client,
  deployment: V3Deployment,
  adapter: Address,
  poolId: bigint | undefined,
  blockNumber: bigint,
) {
  try {
    const approved = await client.readContract({
      address: deployment.address,
      abi: universalRewardsV33Abi,
      functionName: 'managedCollection',
      args: [adapter],
      blockNumber,
    })
    return approved ? describeManagedCollection(client, adapter, poolId, blockNumber) : undefined
  } catch (error) {
    if (isV3MissingSelector(error)) return undefined
    throw error
  }
}

export async function discoverManagedIds(client: V3Client, rule: ManagedCollection, account: Address) {
  const tip = await client.getBlockNumber()
  const window = BigInt(2_000)
  const input = {
    address: rule.collection,
    args: { to: account },
    fromBlock: tip > window ? tip - window : BigInt(0),
    toBlock: tip,
    strict: true,
  } as const
  if (rule.standard === 721) {
    const logs = await client.getLogs({ ...input, event: transfer721 })
    const ids = Array.from(new Set(logs.map(({ args }) => args.tokenId).reverse())).slice(0, 12)
    const live = await Promise.all(
      ids.map((id) =>
        client
          .readContract({
            address: rule.collection,
            abi: managed721Abi,
            functionName: 'ownerOf',
            args: [id],
            blockNumber: tip,
          })
          .then(
            (owner) => owner.toLowerCase() === account.toLowerCase(),
            () => false,
          ),
      ),
    )
    return ids.filter((_, index) => live[index])
  }
  const [single, batch] = await Promise.all([
    client.getLogs({ ...input, event: transferSingle }),
    client.getLogs({ ...input, event: transferBatch }),
  ])
  const ids = Array.from(
    new Set([...batch.flatMap(({ args }) => [...args.ids]), ...single.map(({ args }) => args.id)].reverse()),
  ).slice(0, 12)
  const balances = await Promise.all(
    ids.map((id) =>
      client.readContract({
        address: rule.collection,
        abi: managed1155Abi,
        functionName: 'balanceOf',
        args: [account, id],
        blockNumber: tip,
      }),
    ),
  )
  return ids.filter((_, index) => balances[index] > BigInt(0))
}
