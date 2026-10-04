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
