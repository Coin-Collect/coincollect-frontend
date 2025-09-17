import { NextLinkFromReactRouter as ReactRouterLink } from 'components/NextLink'
import styled from 'styled-components'
import { AutoRenewIcon, BscScanIcon, Flex, IconButton, Link, Button, useModal } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import { getBscScanLink, getPolygonScanLink } from 'utils'
import { formatNumber, getBalanceNumber } from 'utils/formatBalance'
import { BIG_ZERO } from 'utils/bigNumber'
import truncateHash from 'utils/truncateHash'
import { Achievement, Profile } from 'state/types'
import useWeb3React from 'hooks/useWeb3React'
import type { ProfileDashboardData } from '../hooks/useProfileDashboardData'
import EditProfileAvatar from './EditProfileAvatar'
import BannerHeader from '../../components/BannerHeader'
import StatBox, { StatBoxItem } from '../../components/StatBox'
import MarketPageTitle from '../../components/MarketPageTitle'
import EditProfileModal from './EditProfileModal'
import AvatarImage from '../../components/BannerHeader/AvatarImage'

interface HeaderProps {
  accountPath: string
  profile?: Profile | null
  achievements?: Achievement[] | null
  nftCollected?: number
  isAchievementsLoading: boolean
  isNftLoading: boolean
  isProfileLoading: boolean
  onSuccess?: () => void
  dashboardData?: ProfileDashboardData
}

const ActionsWrapper = styled(Flex)`
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  width: 100%;

  ${({ theme }) => theme.mediaQueries.sm} {
    justify-content: flex-end;
  }
`

// Account and profile passed down as the profile could be used to render _other_ users' profiles.
const ProfileHeader: React.FC<HeaderProps> = ({
  accountPath,
  profile,
  achievements,
  nftCollected,
  isAchievementsLoading,
  isNftLoading,
  isProfileLoading,
  onSuccess,
  dashboardData,
}) => {
  const { t } = useTranslation()
  const { account } = useWeb3React()
  const [onEditProfileModal] = useModal(
    <EditProfileModal
      onSuccess={() => {
        if (onSuccess) {
          onSuccess()
        }
      }}
    />,
    false,
  )

  const isConnectedAccount = account?.toLowerCase() === accountPath?.toLowerCase()
  const hasNftCollectedValue = nftCollected !== undefined && nftCollected !== null
  const numNftCollected = isNftLoading
    ? null
    : hasNftCollectedValue
    ? formatNumber(nftCollected, 0, 0)
    : '-'
  const numPoints = isProfileLoading
    ? null
    : profile?.points !== undefined && profile?.points !== null
    ? formatNumber(Number(profile.points), 0, 0)
    : '-'
  const numAchievements = isAchievementsLoading
    ? null
    : achievements !== undefined && achievements !== null
    ? formatNumber(achievements.length, 0, 0)
    : '-'

  const dashboardLoading = dashboardData?.isLoading ?? false
  const hasDashboardData = Boolean(dashboardData && isConnectedAccount)
  const formattedPendingRewards = hasDashboardData
    ? dashboardLoading
      ? null
      : `${formatNumber(getBalanceNumber(dashboardData?.pendingRewards ?? BIG_ZERO, 18), 2, 2)} COLLECT`
    : '-'
  const formattedStakedNfts = hasDashboardData
    ? dashboardLoading
      ? null
      : formatNumber((dashboardData?.stakedBalance ?? BIG_ZERO).toNumber(), 0, 0)
    : '-'

  const statItems = [
    { title: t('NFT Collected'), stat: numNftCollected },
    { title: t('Points'), stat: numPoints },
    { title: t('Achievements'), stat: numAchievements },
  ]

  if (hasDashboardData) {
    statItems.push(
      { title: t('Pending rewards'), stat: formattedPendingRewards },
      { title: t('Staked NFTs'), stat: formattedStakedNfts },
    )
  }

  const showHarvestAll = hasDashboardData && typeof dashboardData?.onHarvestAll === 'function'
  const harvestDisabled = dashboardLoading || dashboardData?.isHarvestingAll || !dashboardData?.canHarvest

  const avatarImage = profile?.nft?.image?.thumbnail || '/images/nfts/no-profile-md.png'

  const getBannerImage = () => {
    const imagePath = '/images/teams'
    if (profile) {
      switch (profile.teamId) {
        case 1:
          return `${imagePath}/storm-banner.png`
        case 2:
          return `${imagePath}/flippers-banner.png`
        case 3:
          return `${imagePath}/cakers-banner.png`
        default:
          break
      }
    }
    return `${imagePath}/no-team-banner.png`
  }

  const getAvatar = () => {
    const getIconButtons = () => {
      return (
        // TODO: Share functionality once user profiles routed by ID
        <Flex display="inline-flex">
          {accountPath && (
            <IconButton
              as="a"
              target="_blank"
              style={{
                width: 'fit-content',
              }}
              href={getPolygonScanLink(accountPath, 'address') || ''}
              // @ts-ignore
              alt={t('View PolygonScan for user address')}
            >
              <BscScanIcon width="20px" color="primary" />
            </IconButton>
          )}
        </Flex>
      )
    }

    const getImage = () => {
      return (
        <>
          {profile && accountPath && isConnectedAccount ? (
            <EditProfileAvatar
              src={avatarImage}
              alt={t('User profile picture')}
              onSuccess={() => {
                if (onSuccess) {
                  onSuccess()
                }
              }}
            />
          ) : (
            <AvatarImage src={avatarImage} alt={t('User profile picture')} />
          )}
        </>
      )
    }
    return (
      <>
        {getImage()}
        {getIconButtons()}
      </>
    )
  }

  const getTitle = () => {
    if (profile?.username) {
      return `@${profile.username}`
    }

    if (accountPath) {
      return truncateHash(accountPath, 5, 3)
    }

    return null
  }

  const renderDescription = () => {
    const getActivateButton = () => {
      // TODO: getActivateButton disabled by return statement below, activate later.
      return;
      if (!profile) {
        return (
          <ReactRouterLink to="/create-profile">
            <Button mt="16px">{t('Activate Profile')}</Button>
          </ReactRouterLink>
        )
      }
      return (
        <Button width="fit-content" mt="16px" onClick={onEditProfileModal}>
          {t('Reactivate Profile')}
        </Button>
      )
    }

    return (
      <Flex flexDirection="column" mb={[16, null, 0]} mr={[0, null, 16]}>
        {accountPath && profile?.username && (
          <Link href={getBscScanLink(accountPath, 'address')} external bold color="primary">
            {truncateHash(accountPath)}
          </Link>
        )}
        {accountPath && isConnectedAccount && (!profile || !profile?.nft) && getActivateButton()}
      </Flex>
    )
  }

  return (
    <>
      <BannerHeader bannerImage={getBannerImage()} bannerAlt={t('User team banner')} avatar={getAvatar()} />
      <MarketPageTitle pb="48px" title={getTitle()} description={renderDescription()}>
        <Flex flexDirection="column" width="100%" gridGap="16px">
          <StatBox>
            {statItems.map((item) => (
              <StatBoxItem key={item.title} title={item.title} stat={item.stat} />
            ))}
          </StatBox>
          {showHarvestAll && (
            <ActionsWrapper>
              <Button
                width={['100%', null, null, 'auto']}
                onClick={() => dashboardData?.onHarvestAll?.()}
                disabled={harvestDisabled}
                isLoading={dashboardData?.isHarvestingAll}
                endIcon={dashboardData?.isHarvestingAll ? <AutoRenewIcon spin color="currentColor" /> : null}
              >
                {dashboardData?.isHarvestingAll ? t('Harvesting') : t('Harvest All Rewards')}
              </Button>
            </ActionsWrapper>
          )}
        </Flex>
      </MarketPageTitle>
    </>
  )
}

export default ProfileHeader
