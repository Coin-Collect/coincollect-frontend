import { MenuItemsType } from "@pancakeswap/uikit";


<<<<<<< Updated upstream
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
=======
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
        label: 'Games',
        icon: 'TicketIcon',
        href: '/games',
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
>>>>>>> Stashed changes

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