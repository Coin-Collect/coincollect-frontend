import { BigNumber } from '@ethersproject/bignumber'
import { MaxUint256 } from '@ethersproject/constants'
import { Contract } from '@ethersproject/contracts'
import { getAddress, isAddress } from '@ethersproject/address'
import type { Provider } from '@ethersproject/providers'
import type { PublicV2Pool } from '../publication'
import { applySoliditySideReward } from '../economics'
import { getPolygonRuntimeChainId } from 'config/localFork'
import { getNftSmartChefFactoryAddress } from 'utils/addressHelpers'
import { v2Erc20UserAbi, v2Erc721UserAbi, v2PoolUserAbi } from './abi'
import type { V2NftTuple, V2PendingReward, V2UserCollection, V2UserPosition } from './types'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const MAX_COLLECTIONS = 32
const MAX_SIDE_REWARDS = 32

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase()
}

function blockCall(contract: Contract, method: string, args: unknown[], blockTag: number): Promise<any> {
  return contract.callStatic[method](...args, { blockTag })
}

export async function readV2IndexedArrayAtBlock(
  contract: Contract,
  method: string,
  blockTag: number,
  hardCap: number,
): Promise<string[]> {
  const values: string[] = []
  for (let index = 0; index < hardCap; index += 1) {
    try {
      values.push(getAddress(await blockCall(contract, method, [index], blockTag)))
    } catch (error: any) {
      if (error?.code === 'CALL_EXCEPTION' || error?.error?.code === 'CALL_EXCEPTION') return values
      throw error
    }
  }
  try {
    await blockCall(contract, method, [hardCap], blockTag)
  } catch (error: any) {
    if (error?.code === 'CALL_EXCEPTION' || error?.error?.code === 'CALL_EXCEPTION') return values
    throw error
  }
  throw new Error(`Pool ${method} exceeded the ${hardCap}-item safety limit; position reads stopped.`)
}

function assertPublishedConfiguration(pool: PublicV2Pool, currentCollections: string[], rewardAddresses: string[]) {
  const publishedCollections = pool.snapshot.collections.map((item) => item.address.toLowerCase()).sort()
  const actualCollections = currentCollections.map((item) => item.toLowerCase()).sort()
  if (
    publishedCollections.length !== actualCollections.length ||
    publishedCollections.some((item, index) => item !== actualCollections[index])
  ) {
    throw new Error('The pool collection list changed after publication. Position enumeration is paused for safety.')
  }
  const publishedRewards = pool.snapshot.rewards.map((item) => item.address.toLowerCase()).sort()
  const actualRewards = rewardAddresses.map((item) => item.toLowerCase()).sort()
  if (
    publishedRewards.length !== actualRewards.length ||
    publishedRewards.some((item, index) => item !== actualRewards[index])
  ) {
    throw new Error('The pool reward-token list changed after publication. Refresh the public pool record first.')
  }
}

export async function readV2UserPosition(
  poolRecord: PublicV2Pool,
  provider: Provider,
  account: string,
  options: { expectedChainId?: number; tokenTupleCap?: number } = {},
): Promise<V2UserPosition> {
  if (!isAddress(poolRecord.address) || !isAddress(account) || !isAddress(poolRecord.factoryAddress))
    throw new Error('Pool or wallet address is invalid.')
  const expectedChainId = options.expectedChainId ?? getPolygonRuntimeChainId()
  const network = await provider.getNetwork()
  if (network.chainId !== expectedChainId)
    throw new Error(`Wrong wallet network. Connect to chain ${expectedChainId} to read this pool.`)

  const address = getAddress(poolRecord.address)
  const wallet = getAddress(account)
  const blockNumber = await provider.getBlockNumber()
  const [poolCode, factoryCode, expectedFactory] = await Promise.all([
    provider.getCode(address, blockNumber),
    provider.getCode(poolRecord.factoryAddress, blockNumber),
    Promise.resolve(getNftSmartChefFactoryAddress(137)),
  ])
  if (!poolCode || poolCode === '0x' || !factoryCode || factoryCode === '0x')
    throw new Error('The published pool or its factory has no contract code on the connected network.')
  if (!expectedFactory || !sameAddress(poolRecord.factoryAddress, expectedFactory))
    throw new Error('This pool does not belong to the configured Polygon NFT SmartChef factory.')

  const pool = new Contract(address, v2PoolUserAbi, provider)
  const [
    poolFactory,
    primaryNft,
    primaryToken,
    start,
    end,
    threshold,
    capacity,
    hasLimit,
    userLimit,
    perUserLimit,
    limitBlocks,
    feeTo,
    fee,
    userInfo,
    indexedBalance,
  ] = await Promise.all([
    blockCall(pool, 'SMART_CHEF_FACTORY', [], blockNumber),
    blockCall(pool, 'stakedToken', [], blockNumber),
    blockCall(pool, 'rewardToken', [], blockNumber),
    blockCall(pool, 'startBlock', [], blockNumber),
    blockCall(pool, 'bonusEndBlock', [], blockNumber),
    blockCall(pool, 'participantThreshold', [], blockNumber),
    blockCall(pool, 'poolCapacity', [], blockNumber),
    blockCall(pool, 'hasUserLimit', [], blockNumber),
    blockCall(pool, 'userLimit', [], blockNumber),
    blockCall(pool, 'poolLimitPerUser', [], blockNumber),
    blockCall(pool, 'numberBlocksForUserLimit', [], blockNumber),
    blockCall(pool, 'feeTo', [], blockNumber),
    blockCall(pool, 'performanceFee', [], blockNumber),
    blockCall(pool, 'userInfo', [wallet], blockNumber),
    blockCall(pool, 'balanceOf', [wallet], blockNumber),
  ])
  if (!sameAddress(poolFactory, poolRecord.factoryAddress))
    throw new Error('Pool factory address does not match its verified publication record.')

  const communityCollections = await readV2IndexedArrayAtBlock(
    pool,
    'communityCollections',
    blockNumber,
    MAX_COLLECTIONS,
  )
  const collectionsAddresses = [getAddress(primaryNft), ...communityCollections]
  if (new Set(collectionsAddresses.map((item) => item.toLowerCase())).size !== collectionsAddresses.length)
    throw new Error('The pool contains a duplicate NFT collection; position reads stopped.')

  const sideRewardAddresses = await readV2IndexedArrayAtBlock(pool, 'sideRewardTokens', blockNumber, MAX_SIDE_REWARDS)
  const rewardAddresses = [getAddress(primaryToken), ...sideRewardAddresses]
  assertPublishedConfiguration(poolRecord, collectionsAddresses, rewardAddresses)

  const currentBlock = blockNumber
  const startBlock = BigNumber.from(start).toNumber()
  const endBlock = BigNumber.from(end).toNumber()
  const status = currentBlock < startBlock ? 'UPCOMING' : currentBlock < endBlock ? 'ACTIVE' : 'FINISHED'
  const tupleCount = BigNumber.from(indexedBalance).toNumber()
  const storedCount = BigNumber.from(userInfo.nftCount ?? userInfo[1])
  const storedPower = BigNumber.from(userInfo.amount ?? userInfo[0])
  const cap = options.tokenTupleCap ?? 100
  if (tupleCount > cap) throw new Error(`This wallet has more than ${cap} staked NFTs; refresh is blocked for safety.`)
  if (!storedCount.eq(tupleCount))
    throw new Error(
      `Pool position count is inconsistent (userInfo ${storedCount.toString()}, NFT index ${tupleCount}).`,
    )

  const metadataByCollection = new Map(
    poolRecord.snapshot.collections.map((item) => [item.address.toLowerCase(), item]),
  )
  const collectionWeights = await Promise.all(
    collectionsAddresses.map((collectionAddress) =>
      blockCall(pool, 'collectionWeights', [collectionAddress], blockNumber),
    ),
  )
  const collectionByAddress = new Map<string, V2UserCollection>()
  collectionsAddresses.forEach((collectionAddress, index) => {
    const metadata = metadataByCollection.get(collectionAddress.toLowerCase())!
    const weight = BigNumber.from(collectionWeights[index])
    if (weight.lte(0)) throw new Error(`NFT collection ${metadata.name} has zero on-chain staking power.`)
    collectionByAddress.set(collectionAddress.toLowerCase(), {
      address: collectionAddress,
      name: metadata.name,
      image: metadata.image,
      weight: weight.toString(),
      approved: false,
      staked: [],
    })
  })

  const tuples: V2NftTuple[] = []
  let enumeratedPower = BigNumber.from(0)
  for (let index = 0; index < tupleCount; index += 1) {
    const tuple = await blockCall(pool, 'tokenOfOwnerByIndex', [wallet, index], blockNumber)
    const collectionAddress = getAddress(tuple.collection ?? tuple[0])
    const tokenId = BigNumber.from(tuple.tokenId ?? tuple[1])
    const collection = collectionByAddress.get(collectionAddress.toLowerCase())
    if (!collection) throw new Error('Pool returned a staked NFT from a collection outside its verified list.')
    const [weight, nftOwner] = await Promise.all([
      blockCall(pool, 'tokenWeight', [collectionAddress, tokenId], blockNumber),
      blockCall(new Contract(collectionAddress, v2Erc721UserAbi, provider), 'ownerOf', [tokenId], blockNumber),
    ])
    const snapshotWeight = BigNumber.from(weight)
    if (snapshotWeight.lte(0) || !sameAddress(nftOwner, address))
      throw new Error(`Staked NFT ${tokenId.toString()} is inconsistent with pool custody/weight.`)
    enumeratedPower = enumeratedPower.add(snapshotWeight)
    tuples.push({
      collectionAddress,
      tokenId: tokenId.toString(),
      weight: snapshotWeight.toString(),
      collectionName: collection.name,
      collectionImage: collection.image,
    })
    collection.staked.push(tuples[tuples.length - 1])
  }
  if (!storedPower.eq(enumeratedPower))
    throw new Error(
      `Pool position power is inconsistent (userInfo ${storedPower.toString()}, NFT snapshot ${enumeratedPower.toString()}).`,
    )

  await Promise.all(
    [...collectionByAddress.values()].map(async (collection) => {
      collection.approved = await blockCall(
        new Contract(collection.address, v2Erc721UserAbi, provider),
        'isApprovedForAll',
        [wallet, address],
        blockNumber,
      )
    }),
  )

  const primaryRewardDecimals = Number(await blockCall(pool, 'rewardTokenDecimals', [rewardAddresses[0]], blockNumber))
  const rewardRecords: V2PendingReward[] = []
  const pendingPrimary = BigNumber.from(await blockCall(pool, 'pendingReward', [wallet], blockNumber))
  for (let index = 0; index < rewardAddresses.length; index += 1) {
    const rewardAddress = rewardAddresses[index]
    const token = new Contract(rewardAddress, v2Erc20UserAbi, provider)
    const [actualDecimalsRaw, symbolRaw, walletBalanceRaw] = await Promise.all([
      blockCall(token, 'decimals', [], blockNumber),
      blockCall(token, 'symbol', [], blockNumber),
      blockCall(token, 'balanceOf', [wallet], blockNumber),
    ])
    const decimals = Number(actualDecimalsRaw)
    const contractDecimals = Number(await blockCall(pool, 'rewardTokenDecimals', [rewardAddress], blockNumber))
    if (!Number.isInteger(decimals) || decimals < 0 || decimals >= 30 || decimals !== contractDecimals)
      throw new Error(`Reward-token decimals do not match the pool's recorded decimals for ${symbolRaw}.`)
    const percentage =
      index === 0
        ? undefined
        : BigNumber.from(await blockCall(pool, 'sideRewardPercentage', [rewardAddress], blockNumber))
    const amount =
      index === 0
        ? pendingPrimary
        : applySoliditySideReward(pendingPrimary, percentage!, primaryRewardDecimals, decimals)
    rewardRecords.push({
      address: rewardAddress,
      symbol: String(symbolRaw),
      decimals,
      amount: amount.toString(),
      walletBalance: BigNumber.from(walletBalanceRaw).toString(),
      percentage: percentage?.toString(),
      estimated: index > 0,
    })
  }
  const limitEnd = startBlock + BigNumber.from(limitBlocks).toNumber()
  const hasActiveUserLimit = Boolean(hasLimit) || Boolean(userLimit)
  const userHasStake = !storedCount.isZero()

  return {
    chainId: network.chainId,
    poolAddress: address,
    account: wallet,
    blockNumber,
    currentBlock,
    status,
    startBlock,
    endBlock,
    threshold: BigNumber.from(threshold).toString(),
    nftCount: storedCount.toString(),
    power: storedPower.toString(),
    pendingPrimary: pendingPrimary.toString(),
    rewards: rewardRecords,
    collections: [...collectionByAddress.values()],
    remainingCapacity: BigNumber.from(capacity).toString(),
    capacityAvailable: userHasStake || !BigNumber.from(capacity).isZero(),
    hasUserLimit: hasActiveUserLimit,
    userLimit: Boolean(userLimit),
    poolLimitPerUser: BigNumber.from(perUserLimit).toString(),
    userLimitEndBlock: Number.isSafeInteger(limitEnd) ? limitEnd : Number.MAX_SAFE_INTEGER,
    performanceFee: sameAddress(feeTo, ZERO_ADDRESS) ? '0' : BigNumber.from(fee).toString(),
    feeTo: getAddress(feeTo),
  }
}

export function assertV2StakeSelection(
  selection: Array<{ collectionAddress: string; tokenId: string; weight?: string }>,
  allowedCollections: V2UserCollection[],
) {
  if (!selection.length) throw new Error('Select at least one NFT to stake.')
  const allowed = new Map(allowedCollections.map((item) => [item.address.toLowerCase(), BigNumber.from(item.weight)]))
  const seen = new Set<string>()
  for (const item of selection) {
    if (!isAddress(item.collectionAddress) || !/^\d+$/.test(item.tokenId))
      throw new Error('NFT collection or token ID is invalid.')
    const id = BigNumber.from(item.tokenId)
    if (id.lt(0) || id.gt(MaxUint256)) throw new Error(`NFT token ID ${item.tokenId} is outside uint256 range.`)
    const key = `${item.collectionAddress.toLowerCase()}:${id.toString()}`
    if (seen.has(key)) throw new Error(`NFT ${item.tokenId} was selected more than once.`)
    seen.add(key)
    const configuredWeight = allowed.get(item.collectionAddress.toLowerCase())
    if (!configuredWeight || configuredWeight.lte(0))
      throw new Error('Selected NFT is not part of this pool configuration.')
  }
}

export function assertV2StakeLimits(position: V2UserPosition, selectedCount: number): void {
  if (position.status !== 'ACTIVE') throw new Error('New NFT stakes are available only while this pool is active.')
  const currentNftCount = BigNumber.from(position.nftCount)
  if (!currentNftCount.gt(0) && !position.capacityAvailable)
    throw new Error('This pool has reached its capacity for new wallets.')
  if (position.hasUserLimit && position.currentBlock < position.userLimitEndBlock) {
    const limit = BigNumber.from(position.poolLimitPerUser)
    if (limit.gt(0) && currentNftCount.add(selectedCount).gt(limit))
      throw new Error(`This pool currently allows at most ${limit.toString()} NFTs per wallet.`)
  }
}

export function calculateV2SidePending(
  primaryPending: BigNumber,
  percentage: BigNumber,
  primaryDecimals: number,
  sideDecimals: number,
): BigNumber {
  return applySoliditySideReward(primaryPending, percentage, primaryDecimals, sideDecimals)
}
