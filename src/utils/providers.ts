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

  return new FallbackProvider(providerConfigs)
}

export const simpleRpcProvider = new StaticJsonRpcProvider(RPC_URL)
export const simplePolygonRpcProvider = createFallbackProvider(maticNodes, {
  chainId: ChainId.POLYGON,
  name: 'polygon',
})

export default null
