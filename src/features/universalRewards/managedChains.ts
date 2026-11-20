import { defineChain } from 'viem'
import { isLocalForkMode } from 'config/localFork'

function isolated(chainId: number, name: string, rpc?: string) {
  if (!isLocalForkMode || !rpc) return undefined
  try {
    const endpoint = new URL(rpc)
    if (endpoint.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(endpoint.hostname)) return undefined
    return defineChain({
      id: chainId,
      name,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [endpoint.toString()] } },
    })
  } catch {
    return undefined
  }
}

export const managedSourceChains = [
  isolated(8453, 'CoinCollect Base (LOCAL)', process.env.NEXT_PUBLIC_V33_BASE_RPC),
  isolated(42161, 'CoinCollect Arbitrum (LOCAL)', process.env.NEXT_PUBLIC_V33_ARBITRUM_RPC),
].filter((chain): chain is NonNullable<typeof chain> => Boolean(chain))
