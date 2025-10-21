import { Heading, Flex, Text, Skeleton, ChartIcon, CommunityIcon, SwapIcon, Button } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import useTheme from 'hooks/useTheme'
import { formatLocalisedCompactNumber } from 'utils/formatBalance'
import useSWRImmutable from 'swr/immutable'
import { useMemo } from 'react'
import { NextLinkFromReactRouter } from 'components/NextLink'
import IconCard, { IconCardData } from '../IconCard'
import StatCardContent from './StatCardContent'
import GradientLogo from '../GradientLogoSvg'
import { getRandomSuperheroVideos } from 'utils/getRandomSuperheroVideo'

const Stats = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()

  const { data: tvl } = useSWRImmutable('tvl')
  const { data: txCount } = useSWRImmutable('totalTx30Days')
  const { data: addressCount } = useSWRImmutable('addressCount30Days')
  const trades = formatLocalisedCompactNumber(txCount)
  const users = formatLocalisedCompactNumber(addressCount)
  const tvlString = tvl ? formatLocalisedCompactNumber(tvl) : '-'

  // Get three unique random superhero videos for the cards
  const superheroVideos = useMemo(() => getRandomSuperheroVideos(3), [])

  const tvlText = t('And those users are now entrusting the platform with over $%tvl% in funds.')
  const [entrusting, inFunds] = tvlText.split(tvlString)

  const UsersCardData: IconCardData = {
    icon: <CommunityIcon color="secondary" width="36px" />,
    videoSrc: superheroVideos[0],
  }

  const TradesCardData: IconCardData = {
    icon: <SwapIcon color="primary" width="36px" />,
    videoSrc: superheroVideos[1],
  }

  const StakedCardData: IconCardData = {
    icon: <ChartIcon color="failure" width="36px" />,
    videoSrc: superheroVideos[2],
  }

  return (
    <Flex justifyContent="center" alignItems="center" flexDirection="column">
      <GradientLogo height="48px" width="248px" mb="24px" />
      <Heading textAlign="center" scale="xl">
        {t('Unlock the Full Potential of Your NFTs')}
      </Heading>
      <Text textAlign="center" color="textSubtle" mb="32px" maxWidth="600px">
        {t('Stake your NFTs to unlock real rewards. Earn tokens, receive exclusive airdrops, and freely buy, sell, or trade — all within CoinCollect\'s seamless Web3 ecosystem.')}
      </Text>
      
      <NextLinkFromReactRouter to="/nfts/collections">
        <Button mb="32px" scale="md">
          {t('Mint NFT')}
        </Button>
      </NextLinkFromReactRouter>

      <Flex flexDirection={['column', null, null, 'row']}>
        <IconCard {...UsersCardData} mr={[null, null, null, '16px']} mb={['16px', null, null, '0']}>
          <StatCardContent
            headingText={t('multiple coin airdrops', { users })}
            bodyText={t('in the last 30 days')}
            highlightColor={theme.colors.secondary}
          />
        </IconCard>
        <IconCard {...TradesCardData} mr={[null, null, null, '16px']} mb={['16px', null, null, '0']}>
          <StatCardContent
            headingText={t('Upcoming sale whitelist', { trades })}
            bodyText={t('made in the last 30 days')}
            highlightColor={theme.colors.primary}
          />
        </IconCard>
        <IconCard {...StakedCardData}>
          <StatCardContent
            headingText={t('high yield earn', { tvl: tvlString })}
            bodyText={t('Total Value Locked')}
            highlightColor={theme.colors.failure}
          />
        </IconCard>
      </Flex>
    </Flex>
  )
}

export default Stats
