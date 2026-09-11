import { FallbackProvider, StaticJsonRpcProvider, type Networkish } from '@ethersproject/providers'
import { ChainId } from '@coincollect/sdk'
import getRpcUrl, { maticNodes } from 'utils/getRpcUrl'

const RPC_URL = getRpcUrl()

const createStaticProvider = (url: string, network?: Networkish) => {
  return network ? new StaticJsonRpcProvider(url, network) : new StaticJsonRpcProvider(url)
}

const createFallbackProvider = (urls: string[], network?: Networkish) => {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)))

  if (uniqueUrls.length === 0) {
    throw Error('No RPC URLs provided')
  }

  if (uniqueUrls.length === 1) {
    return createStaticProvider(uniqueUrls[0], network)
  }

  const providerConfigs = uniqueUrls.map((url, index) => ({
    provider: createStaticProvider(url, network),
    priority: index + 1,
    weight: 1,
    stallTimeout: 1_500,
  }))

  const quorum = Math.min(1, providerConfigs.length) || 1

  return new FallbackProvider(providerConfigs, quorum)
}

const RPC_REQUEST_TIMEOUT_MS = 8_000

class QueuedStaticJsonRpcProvider extends StaticJsonRpcProvider {
  private readonly rpcProviders: StaticJsonRpcProvider[]
  private activeRequests = 0
  private readonly maxConcurrentRequests: number
  private nextProviderIndex = 0
  private readonly pendingRequests: Array<{
    method: string
    params: any[]
    resolve: (value: any) => void
    reject: (reason?: unknown) => void
  }> = []

  constructor(urls: string[], network: Networkish, maxConcurrentRequests = 4) {
    const uniqueUrls = Array.from(new Set(urls.filter(Boolean)))
    if (uniqueUrls.length === 0) throw Error('No RPC URLs provided')

    super(uniqueUrls[0], network)
    this.rpcProviders = uniqueUrls.map((url) => new StaticJsonRpcProvider(url, network))
    this.maxConcurrentRequests = maxConcurrentRequests
  }

  send(method: string, params: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.pendingRequests.push({ method, params, resolve, reject })
      this.pumpRequests()
    })
  }

  private pumpRequests() {
    while (this.activeRequests < this.maxConcurrentRequests && this.pendingRequests.length > 0) {
      const request = this.pendingRequests.shift()!
      this.activeRequests += 1
      this.sendWithRetry(request.method, request.params)
        .then(request.resolve, request.reject)
        .finally(() => {
          this.activeRequests -= 1
          this.pumpRequests()
        })
    }
  }

  private async sendWithRetry(method: string, params: any[], attempt = 0): Promise<any> {
    const provider = this.rpcProviders[this.nextProviderIndex % this.rpcProviders.length]
    this.nextProviderIndex += 1
    try {
      const request = provider.send(method, params)
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('RPC request timed out.')), RPC_REQUEST_TIMEOUT_MS),
      )
      return await Promise.race([request, timeout])
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      const retryable =
        message.includes('429') ||
        message.includes('too many requests') ||
        message.includes('missing response') ||
        message.includes('network error') ||
        message.includes('timed out')
      if (!retryable || attempt >= 2) throw error
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
      return this.sendWithRetry(method, params, attempt + 1)
    }
  }
}

export const simpleRpcProvider = new StaticJsonRpcProvider(RPC_URL)
export const simplePolygonRpcProvider = createFallbackProvider(maticNodes, {
  chainId: ChainId.POLYGON,
  name: 'polygon',
})
const registryRpcUrls = typeof window === 'undefined' ? maticNodes : ['/api/rpc/polygon']
export const nftPoolRegistryRpcProvider = new QueuedStaticJsonRpcProvider(
  registryRpcUrls,
  { chainId: ChainId.POLYGON, name: 'polygon' },
  8,
)

export default null
