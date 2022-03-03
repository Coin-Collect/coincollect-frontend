import { MenuEntry } from "components/NewUi/widgets/Menu/types";

const drawerLinks: MenuEntry[] = [
    {
        label: 'NFTs',
        icon: 'NftIcon',
        href: '/nfts',
        initialOpenState: true,
        items: [
            {
                label: 'Marketplace',
                href: '/nfts',
            },
            {
                label: 'Collections',
                href: '/nfts/collections',
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
                label: 'Exchange (soon)',
                href: '/farms',
            },
            {
                label: 'Liquidity (soon)',
                href: '/farms',
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