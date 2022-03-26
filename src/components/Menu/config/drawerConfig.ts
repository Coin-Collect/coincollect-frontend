import { MenuItemsType } from "@pancakeswap/uikit";


const drawerLinks: MenuItemsType[] = [
    {
        label: 'NFTs',
        icon: 'NftIcon',
        href: '/nfts',
        initialOpenState: true,
        items: [
            {
                label: 'Collections',
                href: '/nfts/collections',
            },
            {
                label: 'Marketplace (soon)',
                href: '/nfts',
            },
            

        ],
    },
    {
        label: 'Yield',
        icon: 'FarmIcon',
        href: '/farms',
        initialOpenState: false,
        items: [
            {
                label: 'Farms (soon)',
                href: '/farms',
            },
            {
                label: 'Stake (soon)',
                href: '/pools',
            },

        ],
    },

    {
        label: 'Trade',
        icon: 'TradeIcon',
        href: '/farms',
        initialOpenState: false,
        items: [
            {
                label: 'Swap (soon)',
                href: '/swap',
            },
            {
                label: 'Liquidity (soon)',
                href: '/liquidity',
            },
        ],
    },



    {
        label: 'More',
        icon: 'InfoIcon',
        href: '/more',
        initialOpenState: false,
        items: [
            {
                label: 'OpenSea',
                href: 'https://opensea.io/collection/coincollect-nfts',
            },
            {
                label: 'NFTrade',
                href: 'https://nftrade.com/assets/polygon/0x569b70fc565afba702d9e77e75fd3e3c78f57eed',
            },
            {
                label: 'DappRadar',
                href: 'https://dappradar.com/polygon/collectibles/coin-collect-nfts',
            },
            {
                label: 'Docs & Guides',
                href: 'https://docs.coincollect.org/',
            },

        ],
    },


];

export default drawerLinks