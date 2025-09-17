import { useMemo } from 'react'
import { Box, Card, CardBody, Flex, Grid, Heading, Text, Toggle } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import useWeb3React from 'hooks/useWeb3React'
import { useRouter } from 'next/router'
import { useAchievementsForAddress, useProfileForAddress } from 'state/profile/hooks'
import usePersistState from 'hooks/usePersistState'
import { NftProfileLayout } from 'views/Nft/market/Profile'
import SubMenu from 'views/Nft/market/Profile/components/SubMenu'
import UnconnectedProfileNfts from 'views/Nft/market/Profile/components/UnconnectedProfileNfts'
import UserNfts from 'views/Nft/market/Profile/components/UserNfts'
import Achievements from 'views/Nft/market/Profile/components/Achievements'
import RecentActivityCard from 'views/Nft/market/Profile/components/RecentActivityCard'
import useCoinCollectNftsForAddress from 'views/Nft/market/hooks/useCoinCollectNftsForAddress'

const DASHBOARD_PREFERENCES_LS_KEY = 'nft-profile-dashboard-cards'
const defaultCardVisibility = {
  achievements: true,
  activity: true,
}

type DashboardCardVisibility = typeof defaultCardVisibility

const NftProfilePage = () => {
  const { account } = useWeb3React()
  const accountAddress = useRouter().query.accountAddress as string
  const isConnectedProfile = account?.toLowerCase() === accountAddress?.toLowerCase()
  const { t } = useTranslation()
  const [cardVisibility, setCardVisibility] = usePersistState(defaultCardVisibility, {
    localStorageKey: DASHBOARD_PREFERENCES_LS_KEY,
    hydrate: (value) => ({ ...defaultCardVisibility, ...value }),
  }) as [
    DashboardCardVisibility,
    (value: DashboardCardVisibility | ((prev: DashboardCardVisibility) => DashboardCardVisibility)) => void,
  ]
  const {
    profile,
    isValidating: isProfileFetching,
    refresh: refreshProfile,
  } = useProfileForAddress(accountAddress, {
    revalidateIfStale: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const {
    nfts,
    isLoading: isNftLoading,
    refresh: refreshUserNfts,
  } = useCoinCollectNftsForAddress(accountAddress, profile, isProfileFetching)
  const {
    achievements,
    isFetching: isAchievementFetching,
    refresh: refreshAchievements,
  } = useAchievementsForAddress(accountAddress)

  const hasVisibleCards = useMemo(() => cardVisibility.achievements || cardVisibility.activity, [cardVisibility])

  const handleToggleCard = (key: keyof DashboardCardVisibility) => () => {
    setCardVisibility((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <>
      {/* TODO: Activate Later
      <SubMenu />
      */}
      <Box mb="24px">
        <Flex
          flexDirection={['column', null, 'row']}
          alignItems={['flex-start', null, 'center']}
          justifyContent="space-between"
          mb="16px"
          gridGap="16px"
        >
          <Heading as="h3" scale="md">
            {t('Customize dashboard')}
          </Heading>
          <Flex flexWrap="wrap" alignItems="center" gridGap="16px">
            <Flex alignItems="center">
              <Toggle scale="sm" checked={cardVisibility.achievements} onChange={handleToggleCard('achievements')} />
              <Text ml="8px">{t('Show achievements')}</Text>
            </Flex>
            <Flex alignItems="center">
              <Toggle scale="sm" checked={cardVisibility.activity} onChange={handleToggleCard('activity')} />
              <Text ml="8px">{t('Show recent activity')}</Text>
            </Flex>
          </Flex>
        </Flex>
        {hasVisibleCards ? (
          <Grid gridGap="24px" gridTemplateColumns={['1fr', null, 'repeat(2, minmax(0, 1fr))']}>
            {cardVisibility.achievements && (
              <Achievements
                achievements={achievements}
                isLoading={isAchievementFetching}
                points={profile?.points}
                onSuccess={refreshAchievements}
              />
            )}
            {cardVisibility.activity && <RecentActivityCard accountAddress={accountAddress} />}
          </Grid>
        ) : (
          <Card>
            <CardBody>
              <Text color="textSubtle">{t('Enable a card above to customize your dashboard.')}</Text>
            </CardBody>
          </Card>
        )}
      </Box>
      {isConnectedProfile ? (
        <UserNfts
          nfts={nfts}
          isLoading={isNftLoading}
          onSuccessSale={refreshUserNfts}
          onSuccessEditProfile={async () => {
            await refreshProfile()
            refreshUserNfts()
          }}
        />
      ) : (
        <UnconnectedProfileNfts nfts={nfts} isLoading={isNftLoading} />
      )}
    </>
  )
}

NftProfilePage.Layout = NftProfileLayout

export default NftProfilePage
