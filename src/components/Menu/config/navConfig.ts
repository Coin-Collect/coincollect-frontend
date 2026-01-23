import { ContextApi } from 'contexts/Localization/types'
import { nftsBaseUrl } from 'views/Nft/market/constants'

export type NavItem = {
  id: string
  label: string
  href: string
  icon?: string
  children?: NavItem[]
  external?: boolean
  hideSubNav?: boolean
  showInDrawer?: boolean
  showInTopNav?: boolean
  activeMatch?: 'exact' | 'prefix'
  matchPaths?: string[]
  calloutClass?: string
  initialOpenState?: boolean
}

export const getNavConfig = (t: ContextApi['t'], account?: string | null): NavItem[] => {
  const items: NavItem[] = [
    {
      id: 'collections',
      label: t('Collections'),
      href: `${nftsBaseUrl}/collections`,
      icon: 'Nft',
      activeMatch: 'prefix',
    },
    {
      id: 'nft-stake',
      label: t('NFT Stake'),
      href: '/nftpools',
      icon: 'Pool',
      activeMatch: 'prefix',
    },
    {
      id: 'claim-rewards',
      label: t('Claim Rewards'),
      href: '/claim',
      icon: 'Prize',
      activeMatch: 'prefix',
    },
    {
      id: 'games',
      label: t('Games'),
      href: '/games',
      icon: 'PlayCircleOutline',
      activeMatch: 'prefix',
    },
    {
      id: 'marketplace',
      label: t('Marketplace'),
      href: 'https://market.coincollect.org/',
      icon: 'OpenNew',
      external: true,
    },
    {
      id: 'farms',
      label: t('Farms'),
      href: '/farms',
      icon: 'Farm',
      activeMatch: 'prefix',
    },
    {
      id: 'stake',
      label: t('Stake'),
      href: '/pools',
      icon: 'Earn',
      activeMatch: 'prefix',
    },
    {
      id: 'swap',
      label: t('Swap'),
      href: '/swap',
      icon: 'Swap',
      activeMatch: 'prefix',
    },
    {
      id: 'liquidity',
      label: t('Liquidity'),
      href: '/liquidity',
      icon: 'SyncAlt',
      activeMatch: 'prefix',
    },
    {
      id: 'more',
      label: t('More'),
      href: '/more',
      icon: 'Info',
      initialOpenState: false,
      children: [
        {
          id: 'collect-domain',
          label: t('.COLLECT Domain'),
          href: 'https://get.unstoppabledomains.com/collect/',
          external: true,
        },
        {
          id: 'coinmarketcap',
          label: t('CoinMarketCap'),
          href: 'https://coinmarketcap.com/currencies/coincollect/',
          external: true,
        },
        {
          id: 'coingecko',
          label: t('CoinGecko'),
          href: 'https://www.coingecko.com/en/coins/coincollect',
          external: true,
        },
        {
          id: 'opensea',
          label: t('OpenSea'),
          href: 'https://opensea.io/web3Community/created',
          external: true,
        },
        {
          id: 'dappradar',
          label: t('DappRadar'),
          href: 'https://dappradar.com/dapp/coincollect',
          external: true,
        },
        {
          id: 'docs-guides',
          label: t('Docs & Guides'),
          href: 'https://docs.coincollect.org/',
          external: true,
        },
      ],
    },
  ]

  if (account) {
    const dashboardHref = `${nftsBaseUrl}/profile/${account.toLowerCase()}`
    items.unshift({
      id: 'dashboard',
      label: t('Dashboard'),
      href: dashboardHref,
      icon: 'Home',
      activeMatch: 'prefix',
    })
  }

  return items
}
