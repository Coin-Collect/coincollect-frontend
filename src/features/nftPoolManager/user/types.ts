import type { NftPoolStatus } from '../types'

export interface V2NftTuple {
  collectionAddress: string
  tokenId: string
  weight: string
  collectionName: string
  collectionImage?: string
}

export interface V2UserCollection {
  address: string
  name: string
  image?: string
  weight: string
  approved: boolean
  staked: V2NftTuple[]
}

export interface V2PendingReward {
  address: string
  symbol: string
  decimals: number
  amount: string
  walletBalance: string
  percentage?: string
  estimated: boolean
}

export interface V2UserPosition {
  chainId: number
  poolAddress: string
  account: string
  blockNumber: number
  currentBlock: number
  status: NftPoolStatus
  startBlock: number
  endBlock: number
  threshold: string
  nftCount: string
  power: string
  pendingPrimary: string
  rewards: V2PendingReward[]
  collections: V2UserCollection[]
  remainingCapacity: string
  capacityAvailable: boolean
  hasUserLimit: boolean
  userLimit: boolean
  poolLimitPerUser: string
  userLimitEndBlock: number
  performanceFee: string
  feeTo: string
}

export type V2NftDiscoveryMethod = 'walletOfOwner' | 'tokensOfOwnerBySize' | 'enumerable' | 'manual'

export interface V2OwnedNfts {
  collectionAddress: string
  tokenIds: string[]
  complete: boolean
  method: V2NftDiscoveryMethod
  message?: string
}

export interface V2UserPositionResult {
  position?: V2UserPosition
  loading: boolean
  error?: string
  refresh: () => Promise<V2UserPosition | undefined>
}

export type V2PositionSummaryState = 'positive' | 'zero' | 'unknown'

export interface V2UserPositionSummary {
  state: V2PositionSummaryState
  poolAddress: string
  account: string
  count?: string
  power?: string
  blockNumber?: number
  stale?: boolean
  error?: string
}

export interface V2RecoveryCollection {
  address: string
  name: string
  image?: string
  /** Present only when a current public config view is also available. */
  weight?: string
  approved?: boolean
  staked: V2NftTuple[]
}

/** Minimum chain-derived data needed to recover an existing position. */
export interface V2RecoveryPosition {
  chainId: number
  poolAddress: string
  account: string
  blockNumber: number
  nftCount: string
  power: string
  collections: V2RecoveryCollection[]
  complete: true
  stale?: boolean
}
