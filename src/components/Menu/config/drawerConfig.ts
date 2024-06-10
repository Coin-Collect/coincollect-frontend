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
                label: 'NFT Stake',
                href: '/nftpools',
            },
            {
                label: 'Claim Rewards',
                href: '/claim',
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
                label: 'Quest (Soon)',
                href: '/?q=soon',
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
        initialOpenState: true,
        items: [
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