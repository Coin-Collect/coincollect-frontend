import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import memoize from 'lodash/memoize'
import { defineChain } from 'viem'
import { polygon } from 'wagmi/chains'
import { getLocalForkRpcUrl, isLocalForkMode, LOCAL_FORK_CHAIN_ID } from 'config/localFork'

// Get projectId from https://cloud.walletconnect.com
export const projectId = 'e0c7decec4ed90ec17fd3c5f3cba1c4c'

if (!projectId) throw new Error('Project ID is not defined')

export const metadata = {
  name: 'CoinCollect',
  description: 'Generate Passive Income through NFTs',
  url: 'https://app.coincollect.org/', // origin must match your domain & subdomain
  icons: ['/images/logos/512logo-1.png'],
}

// Create wagmiConfig
const localForkChain = isLocalForkMode
  ? defineChain({
      id: LOCAL_FORK_CHAIN_ID,
      name: 'CoinCollect Polygon Fork (LOCAL)',
      nativeCurrency: { name: 'Polygon Ecosystem Token', symbol: 'POL', decimals: 18 },
      rpcUrls: { default: { http: [getLocalForkRpcUrl()!] } },
    })
  : undefined

const chains = localForkChain ? ([localForkChain] as const) : ([polygon] as const)
export const defaultChain = chains[0]
export const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  ssr: true,
  auth: {
    email: true, // default to true
    socials: undefined,
    showWallets: false, // default to true
    walletFeatures: false // default to true
  }
})

export const CHAIN_IDS = chains.map((c) => c.id)
export const isChainSupported = memoize((chainId: number) => (CHAIN_IDS as number[]).includes(chainId))
