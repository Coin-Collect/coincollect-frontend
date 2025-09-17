import { Box, Flex, Heading, Text } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import useProfileDefiOverview from '../../hooks/useProfileDefiOverview'
import StakedPositionsPanel from './StakedPositionsPanel'
import PendingRewardsCard from './PendingRewardsCard'

interface OverviewProps {
  accountAddress?: string
}

const ProfileOverview: React.FC<OverviewProps> = ({ accountAddress }) => {
  const { t } = useTranslation()
  const { categories, rewardBreakdown, isAccountMatch, isLoading, refreshers, positionsCount } = useProfileDefiOverview(
    accountAddress,
  )

  return (
    <Box>
      <Heading scale="lg" mb="24px">
        {t('DeFi overview')}
      </Heading>
      {!isAccountMatch ? (
        <Text color="textSubtle" mb="16px">
          {t('Connect the wallet that owns this profile to view staking activity and pending rewards.')}
        </Text>
      ) : null}
      <Flex flexDirection={['column', null, 'column', 'row']} gridGap="24px">
        <Box flex="2">
          <StakedPositionsPanel
            categories={categories}
            isAccountMatch={isAccountMatch}
            isLoading={isLoading}
            refreshers={refreshers}
          />
        </Box>
        <Box flex="1">
          <PendingRewardsCard
            breakdown={rewardBreakdown}
            positionsCount={positionsCount}
            isAccountMatch={isAccountMatch}
            isLoading={isLoading}
          />
        </Box>
      </Flex>
    </Box>
  )
}

export default ProfileOverview
