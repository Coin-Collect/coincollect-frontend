import { MenuItemsType, DropdownMenuItemType } from '@pancakeswap/uikit'
import { ContextApi } from 'contexts/Localization/types'
import { nftsBaseUrl } from 'views/Nft/market/constants'

export type ConfigMenuItemsType = MenuItemsType & { hideSubNav?: boolean }

const config: (t: ContextApi['t']) => ConfigMenuItemsType[] = (t) => [
  {
    label: '',
    icon: 'Swap',
    href: '/swap',
  },
  {
    label: '',
    icon: 'SyncAlt',
    href: '/liquidity',
  },
  {
    label: '',
    icon: 'Farm',
    href: '/farms',
  },
  {
    label: '',
    icon: 'Earn',
    href: '/pools',
  },
  {
    label: '',
    icon: 'Nft',
    href: `${nftsBaseUrl}/collections`,
  },
  {
    label: '',
    icon: 'Pool',
    href: '/nftpools',
  },
  {
    label: '',
    icon: 'Prize',
    href: '/claim',
  },
  {
    label: '',
    icon: 'OpenNew',
    href: 'https://market.coincollect.org/',
  },
  {
    label: '',
    icon: 'Lightning',
    href: '/?q=soon',
  },
  {
    label: '',
    icon: 'More',
    href: '/more',
    hideSubNav: true,
    items: [
      {
        label: t('Buy .COLLECT Domain'),
        href: 'https://get.unstoppabledomains.com/collect/',
        type: DropdownMenuItemType.EXTERNAL_LINK,
      },
      {
        label: t('CoinMarketCap'),
        href: 'https://coinmarketcap.com/currencies/coincollect/',
        type: DropdownMenuItemType.EXTERNAL_LINK,
      },
      {
        label: t('CoinGecko'),
        href: 'https://www.coingecko.com/en/coins/coincollect',
        type: DropdownMenuItemType.EXTERNAL_LINK,
      },
      {
        label: t('OpenSea'),
        href: 'https://opensea.io/web3Community/created',
        type: DropdownMenuItemType.EXTERNAL_LINK,
      },
      {
        label: t('DappRadar'),
        href: 'https://dappradar.com/dapp/coincollect',
        type: DropdownMenuItemType.EXTERNAL_LINK,
      },
      {
        label: t('Docs & Guides'),
        href: 'https://docs.coincollect.org/',
        type: DropdownMenuItemType.EXTERNAL_LINK,
      },
    ],
  },
]

export default config
