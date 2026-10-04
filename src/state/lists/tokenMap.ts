import type { Token } from '@coincollect/sdk'
import type { TokenAddressMap } from './hooks'

/** Return the token entries for a chain, or an empty map if it has no list. */
export function getTokensForChain(tokenMap: TokenAddressMap, chainId: number): { [address: string]: Token } {
  const entriesByChain = tokenMap as unknown as Record<number, Record<string, { token: Token } | undefined> | undefined>
  const chainTokens = entriesByChain[chainId] ?? {}

  return Object.keys(chainTokens).reduce<{ [address: string]: Token }>((tokens, address) => {
    const entry = chainTokens[address]
    if (entry) tokens[address] = entry.token
    return tokens
  }, {})
}
