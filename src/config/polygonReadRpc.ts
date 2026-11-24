import { getLocalForkRpcUrl, isLocalForkMode } from './localFork'

export function polygonReadRpcUrls(): string[] {
  return isLocalForkMode
    ? [getLocalForkRpcUrl()!]
    : [
        process.env.NEXT_PUBLIC_MATIC_NODE_1,
        'https://polygon-bor-rpc.publicnode.com',
        'https://polygon.gateway.tenderly.co',
      ].filter((url): url is string => Boolean(url))
}
