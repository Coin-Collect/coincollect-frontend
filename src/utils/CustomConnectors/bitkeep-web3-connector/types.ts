export interface BitKeepProvider {
  request?: (request: { method: string; params?: readonly unknown[] }) => Promise<unknown>
  send: (method: string | { method: string }) => unknown
  enable: () => Promise<unknown>
  on?: {
    (event: 'chainChanged' | 'networkChanged', listener: (value: string | number) => void): void
    (event: 'accountsChanged', listener: (accounts: string[]) => void): void
    (event: 'close', listener: (code: number, reason: string) => void): void
  }
  removeListener?: BitKeepProvider['on']
  isMetaMask?: boolean
  autoRefreshOnNetworkChange?: boolean
  isDapper?: boolean
  cachedResults?: { net_version?: unknown }
  chainId?: string | number
  netVersion?: string | number
  networkVersion?: string | number
  _chainId?: string | number
}
