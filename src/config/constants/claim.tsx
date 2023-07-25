import Trans from 'components/Trans'


const claims: any[] = [
  {
    name: 'CoinCollect OG Believers',
    description: <Trans>CoinCollect NFT holders, your share of the reward pool awaits! Step into the realm of exclusive benefits and claim your deserving share. CoinCollect - where ownership translates into rewards!</Trans>,
    imageLink: 'https://coincollect.org/assets/images/claim/CoinCollectClaim.png',
    rewardToken: 'Collect',
    requiredToken: 'Collect NFT', 
    baseAmount: 50,
    nftLimit: 5,
    totalReward: 100000,
    isFinished: false,
    rewardTokenAddress: '0x56633733fc8BAf9f730AD2b6b9956Ae22c6d4148',
    projectSite: 'https://app.coincollect.org'
  },
  {
    name: 'LotShare Rewards',
    description: <Trans>LotShare and CoinCollect NFT holders can now claim their LOT tokens, a gift to our vibrant community. At LotShare, ownership equates to rewards, offering exclusive benefits within our ecosystem.</Trans>,
    imageLink: 'https://coincollect.org/assets/images/claim/lotShareClaim.png',
    rewardToken: 'LOT',
    requiredToken: 'LotShare NFT', 
    baseAmount: 50,
    nftLimit: 5,
    totalReward: 100000,
    isFinished: false,
    rewardTokenAddress: '0x8c1245BA1714BD7a61A34Cb63b95331Fa3db497C',
    projectSite: 'https://lotshare.app/'
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
