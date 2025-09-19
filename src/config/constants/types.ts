import BigNumber from 'bignumber.js'
import { Token } from '@coincollect/sdk'

export type TranslatableText =
  | string
  | {
      key: string
      data?: {
        [key: string]: string | number
      }
    }
export interface Address {
  97?: string
  56?: string
  137?: string
  80001?: string
}

export interface ProjectLink {
  mainLink?: string
  getNftLink?: string
}

export interface SerializedToken {
  chainId: number
  address: string
  decimals: number
  symbol?: string
  name?: string
  projectLink?: string
}

export enum PoolIds {
  poolBasic = 'poolBasic',
  poolUnlimited = 'poolUnlimited',
}

export type IfoStatus = 'idle' | 'coming_soon' | 'live' | 'finished'

interface IfoPoolInfo {
  saleAmount: string
  raiseAmount: string
  cakeToBurn: string
  distributionRatio: number // Range [0-1]
}

export interface Ifo {
  id: string
  isActive: boolean
  address: string
  name: string
  currency: Token
  token: Token
  releaseBlockNumber: number
  articleUrl: string
  campaignId: string
  tokenOfferingPrice: number
  description?: string
  twitterUrl?: string
  telegramUrl?: string
  version: number
  [PoolIds.poolBasic]?: IfoPoolInfo
  [PoolIds.poolUnlimited]: IfoPoolInfo
}

//CC
export type MintingStatus = 'idle' | 'coming_soon' | 'live' | 'finished' | 'paused'

//CC
interface MintingPoolInfo {
  saleAmount: string
  distributionRatio: number // Range [0-1]
}

//CC
export interface Minting {
  id: string
  stake_pid?: number
  name: string
  isActive: boolean
  status: string
  address: string
  symbol: string
  chainId?: number
  totalSupply: number
  avatar: string
  banner: {large: string, small: string}
  sampleNftImage?: {tokenId: number, image: string, link: string}
  showCase?: any[]
  faq?: {title: string, description: string[]}[]
  currency: Token
  token: Token
  releaseBlockNumber: number
  lastPrice?: number
  description?: string
  articleUrl?: string
  twitterUrl?: string
  telegramUrl?: string
  openSeaUrl?: string
  cmcUrl?: string
  discordUrl?: string
  version: number
  [PoolIds.poolBasic]?: MintingPoolInfo
  [PoolIds.poolUnlimited]: MintingPoolInfo
}

export enum PoolCategory {
  'COMMUNITY' = 'Community',
  'CORE' = 'Core',
  'BINANCE' = 'Binance', // Pools using native BNB behave differently than pools using a token
  'AUTO' = 'Auto',
}

interface FarmConfigBaseProps {
  pid: number
  lpSymbol: string
  lpAddresses: Address
  multiplier?: string
  isCommunity?: boolean
  dual?: {
    rewardPerBlock: number
    earnLabel: string
    endBlock: number
  }
}

export interface SerializedFarmConfig extends FarmConfigBaseProps {
  token: SerializedToken
  quoteToken: SerializedToken
}

export interface DeserializedFarmConfig extends FarmConfigBaseProps {
  token: Token
  quoteToken: Token
}

// New type for NFT Stake config
interface NftFarmConfigBaseProps {
  pid: number
  lpSymbol: string
  nftAddresses: Address
  contractAddresses?: Address
  multiplier?: string
  isCommunity?: boolean
  tokenPerBlock?: string
  participantThreshold?: number
  isFinished?: boolean
  performanceFee?: string
  supportedCollectionPids?:number[]
  collectionPowers?:number[]
  dual?: {
    rewardPerBlock: number
    earnLabel: string
    endBlock: number
  }
}

// New type for NFT Stake config
export interface SerializedNftFarmConfig extends NftFarmConfigBaseProps {
  earningToken?: SerializedToken
  projectLink?: ProjectLink
}

// New type for NFT Stake config
export interface DeserializedNftFarmConfig extends NftFarmConfigBaseProps {
  earningToken: Token
}

export interface PoolDeployedBlockNumber {
  [key: string]: number
}

interface PoolConfigBaseProps {
  sousId: number
  contractAddress: Address
  poolCategory: PoolCategory
  tokenPerBlock: string
  sortOrder?: number
  harvest?: boolean
  isFinished?: boolean
  enableEmergencyWithdraw?: boolean
  deployedBlockNumber?: number
  participantThreshold?: number
  version?: number
}

export interface SerializedPoolConfig extends PoolConfigBaseProps {
  earningToken: SerializedToken
  stakingToken: SerializedToken
}

export interface DeserializedPoolConfig extends PoolConfigBaseProps {
  earningToken: Token
  stakingToken: Token
}

export type Images = {
  lg: string
  md: string
  sm: string
  ipfs?: string
}

export type TeamImages = {
  alt: string
} & Images

export type Team = {
  id: number
  name: string
  description: string
  isJoinable?: boolean
  users: number
  points: number
  images: TeamImages
  background: string
  textColor: string
}

export type CampaignType = 'ifo' | 'teambattle' | 'participation'

export type Campaign = {
  id: string
  type: CampaignType
  title?: TranslatableText
  description?: TranslatableText
  badge?: string
}

export type PageMeta = {
  title: string
  description?: string
  image?: string
}

export enum LotteryStatus {
  PENDING = 'pending',
  OPEN = 'open',
  CLOSE = 'close',
  CLAIMABLE = 'claimable',
}

export interface LotteryTicket {
  id: string
  number: string
  status: boolean
  rewardBracket?: number
  roundId?: string
  cakeReward?: string
}

export interface LotteryTicketClaimData {
  ticketsWithUnclaimedRewards: LotteryTicket[]
  allWinningTickets: LotteryTicket[]
  cakeTotal: BigNumber
  roundId: string
}

// Farm Auction
export interface FarmAuctionBidderConfig {
  account: string
  farmName: string
  tokenAddress: string
  quoteToken: Token
  tokenName: string
  projectSite?: string
  lpAddress?: string
}

// Note: this status is slightly different compared to 'status' comfing
// from Farm Auction smart contract
export enum AuctionStatus {
  ToBeAnnounced, // No specific dates/blocks to display
  Pending, // Auction is scheduled but not live yet (i.e. waiting for startBlock)
  Open, // Auction is open for bids
  Finished, // Auction end block is reached, bidding is not possible
  Closed, // Auction was closed in smart contract
}

export interface Auction {
  id: number
  status: AuctionStatus
  startBlock: number
  startDate: Date
  endBlock: number
  endDate: Date
  auctionDuration: number
  initialBidAmount: number
  topLeaderboard: number
  leaderboardThreshold: BigNumber
}

export interface BidderAuction {
  id: number
  amount: BigNumber
  claimed: boolean
}

export interface Bidder extends FarmAuctionBidderConfig {
  position?: number
  isTopPosition: boolean
  samePositionAsAbove: boolean
  amount: BigNumber
}

export interface ConnectedBidder {
  account: string
  isWhitelisted: boolean
  bidderData?: Bidder
}

export enum FetchStatus {
  Idle = 'IDLE',
  Fetching = 'FETCHING',
  Fetched = 'FETCHED',
  Failed = 'FAILED',
}
