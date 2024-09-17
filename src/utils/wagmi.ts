import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import memoize from 'lodash/memoize'
import { polygon, polygonAmoy } from 'wagmi/chains'

// Get projectId from https://cloud.walletconnect.com
export const projectId = 'e0c7decec4ed90ec17fd3c5f3cba1c4c'

if (!projectId) throw new Error('Project ID is not defined')

export const metadata = {
  name: 'CoinCollect',
  description: 'Generate Passive Income through NFTs',
  url: 'https://app.coincollect.org/', // origin must match your domain & subdomain
  icons: ['https://coincollect.org/assets/images/logos/512logo-1.png']
}

// Create wagmiConfig
const chains = [polygon] as const
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