export const POLYGON_CHAIN_ID = 137
export const LOCAL_FORK_CHAIN_ID = Number(process.env.NEXT_PUBLIC_LOCAL_FORK_CHAIN_ID || 31337)
export const isLocalForkMode = process.env.NEXT_PUBLIC_LOCAL_FORK === '1'

/** Accept only a loopback HTTP endpoint. Fork-mode RPC must never target a public network. */
export function validateLocalForkRpcUrl(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Local fork RPC URL is invalid.')
  }

  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('Local fork RPC must be a loopback HTTP URL (127.0.0.1, localhost or ::1).')
  }

  return url.toString().replace(/\/$/, '')
}

export function getLocalForkRpcUrl(): string | undefined {
  if (!isLocalForkMode) return undefined
  const value = process.env.NEXT_PUBLIC_LOCAL_FORK_RPC
  if (!value) throw new Error('Local fork mode is enabled without a local RPC URL.')
  return validateLocalForkRpcUrl(value)
}

export function getPolygonRuntimeChainId(): number {
  return isLocalForkMode ? LOCAL_FORK_CHAIN_ID : POLYGON_CHAIN_ID
}

export function getLocalForkBaseBlock(): number | undefined {
  if (!isLocalForkMode) return undefined
  const block = Number(process.env.NEXT_PUBLIC_FORK_BLOCK)
  return Number.isSafeInteger(block) && block >= 0 ? block : undefined
}

export function getLocalForkStorageKey(key: string): string {
  if (!isLocalForkMode) return key
  const session = process.env.NEXT_PUBLIC_FORK_SESSION_ID || 'unscoped'
  return `${key}.local-fork.${session}`
}
