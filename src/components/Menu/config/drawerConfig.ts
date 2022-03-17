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
        href: '/farms',
        initialOpenState: false,
        items: [
            {
                label: 'OpenSea',
                href: '/farms',
            },
            {
                label: 'NFTrade',
                href: '/pools',
            },
            {
                label: 'DappRadar',
                href: '/pools',
            },
            {
                label: 'Docs',
                href: '/pools',
            },

        ],
    },


];

export default drawerLinks