import Trans from 'components/Trans'


const claims: any[] = [
  {
    name: 'CoinCollect OG Believers',
    description: <Trans>CoinCollect NFT holders, your share of the reward pool awaits! Step into the realm of exclusive benefits and claim your deserving share. CoinCollect - where ownership translates into rewards!</Trans>,
    imageLink: 'https://coincollect.org/assets/images/claim/CoinCollectClaim.png',
    rewardToken: 'Collect',
    requiredToken: 'Collect NFT', 
    baseAmount: 60,
    nftLimit: 6,
    totalReward: 500000,
    isFinished: false,
    rewardTokenAddress: '0xadF053697C602C76feB56d4E4C7d28c3E1Bd1075',
    projectSite: 'https://app.coincollect.org'
  },
  /*
  {
    name: 'Holder Party',
    description: <Trans>Rewards ready for top 100 Collect holders</Trans>,
    imageLink: 'https://lotshare.netlify.app/images/artwork/08.jpg',
    rewardToken: 'Shiba',
    requiredToken: 'Collect NFT', 
    baseAmount: 12,
    isFinished: false,
  },
  {
    name: 'Community Rewards',
    description: <Trans>Most active user on twitter will be rewarded</Trans>,
    imageLink: 'https://lotshare.netlify.app/images/artwork/09.jpg',
    rewardToken: 'Lot',
    requiredToken: 'Lotshare NFT', 
    baseAmount: 15,
    isFinished: false,
  },
  */
]


export default claims
