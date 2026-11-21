import { ConnectorUpdate } from '@web3-react/types'
import { AbstractConnector } from '@web3-react/abstract-connector'
import warning from 'tiny-warning'
import type { BitKeepProvider } from './types'

function unwrapResponse(response: unknown): unknown {
  return response && typeof response === 'object' && 'result' in response ? response.result : response
}

function firstAccount(response: unknown): string | null {
  const accounts = unwrapResponse(response)
  return Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : null
}

function chainIdFromResponse(response: unknown): string | number | undefined {
  const chainId = unwrapResponse(response)
  return typeof chainId === 'string' || typeof chainId === 'number' ? chainId : undefined
}

function injectedProvider() {
  return typeof window === 'undefined' ? undefined : window.bitkeep?.ethereum
}

export class NoBitKeepProviderError extends Error {
  constructor() {
    super('To use BitKeep properly, please make sure it is installed.')
    this.name = 'NoBitKeepProviderError'
  }
}

export class UserRejectedRequestError extends Error {
  constructor() {
    super('The user rejected the request.')
    this.name = 'UserRejectedRequestError'
  }
}

export class BitKeepConnector extends AbstractConnector {
  private activeProvider?: BitKeepProvider

  private handleChainChanged = (chainId: string | number) => {
    if (this.activeProvider) this.emitUpdate({ chainId, provider: this.activeProvider })
  }

  private handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      this.emitDeactivate()
    } else {
      this.emitUpdate({ account: accounts[0] })
    }
  }

  private handleClose = () => {
    this.emitDeactivate()
  }

  public async activate(): Promise<ConnectorUpdate> {
    const provider = injectedProvider()
    if (!provider) throw new NoBitKeepProviderError()
    let account: string | null = null

    if (provider.isMetaMask) provider.autoRefreshOnNetworkChange = false
    try {
      account = firstAccount(await provider.send('eth_requestAccounts'))
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 4001) {
        throw new UserRejectedRequestError()
      }
      warning(false, 'eth_requestAccounts was unsuccessful, falling back to enable')
    }

    if (!account) account = firstAccount(await provider.enable())

    if (this.activeProvider !== provider) {
      this.deactivate()
      this.activeProvider = provider
      provider.on?.('chainChanged', this.handleChainChanged)
      provider.on?.('accountsChanged', this.handleAccountsChanged)
      provider.on?.('close', this.handleClose)
      provider.on?.('networkChanged', this.handleChainChanged)
    }
    return { provider, ...(account ? { account } : {}) }
  }

  public async getProvider(): Promise<BitKeepProvider> {
    const provider = this.activeProvider ?? injectedProvider()
    if (!provider) throw new NoBitKeepProviderError()
    return provider
  }

  public async getChainId(): Promise<number | string> {
    const provider = await this.getProvider()
    const methods = ['eth_chainId', 'net_version', { method: 'net_version' }]
    for (const method of methods) {
      try {
        const chainId = chainIdFromResponse(await provider.send(method))
        if (chainId) return chainId
      } catch {
        warning(false, 'BitKeep chain ID request failed')
      }
    }

    const chainId = provider.isDapper
      ? chainIdFromResponse(provider.cachedResults?.net_version)
      : provider.chainId || provider.netVersion || provider.networkVersion || provider._chainId
    if (chainId === undefined) throw new Error('BitKeep did not return a chain ID.')
    return chainId
  }

  public async getAccount(): Promise<string | null> {
    const provider = await this.getProvider()

    try {
      const account = firstAccount(await provider.send('eth_accounts'))
      if (account) return account
    } catch {
      warning(false, 'eth_accounts was unsuccessful, falling back to enable')
    }

    try {
      const account = firstAccount(await provider.enable())
      if (account) return account
    } catch {
      warning(false, 'enable was unsuccessful, falling back to eth_accounts v2')
    }

    return firstAccount(await provider.send({ method: 'eth_accounts' }))
  }

  public deactivate() {
    const provider = this.activeProvider
    this.activeProvider = undefined
    provider?.removeListener?.('chainChanged', this.handleChainChanged)
    provider?.removeListener?.('accountsChanged', this.handleAccountsChanged)
    provider?.removeListener?.('close', this.handleClose)
    provider?.removeListener?.('networkChanged', this.handleChainChanged)
  }

  public async isAuthorized(): Promise<boolean> {
    const provider = injectedProvider()
    if (!provider) return false

    try {
      return firstAccount(await provider.send('eth_accounts')) !== null
    } catch {
      return false
    }
  }
}
