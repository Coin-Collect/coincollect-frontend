import { Flex, Link } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import { getBscScanLink, getPolygonScanLink } from 'utils'
import { formatNumber } from 'utils/formatBalance'
import truncateHash from 'utils/truncateHash'
import { Achievement, Profile } from 'state/types'
import useWeb3React from 'hooks/useWeb3React'
import BannerHeader from '../../components/BannerHeader'
import StatBox, { StatBoxItem } from '../../components/StatBox'
import MarketPageTitle from '../../components/MarketPageTitle'
import AvatarImage from '../../components/BannerHeader/AvatarImage'
import useUserStakedNftFarms from '../hooks/useUserStakedNftFarms'
import { useClaimInfo } from 'views/Claim/hooks/useClaimInfo'

interface HeaderProps {
  accountPath: string
  profile: Profile | null
  achievements: Achievement[]
  nftCollected: number
  isAchievementsLoading: boolean
  isNftLoading: boolean
  isProfileLoading: boolean
}

// Account and profile passed down as the profile could be used to render _other_ users' profiles.
const ProfileHeader: React.FC<HeaderProps> = ({
  accountPath,
  profile,
  achievements,
  nftCollected,
  isAchievementsLoading,
  isNftLoading,
  isProfileLoading,
}) => {
  const { t } = useTranslation()
  const { account } = useWeb3React()

  const isConnectedAccount = account?.toLowerCase() === accountPath?.toLowerCase()
  const { stakedFarms, isLoading: isStakedFarmsLoading } = useUserStakedNftFarms(isConnectedAccount)
  const claimInfo = useClaimInfo()

  const numNftCollected = !isNftLoading ? (nftCollected ? formatNumber(nftCollected, 0, 0) : '-') : null
  const numStakedPools = isConnectedAccount
    ? (isStakedFarmsLoading ? null : formatNumber(stakedFarms.length, 0, 0))
    : '-'
  const claimableCount = claimInfo?.data
    ? claimInfo.data.filter((claim) => {
        if (!claim) return false
        if ((claim.remainingClaims ?? 0) <= 0) return false
        if ((claim.userWeight ?? 0) === 0) return false
        return (claim.rewardBalance ?? 0) > 0
      }).length
    : 0
  const isClaimInfoLoading = claimInfo?.isLoading
  const numClaimableRewards = isClaimInfoLoading ? null : formatNumber(claimableCount, 0, 0)

  const avatarImage = profile?.nft?.image?.thumbnail || '/logo-video_transparent.webm'
  const bannerMedia = '/dashboard.webm'

  const getAvatar = () => {
    return <AvatarImage src={avatarImage} alt={t('User profile picture')} />
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
    if (!accountPath) {
      return null
    }

    return (
      <Flex flexDirection="column" mb={[16, null, 0]} mr={[0, null, 16]}>
        <Link href={getBscScanLink(accountPath, 'address')} external bold color="primary">
          {truncateHash(accountPath)}
        </Link>
      </Flex>
    )
  }

  return (
    <>
      <BannerHeader bannerImage={bannerMedia} bannerAlt={t('User dashboard banner')} avatar={getAvatar()} />
      <MarketPageTitle pb="48px" title={getTitle() || ''} description={renderDescription()} accountPath={accountPath}>
        <StatBox>
          <StatBoxItem title={t('NFT Collected')} stat={numNftCollected ?? '-'} />
          <StatBoxItem title={t('Pools')} stat={numStakedPools ?? '-'} />
          <StatBoxItem title={t('Claim Rewards')} stat={numClaimableRewards ?? '-'} />
        </StatBox>
      </MarketPageTitle>
    </>
  )
}

export default ProfileHeader
