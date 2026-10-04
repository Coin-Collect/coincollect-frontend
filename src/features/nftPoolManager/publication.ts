import { getAddress, isAddress } from '@ethersproject/address'
import type { Provider } from '@ethersproject/providers'
import type { NftCollection, NftPool, NftPoolDraft, NftPoolFrontendMetadata, NftPoolStatus } from './types'
import type { NftPoolLaunchSession } from './launch/types'
import { validateLaunchSessionInvariant } from './launch/orchestrator'
import { parseNftPoolAddress } from './launch/transactions'
import { loadNftPoolDraft } from './storage'
import { loadNftPoolLaunchSession } from './launch/storage'
import { readNftPoolByAddress } from './discovery'
import { normalizeWrappedReward } from './rewardTokens'
import { resolveNftAssetUrl } from './assets'
import { getLocalForkStorageKey, getPolygonRuntimeChainId } from 'config/localFork'

export const PUBLICATION_STORAGE_KEY = getLocalForkStorageKey('coincollect.nft-pool-publications.v1')
export const PUBLICATION_EVENT = 'coincollect:nft-pool-publication'

export interface PublicationMetadata extends NftPoolFrontendMetadata {
  collections: Array<{ address: string; name: string; image?: string }>
}

/** A serializable, address-native read model. It never enters the legacy pid store. */
export interface PublicV2Pool {
  id: string
  chainId: number
  address: string
  factoryAddress: string
  deploymentHash: string
  deploymentBlock: number
  sessionId: string
  planHash: string
  publishedAt: number
  verifiedAt: number
  verifiedAtBlock?: number
  metadata: PublicationMetadata
  snapshot: {
    checkedAt: number
    currentBlock: number
    status: NftPoolStatus
    startBlock: number
    endBlock: number
    threshold: string
    rewardPerBlock: string
    capacity?: string
    totalShares?: string
    stakedBalance?: string
    secondsPerBlock?: number
    collections: Array<{ address: string; name: string; image?: string; weight: string }>
    rewards: Array<{
      address: string
      symbol: string
      name: string
      decimals?: number
      balance?: string
      percentage?: string
    }>
  }
}

function safeUrl(value?: string): string | undefined {
  if (!value) return undefined
  return /^(\/[^/]|https?:\/\/)/i.test(value) ? resolveNftAssetUrl(value) : undefined
}

function cleanMetadata(metadata: PublicationMetadata): PublicationMetadata {
  return {
    name: typeof metadata?.name === 'string' ? metadata.name.slice(0, 200) : 'NFT pool',
    banner: safeUrl(metadata?.banner),
    avatar: safeUrl(metadata?.avatar),
    projectUrl: safeUrl(metadata?.projectUrl),
    getNftUrl: safeUrl(metadata?.getNftUrl),
    isCommunity: metadata?.isCommunity === true,
    collections: Array.isArray(metadata?.collections)
      ? metadata.collections
          .filter((item) => isAddress(item?.address))
          .map((item) => ({
            address: getAddress(item.address),
            name: typeof item.name === 'string' ? item.name.slice(0, 200) : 'NFT collection',
            image: safeUrl(item.image),
          }))
      : [],
  }
}

export function capturePublicationMetadata(
  draft: NftPoolDraft,
  collections: NftCollection[] = [],
  source?: NftPool,
): PublicationMetadata {
  return cleanMetadata({
    name: draft.name || 'NFT pool',
    banner: draft.banner,
    avatar: draft.avatar,
    projectUrl: draft.projectUrl,
    getNftUrl: draft.getNftUrl,
    isCommunity: source?.metadata.isCommunity,
    collections: draft.collections.map((item) => ({
      address: item.address,
      name: item.name,
      image: collections.find((collection) => collection.address.toLowerCase() === item.address.toLowerCase())?.image,
    })),
  })
}

export function projectPublicPool(pool: NftPool, metadata: PublicationMetadata): PublicV2Pool['snapshot'] {
  if (
    !pool.onChain.codeFound ||
    !pool.onChain.abiCompatible ||
    pool.onChain.startBlock === undefined ||
    pool.onChain.endBlock === undefined ||
    pool.onChain.participantThreshold === undefined ||
    !pool.onChain.rewardPerBlock
  )
    throw new Error('Pool configuration could not be read completely.')
  const rewards = [pool.rewards.primary, ...pool.rewards.side].filter(Boolean)
  return {
    checkedAt: Date.now(),
    currentBlock: pool.onChain.currentBlock || 0,
    status: pool.status,
    startBlock: pool.onChain.startBlock,
    endBlock: pool.onChain.endBlock,
    threshold: pool.onChain.participantThreshold.toString(),
    rewardPerBlock: pool.onChain.rewardPerBlock.toString(),
    capacity: pool.onChain.currentRemainingPoolCapacity?.toString(),
    totalShares: pool.onChain.totalShares?.toString(),
    stakedBalance: pool.onChain.stakedBalance?.toString(),
    collections: pool.collections.map(({ collection, weight }) => {
      const display = metadata.collections.find(
        (item) => item.address.toLowerCase() === collection.address.toLowerCase(),
      )
      return {
        address: collection.address,
        name: display?.name || collection.displayName,
        image: display?.image || safeUrl(collection.image),
        weight: weight.toString(),
      }
    }),
    rewards: rewards.map((reward, index) => {
      const token = normalizeWrappedReward(reward!.token)
      return {
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        balance: (index === 0 ? pool.onChain.rewardBalance : reward!.poolBalance)?.toString(),
        percentage: index === 0 ? undefined : reward!.onChainPercentage?.toString(),
      }
    }),
  }
}

function validRecord(record: PublicV2Pool): boolean {
  try {
    const snapshot = record.snapshot
    return (
      record.chainId === 137 &&
      isAddress(record.address) &&
      isAddress(record.factoryAddress) &&
      record.id === `137:${record.address.toLowerCase()}` &&
      /^0x[\da-f]{64}$/i.test(record.deploymentHash) &&
      /^0x[\da-f]{64}$/i.test(record.planHash) &&
      Number.isInteger(record.deploymentBlock) &&
      record.deploymentBlock > 0 &&
      Number.isFinite(record.verifiedAt) &&
      Number.isInteger(snapshot.currentBlock) &&
      snapshot.currentBlock > 0 &&
      Number.isInteger(snapshot.startBlock) &&
      Number.isInteger(snapshot.endBlock) &&
      snapshot.endBlock > snapshot.startBlock &&
      Number.isFinite(snapshot.checkedAt) &&
      ['UPCOMING', 'ACTIVE', 'FINISHED', 'UNKNOWN'].includes(snapshot.status) &&
      /^\d+$/.test(snapshot.threshold) &&
      /^\d+$/.test(snapshot.rewardPerBlock) &&
      snapshot.collections.length > 0 &&
      snapshot.collections.every(
        (item) =>
          isAddress(item.address) && typeof item.name === 'string' && /^\d+$/.test(item.weight) && item.weight !== '0',
      ) &&
      snapshot.rewards.length > 0 &&
      snapshot.rewards.every(
        (item) =>
          isAddress(item.address) &&
          typeof item.symbol === 'string' &&
          Number.isInteger(item.decimals) &&
          item.decimals! >= 0 &&
          item.decimals! < 30 &&
          (item.balance === undefined || /^\d+$/.test(item.balance)) &&
          (item.percentage === undefined || /^\d+$/.test(item.percentage)),
      )
    )
  } catch {
    return false
  }
}

export interface PublicationStore {
  read(): PublicV2Pool[]
  upsert(record: PublicV2Pool): void
}

export function selectPublishedNftPools(
  pools: PublicV2Pool[],
  options: {
    history: boolean
    archived: boolean
    stakedOnly: boolean
    stakedPoolAddresses?: string[]
    query: string
    community?: boolean
    configuredAddresses: string[]
  },
): PublicV2Pool[] {
  if (options.archived) return []
  const configured = new Set(options.configuredAddresses.map((address) => address.toLowerCase()))
  const staked = new Set((options.stakedPoolAddresses || []).map((address) => address.toLowerCase()))
  const query = options.query.trim().toLocaleLowerCase()
  return pools
    .filter(
      (pool) =>
        !configured.has(pool.address.toLowerCase()) &&
        (options.stakedOnly
          ? staked.has(pool.address.toLowerCase()) &&
            (options.history
              ? pool.snapshot.status === 'FINISHED'
              : ['UPCOMING', 'ACTIVE', 'FINISHED'].includes(pool.snapshot.status))
          : options.history
          ? pool.snapshot.status === 'FINISHED'
          : ['UPCOMING', 'ACTIVE'].includes(pool.snapshot.status)) &&
        (options.community === undefined || Boolean(pool.metadata.isCommunity) === options.community) &&
        (!query ||
          [
            pool.metadata.name,
            pool.address,
            ...pool.snapshot.collections.map((item) => item.name),
            ...pool.snapshot.rewards.map((item) => item.symbol),
          ].some((value) => value.toLocaleLowerCase().includes(query))),
    )
    .sort((left, right) => right.deploymentBlock - left.deploymentBlock)
}

export const localPublicationStore: PublicationStore = {
  read() {
    if (typeof window === 'undefined') return []
    try {
      const records = JSON.parse(window.localStorage.getItem(PUBLICATION_STORAGE_KEY) || '[]')
      return Array.isArray(records)
        ? records.filter(validRecord).map((record) => ({ ...record, metadata: cleanMetadata(record.metadata) }))
        : []
    } catch {
      return []
    }
  },
  upsert(record) {
    if (typeof window === 'undefined') throw new Error('Local publication requires a browser.')
    if (!validRecord(record)) throw new Error('Invalid local publication record.')
    window.localStorage.setItem(
      PUBLICATION_STORAGE_KEY,
      JSON.stringify([record, ...this.read().filter((item) => item.id !== record.id)]),
    )
    window.dispatchEvent(new Event(PUBLICATION_EVENT))
  },
}

export async function hydratePublishedPool(record: PublicV2Pool, provider: Provider): Promise<PublicV2Pool> {
  const pool = await readNftPoolByAddress(provider, record.address)
  if (pool.onChain.factoryAddress?.toLowerCase() !== record.factoryAddress.toLowerCase())
    throw new Error('Pool factory does not match publication.')
  const secondsPerBlock =
    record.snapshot.secondsPerBlock || loadNftPoolLaunchSession(record.sessionId)?.schedule?.measuredSecondsPerBlock
  return { ...record, snapshot: { ...projectPublicPool(pool, record.metadata), secondsPerBlock } }
}

export async function publishCompletedNftPool(
  session: NftPoolLaunchSession,
  provider: Provider,
  store: PublicationStore = localPublicationStore,
): Promise<PublicV2Pool> {
  const errors = validateLaunchSessionInvariant(session)
  if (
    session.currentStage !== 'COMPLETE' ||
    errors.length ||
    !session.poolAddress ||
    !session.transactionHashes.deploy ||
    !session.schedule
  )
    throw new Error(errors[0] || 'Only a verified complete launch can be published.')
  if ((await provider.getNetwork()).chainId !== getPolygonRuntimeChainId())
    throw new Error('Expected Polygon network or its isolated local fork.')
  const receipt = await provider.getTransactionReceipt(session.transactionHashes.deploy)
  if (
    !receipt ||
    receipt.status !== 1 ||
    parseNftPoolAddress(receipt, session.factoryAddress).toLowerCase() !== session.poolAddress.toLowerCase()
  )
    throw new Error('Confirmed factory deployment does not match the pool.')
  const pool = await readNftPoolByAddress(provider, session.poolAddress)
  if (pool.onChain.factoryAddress?.toLowerCase() !== session.factoryAddress.toLowerCase())
    throw new Error('Unexpected pool factory.')
  const savedDraft = loadNftPoolDraft(session.draftId)
  const metadata = cleanMetadata(
    session.publicationMetadata ||
      (savedDraft ? capturePublicationMetadata(savedDraft) : { ...pool.metadata, collections: [] }),
  )
  const id = `137:${session.poolAddress.toLowerCase()}`
  const previous = store.read().find((item) => item.id === id)
  const record: PublicV2Pool = {
    id,
    chainId: 137,
    address: getAddress(session.poolAddress),
    factoryAddress: getAddress(session.factoryAddress),
    deploymentHash: receipt.transactionHash,
    deploymentBlock: receipt.blockNumber,
    sessionId: session.sessionId,
    planHash: session.planHash,
    publishedAt: previous?.publishedAt || Date.now(),
    verifiedAt: session.verification.final!.checkedAt,
    verifiedAtBlock: session.verification.final!.checkedAtBlock,
    metadata,
    snapshot: { ...projectPublicPool(pool, metadata), secondsPerBlock: session.schedule?.measuredSecondsPerBlock },
  }
  store.upsert(record)
  return record
}
