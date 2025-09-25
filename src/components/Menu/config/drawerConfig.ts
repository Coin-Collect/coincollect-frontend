import { MenuItemsType } from "@pancakeswap/uikit";


const drawerLinks: MenuItemsType[] = [
    {
        label: 'Collections',
        icon: 'NftIcon',
        href: '/nfts/collections',
    },
    {
        label: 'NFT Stake',
        icon: 'PoolIcon',
        href: '/nftpools',
    },
    {
        label: 'Claim Rewards',
        icon: 'PrizeIcon',
        href: '/claim',
    },
    {
        label: 'Marketplace',
        icon: 'OpenNewIcon',
        href: 'https://market.coincollect.org/',
    },
    {
        label: 'Farms',
        icon: 'FarmIcon',
        href: '/farms',
    },
    {
        label: 'Stake',
        icon: 'EarnIcon',
        href: '/pools',
    },
    {
        label: 'Quest (Soon)',
        icon: 'LightningIcon',
        href: '/?q=soon',
    },
    {
        label: 'Swap',
        icon: 'SwapIcon',
        href: '/swap',
    },
    {
        label: 'Liquidity',
        icon: 'SyncAltIcon',
        href: '/liquidity',
    },
    {
        label: 'More',
        icon: 'InfoIcon',
        href: '/more',
        initialOpenState: false,
        items: [
            {
                label: '.COLLECT Domain',
                href: 'https://get.unstoppabledomains.com/collect/',
            },
            {
                label: 'CoinMarketCap',
                href: 'https://coinmarketcap.com/currencies/coincollect/',
            },
            {
                label: 'CoinGecko',
                href: 'https://www.coingecko.com/en/coins/coincollect',
            },
            {
                label: 'OpenSea',
                href: 'https://opensea.io/web3Community/created',
            },
            {
                label: 'DappRadar',
                href: 'https://dappradar.com/dapp/coincollect',
            },
            {
                label: 'Docs & Guides',
                href: 'https://docs.coincollect.org/',
            },

        ],
    },

];

export default drawerLinks