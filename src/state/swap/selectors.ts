import { AppState } from 'state'
import { PairDataTimeWindowEnum } from './types'

type pairByDataIdSelectorParams = {
  pairId: string | null
  timeWindow: PairDataTimeWindowEnum
}

export const pairByDataIdSelector =
  ({ pairId, timeWindow }: pairByDataIdSelectorParams) =>
  (state: AppState) =>
    pairId ? state.swap.pairDataById[pairId]?.[timeWindow] : undefined

export const derivedPairByDataIdSelector =
  ({ pairId, timeWindow }: pairByDataIdSelectorParams) =>
  (state: AppState) =>
    pairId ? state.swap.derivedPairDataById[pairId]?.[timeWindow] : undefined
