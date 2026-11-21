export interface UserResponse {
  id: string
  createdAt: string
  updatedAt: string
  block: string
  totalBets: string
  totalBetsBull: string
  totalBetsBear: string
  totalBNB: string
  totalBNBBull: string
  totalBNBBear: string
  totalBetsClaimed: string
  totalBNBClaimed: string
  winRate: string
  averageBNB: string
  netBNB: string
  bets?: BetResponse[]
}

export interface BetResponse {
  id: string
  hash: string
  amount: string
  position: string
  claimed: boolean
  claimedAt: string | null
  claimedBlock: string | null
  claimedHash: string | null
  claimedBNB: string | null
  claimedNetBNB: string | null
  createdAt: string
  updatedAt: string
  block?: string
  user?: UserResponse
  round?: RoundResponse | null
}

export interface HistoricalBetResponse {
  id: string
  hash: string
  amount: string
  position: string
  claimed: boolean
  user?: UserResponse
  round: {
    id: string
    epoch: string
  }
}

export interface RoundResponse {
  id: string
  epoch: string
  position: string | null
  failed: boolean | null
  startAt: string | null
  startBlock: string | null
  startHash: string | null
  lockAt: string | null
  lockBlock: string | null
  lockHash: string | null
  lockPrice: string | null
  lockRoundId: string | null
  closeAt: string | null
  closeBlock: string | null
  closeHash: string | null
  closePrice: string | null
  closeRoundId: string | null
  totalBets: string
  totalAmount: string
  bullBets: string
  bullAmount: string
  bearBets: string
  bearAmount: string
  bets?: BetResponse[]
}

export interface TotalWonMarketResponse {
  totalBNB: string
  totalBNBTreasury: string
}

/**
 * Base fields are the all the top-level fields available in the api. Used in multiple queries
 */
export const getRoundBaseFields = () => `
  id
  epoch
  position
  failed
  startAt
  startBlock
  startHash
  lockAt
  lockBlock
  lockHash
  lockPrice
  lockRoundId
  closeAt
  closeBlock
  closeHash
  closePrice
  closeRoundId
  totalBets
  totalAmount
  bullBets
  bullAmount
  bearBets
  bearAmount
`

export const getBetBaseFields = () => `
 id
 hash  
 amount
 position
 claimed
 claimedAt
 claimedHash
 claimedBlock
 claimedBNB
 claimedNetBNB
 createdAt
 updatedAt
`

export const getUserBaseFields = () => `
  id
  createdAt
  updatedAt
  block
  totalBets
  totalBetsBull
  totalBetsBear
  totalBNB
  totalBNBBull
  totalBNBBear
  totalBetsClaimed
  totalBNBClaimed
  winRate
  averageBNB
  netBNB
`
