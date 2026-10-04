import type { NftPoolDraftReward } from './types'

export const WPOL_ADDRESS = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270'

/** Reward assets are ERC-20s, not the native gas currency. */
export function normalizeWrappedReward<T extends NftPoolDraftReward>(token: T): T {
  return typeof token?.address === 'string' && token.address.toLowerCase() === WPOL_ADDRESS
    ? { ...token, symbol: 'WPOL', name: 'Wrapped POL' }
    : token
}
