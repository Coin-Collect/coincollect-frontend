import { AutoRenewIcon, Box, Button, Card, CardBody, Flex, Heading, Text } from '@pancakeswap/uikit'
import { useRouter } from 'next/router'
import { useTranslation } from 'contexts/Localization'
import StatBox, { StatBoxItem } from 'views/Nft/market/components/StatBox'
import { formatNumber, getBalanceNumber } from 'utils/formatBalance'
import { BIG_ZERO } from 'utils/bigNumber'
import useProfileDashboardData from '../../hooks/useProfileDashboardData'

const ProfileOverview = () => {
  const { t } = useTranslation()
  const { query } = useRouter()
  const accountAddress = typeof query.accountAddress === 'string' ? query.accountAddress : undefined
  const dashboardData = useProfileDashboardData(accountAddress)

  const totalPendingRewards = dashboardData.pendingRewards ?? BIG_ZERO
  const pendingRewardsStat = dashboardData.isLoading
    ? null
    : dashboardData.pendingRewards == null
    ? '-'
    : `${formatNumber(getBalanceNumber(totalPendingRewards, 18), 2, 2)} COLLECT`

  const totalStakedBalance = dashboardData.stakedBalance ?? BIG_ZERO
  const stakedNftsStat = dashboardData.isLoading
    ? null
    : dashboardData.stakedBalance == null
    ? '-'
    : formatNumber(totalStakedBalance.toNumber(), 0, 0)

  const isOwnProfile = typeof dashboardData.onHarvestAll === 'function'
  const harvestDisabled =
    dashboardData.isLoading || dashboardData.isHarvestingAll || !dashboardData.canHarvest

  const stats = [
    { title: t('Pending rewards'), stat: pendingRewardsStat },
    { title: t('Staked NFTs'), stat: stakedNftsStat },
  ]

  return (
    <Flex flexDirection="column" gridGap="24px">
      <Card>
        <CardBody>
          <Heading scale="md">{t('Profile overview')}</Heading>
          <Text color="textSubtle" mt="8px">
            {isOwnProfile
              ? t('Review your aggregated staking activity and pending rewards across CoinCollect NFT farms.')
              : t('Overview metrics are available when you connect the wallet that owns this profile.')}
          </Text>
        </CardBody>
      </Card>
      <StatBox>
        {stats.map((item) => (
          <StatBoxItem key={item.title} title={item.title} stat={item.stat} />
        ))}
      </StatBox>
      {isOwnProfile && (
        <Card>
          <CardBody>
            <Flex
              flexDirection={['column', null, 'row']}
              alignItems={['flex-start', null, 'center']}
              justifyContent="space-between"
              gridGap="16px"
            >
              <Box>
                <Heading scale="sm">{t('Harvest all pending rewards')}</Heading>
                <Text color="textSubtle" mt="8px">
                  {dashboardData.canHarvest
                    ? t('Collect rewards from all of your active NFT farms in a single transaction.')
                    : t('You do not have any pending rewards to harvest right now.')}
                </Text>
              </Box>
              <Button
                width={['100%', null, 'auto']}
                onClick={() => dashboardData.onHarvestAll?.()}
                disabled={harvestDisabled}
                isLoading={dashboardData.isHarvestingAll}
                endIcon={dashboardData.isHarvestingAll ? <AutoRenewIcon spin color="currentColor" /> : null}
              >
                {dashboardData.isHarvestingAll ? t('Harvesting') : t('Harvest All Rewards')}
              </Button>
            </Flex>
          </CardBody>
        </Card>
      )}
    </Flex>
  )
}

export default ProfileOverview
