import { ChainId } from '@coincollect/sdk'
import first from 'lodash/first'
import { PublicClient, createPublicClient, fallback, http } from 'viem'
import { polygon } from 'viem/chains'

import { CHAINS } from 'config/chains'
import { PUBLIC_NODES } from 'config/nodes'
import { getLocalForkRpcUrl, isLocalForkMode, LOCAL_FORK_CHAIN_ID } from 'config/localFork'

export type CreatePublicClientParams = {
  transportSignal?: AbortSignal
}

export function createViemPublicClients({ transportSignal }: CreatePublicClientParams = {}) {
  return CHAINS.reduce((prev, cur) => {
    return {
      ...prev,
      [cur.id]: createPublicClient({
        chain: cur,
        transport: fallback(
          (isLocalForkMode ? [getLocalForkRpcUrl()!] : (PUBLIC_NODES[cur.id] as string[])).map((url) =>
            http(url, {
              timeout: 10_000,
              fetchOptions: {
                signal: transportSignal,
              },
            }),
          ),
          {
            rank: false,
          },
        ),
        batch: {
          multicall: {
            batchSize: 1024 * 200, /* cur.id === ChainId.POLYGON_ZKEVM ? 128 : 1024 * 200, */
            wait: 16,
          },
        },
        pollingInterval: 6_000,
      }),
    }
  }, {} as Record<ChainId, PublicClient>)
}

export const viemClients = createViemPublicClients()

export const getViemClients = createViemPublicClientGetter({ viemClients })

type CreateViemPublicClientGetterParams = {
  viemClients?: Record<ChainId, PublicClient>
} & CreatePublicClientParams

export function createViemPublicClientGetter({
  viemClients: viemClientsOverride,
  ...restParams
}: CreateViemPublicClientGetterParams = {}) {
  const clients = viemClientsOverride || createViemPublicClients(restParams)

  return function getClients({ chainId }: { chainId?: ChainId }): PublicClient {
    const configuredChain = isLocalForkMode && chainId === LOCAL_FORK_CHAIN_ID ? ChainId.POLYGON : chainId
    return clients[configuredChain as ChainId]
  }
}

const PUBLIC_MAINNET = 'https://polygon.drpc.org'

export const CLIENT_CONFIG = {
  batch: {
    multicall: {
      batchSize: 1024 * 200,
      wait: 16,
    },
  },
  pollingInterval: 6_000,
}

export const publicClient = ({ chainId }: { chainId?: ChainId }) => {
  if (isLocalForkMode) {
    return createPublicClient({
      chain: polygon,
      transport: http(getLocalForkRpcUrl()!),
      ...CLIENT_CONFIG,
    })
  }
  if (chainId && viemClients[chainId]) {
    return viemClients[chainId]
  }
  let httpString: string | undefined

  if (process.env.NODE_ENV === 'test' && chainId === polygon.id) {
    httpString = PUBLIC_MAINNET
  } else {
    httpString = chainId && first(PUBLIC_NODES[chainId]) ? first(PUBLIC_NODES[chainId]) : undefined
  }

  const chain = CHAINS.find((c) => c.id === chainId)
  return createPublicClient({ chain, transport: http(httpString), ...CLIENT_CONFIG })
}
