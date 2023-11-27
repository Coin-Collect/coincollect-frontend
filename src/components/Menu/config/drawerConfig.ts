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
                label: 'Marketplace',
                href: 'https://market.coincollect.org/',
            },            

        ],
    },
    {
        label: 'Yield',
        icon: 'FarmIcon',
        href: '/farms',
        initialOpenState: true,
        items: [
            {
                label: 'Farms',
                href: '/farms',
            },
            {
                label: 'Stake',
                href: '/pools',
            },
            {
                label: 'NFT Stake',
                href: '/nftpools',
            },
            {
                label: 'Claim Rewards',
                href: '/claim',
            },

        ],
    },

    {
        label: 'Trade',
        icon: 'TradeIcon',
        href: '/farms',
        initialOpenState: true,
        items: [
            {
                label: 'Swap',
                href: '/swap',
            },
            {
                label: 'Liquidity',
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
                label: 'CoinMarketCap',
                href: 'https://coinmarketcap.com/currencies/coincollect/',
            },

            {
                label: 'OpenSea',
                href: 'https://opensea.io/collection/coincollect-nfts',
            },
            {
                label: 'DappRadar',
                href: 'https://dappradar.com/dapp/coincollect',
            },
            {
                label: 'NFTrade',
                href: 'https://nftrade.com/assets/polygon/0x569b70fc565afba702d9e77e75fd3e3c78f57eed',
            }, 
            {
                label: 'Docs & Guides',
                href: 'https://docs.coincollect.org/',
            },

        ],
    },


];

export default drawerLinks