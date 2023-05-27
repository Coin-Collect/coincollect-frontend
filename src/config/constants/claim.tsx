import Trans from 'components/Trans'


const claims: any[] = [
  {
    name: 'Collect Hunter',
    description: <Trans>Big Adventure started</Trans>,
    imageLink: 'https://lotshare.netlify.app/images/artwork/07.jpg',
    rewardToken: 'Collect',
    requiredToken: 'Collect NFT', 
    baseAmount: 10,
    isFinished: false,
  },
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
]


export default claims
