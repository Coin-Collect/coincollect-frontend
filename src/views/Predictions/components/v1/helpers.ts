import request, { gql } from 'graphql-request'
import { GRAPH_API_PREDICTION_V1 } from 'config/constants/endpoints'

export interface V1Bet {
  hash: string
  amount: string
  position: string
  claimed: boolean
  claimedAmount: string | null
  claimedHash: string | null
  round: {
    epoch: string
    position: string | null
    failed: boolean
    totalAmount: string
    lockPrice: string | null
    closePrice: string | null
    totalBets: string
  }
}

type V1BetFilter = { user?: string; claimed?: boolean }

export const getV1History = async (skip = 0, where: V1BetFilter = {}): Promise<V1Bet[]> => {
  if (!GRAPH_API_PREDICTION_V1) return []
  const response = await request<{ bets: V1Bet[] }>(
    GRAPH_API_PREDICTION_V1,
    gql`
      query getV1BetHistory($skip: Int!, $where: Bet_filter) {
        bets(first: 1000, skip: $skip, where: $where, orderBy: createdAt, orderDirection: desc) {
          hash
          amount
          position
          claimed
          claimedAmount
          claimedHash
          round {
            epoch
            position
            failed
            totalAmount
            lockPrice
            closePrice
            totalBets
          }
        }
      }
    `,
    { skip, where },
  )
  return response.bets
}

export const getAllV1History = async (where: V1BetFilter = {}): Promise<V1Bet[]> => {
  const bets: V1Bet[] = []
  for (let skip = 0; ; skip += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const page = await getV1History(skip, where)
    bets.push(...page)
    if (page.length < 1000) return bets
  }
}
