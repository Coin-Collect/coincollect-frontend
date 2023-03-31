import { ContextApi } from 'contexts/Localization/types'
import { PageMeta } from './types'

export const DEFAULT_META: PageMeta = {
  title: 'CoinCollect',
  description:
    'CoinCollect is the MultiChain NFT DeFi Protocol, that helps NFT traders, high yield farmers, liquidity providers, developers and web 3.0 startups to participate in an open financial market with no barriers to entry',
  image: 'https://coincollect.org/assets/images/clone/ogbanner.png',
}

export const getCustomMeta = (path: string, t: ContextApi['t']): PageMeta => {
  let basePath
  if (path.startsWith('/swap')) {
    basePath = '/swap'
  } else if (path.startsWith('/add')) {
    basePath = '/add'
  } else if (path.startsWith('/remove')) {
    basePath = '/remove'
  } else if (path.startsWith('/teams')) {
    basePath = '/teams'
  } else if (path.startsWith('/voting/proposal') && path !== '/voting/proposal/create') {
    basePath = '/voting/proposal'
  } else if (path.startsWith('/nfts/collections')) {
    basePath = '/nfts/collections'
  } else if (path.startsWith('/nfts/profile')) {
    basePath = '/nfts/profile'
  } else if (path.startsWith('/pancake-squad')) {
    basePath = '/pancake-squad'
  } else {
    basePath = path
  }

  switch (basePath) {
    case '/':
      return {
        title: `${t('Home')} | ${t('CoinCollect')}`,
      }
    case '/swap':
      return {
        title: `${t('Exchange')} | ${t('CoinCollect')}`,
      }
    case '/add':
      return {
        title: `${t('Add Liquidity')} | ${t('CoinCollect')}`,
      }
    case '/remove':
      return {
        title: `${t('Remove Liquidity')} | ${t('CoinCollect')}`,
      }
    case '/liquidity':
      return {
        title: `${t('Liquidity')} | ${t('CoinCollect')}`,
      }
    case '/find':
      return {
        title: `${t('Import Pool')} | ${t('CoinCollect')}`,
      }
    case '/competition':
      return {
        title: `${t('Trading Battle')} | ${t('CoinCollect')}`,
      }
    case '/prediction':
      return {
        title: `${t('Prediction')} | ${t('CoinCollect')}`,
      }
    case '/prediction/leaderboard':
      return {
        title: `${t('Leaderboard')} | ${t('CoinCollect')}`,
      }
    case '/farms':
      return {
        title: `${t('Farms')} | ${t('CoinCollect')}`,
      }
    case '/farms/auction':
      return {
        title: `${t('Farm Auctions')} | ${t('CoinCollect')}`,
      }
    case '/pools':
      return {
        title: `${t('Pools')} | ${t('CoinCollect')}`,
      }
    case '/nftpools':
      return {
        title: `${t('NFT Pools')} | ${t('CoinCollect')}`,
      }
    case '/lottery':
      return {
        title: `${t('Lottery')} | ${t('CoinCollect')}`,
      }
    case '/ifo':
      return {
        title: `${t('Initial Farm Offering')} | ${t('CoinCollect')}`,
      }
    case '/teams':
      return {
        title: `${t('Leaderboard')} | ${t('CoinCollect')}`,
      }
    case '/voting':
      return {
        title: `${t('Voting')} | ${t('CoinCollect')}`,
      }
    case '/voting/proposal':
      return {
        title: `${t('Proposals')} | ${t('CoinCollect')}`,
      }
    case '/voting/proposal/create':
      return {
        title: `${t('Make a Proposal')} | ${t('CoinCollect')}`,
      }
    case '/info':
      return {
        title: `${t('Overview')} | ${t('CoinCollect Info & Analytics')}`,
        description: 'View statistics for CoinCollect exchanges.',
      }
    case '/info/pools':
      return {
        title: `${t('Pools')} | ${t('CoinCollect Info & Analytics')}`,
        description: 'View statistics for CoinCollect exchanges.',
      }
    case '/info/tokens':
      return {
        title: `${t('Tokens')} | ${t('CoinCollect Info & Analytics')}`,
        description: 'View statistics for CoinCollect exchanges.',
      }
    case '/nfts':
      return {
        title: `${t('Overview')} | ${t('CoinCollect')}`,
      }
    case '/nfts/collections':
      return {
        title: `${t('Collections')} | ${t('CoinCollect')}`,
      }
    case '/nfts/activity':
      return {
        title: `${t('Activity')} | ${t('CoinCollect')}`,
      }
    case '/nfts/profile':
      return {
        title: `${t('Profile')} | ${t('CoinCollect')}`,
      }
    case '/pancake-squad':
      return {
        title: `${t('Pancake Squad')} | ${t('CoinCollect')}`,
      }
    default:
      return null
  }
}
