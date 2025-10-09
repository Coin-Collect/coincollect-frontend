import { useMemo } from 'react'
import BigNumber from 'bignumber.js'
import styled, { css, keyframes } from 'styled-components'
import {
  Button,
  Flex,
  Heading,
  Skeleton,
  Text,
  ChevronRightIcon,
  ChartIcon,
  CurrencyIcon,
  WalletIcon,
  CommunityIcon,
  VerifiedIcon,
} from '@pancakeswap/uikit'
import Page from 'components/Layout/Page'
import FlexLayout from 'components/Layout/Flex'
import { NextLinkFromReactRouter } from 'components/NextLink'
import useWeb3React from 'hooks/useWeb3React'
import { useTranslation } from 'contexts/Localization'
import { useFarms, usePollFarmsWithUserData, usePriceCakeBusd } from 'state/nftFarms/hooks'
import { DeserializedNftFarm } from 'state/types'
import { getDisplayApr } from './Farms'
import FarmCard, { NftFarmWithStakedValue } from './components/FarmCard/FarmCard'
import nftFarmsConfig from 'config/constants/nftFarms'
import { mintingConfig } from 'config/constants'
import { getNftFarmApr } from 'utils/apr'

type NftFarmConfigEntry = typeof nftFarmsConfig[number]

const Hero = styled.div<{ $banner?: string }>`
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  padding: 32px;
  margin-bottom: 32px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 260px;
  color: ${({ theme }) => theme.colors.text};
  isolation: isolate;

  ${({ $banner }) =>
    $banner
      ? `
    background-image: url(${$banner});
    background-size: cover;
    background-position: center;
    color: #ffffff;
  `
      : ''}

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ $banner }) =>
      $banner ? 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.65) 100%)' : 'transparent'};
    z-index: 0;
  }

  > * {
    position: relative;
    z-index: 1;
  }
`

const AllowedCollectionsWrapper = styled.div`
  position: relative;
  width: 100%;
  margin-top: 8px;

  ${({ theme }) => theme.mediaQueries.md} {
    width: auto;
    max-width: 420px;
    margin-left: auto;
    padding-bottom: 4px;
  }
`

const AllowedCollectionsRow = styled(Flex)`
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-items: center;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 6px;
  padding-right: 48px;
  padding-left: 4px;
  scroll-snap-type: x proximity;

  &::-webkit-scrollbar {
    display: none;
  }

  ${({ theme }) => theme.mediaQueries.md} {
    justify-content: flex-start;
    overflow-x: auto;
    scrollbar-width: thin;
  }

  &::-webkit-scrollbar {
    display: none;
  }

  ${({ theme }) => theme.mediaQueries.md} {
    &::-webkit-scrollbar {
      display: block;
      height: 6px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.4);
      border-radius: 999px;
    }

    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
    }
  }
`

const ScrollHint = styled(Flex)`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  padding: 0 12px;
  display: flex;
  align-items: center;
  color: white;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
  background: linear-gradient(270deg, rgba(9, 11, 16, 0.9) 0%, rgba(9, 11, 16, 0) 100%);
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.2s ease;

  .scroll-chevron {
    animation: nudge 1.2s ease-in-out infinite;
  }

  ${({ theme }) => theme.mediaQueries.md} {
    background: linear-gradient(270deg, rgba(9, 11, 16, 0.7) 0%, rgba(9, 11, 16, 0) 100%);
  }

  @keyframes nudge {
    0%, 100% {
      transform: translateX(0);
      opacity: 0.3;
    }
    50% {
      transform: translateX(6px);
      opacity: 1;
    }
  }
`

const AllowedCollectionLink = styled.a`
  position: relative;
  display: inline-flex;
  width: 66px;
  height: 66px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  scroll-snap-align: start;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
  }
`

const AllowedCollectionImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const PowerBadge = styled.span`
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(13, 179, 119, 0.92);
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  letter-spacing: 0.3px;
`

const AllowedCollectionLabel = styled(Text)`
  font-size: 10px;
  line-height: 1.2;
  color: white;
  text-align: center;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
`

const AnimatedFrame = styled.div`
  position: relative;
  margin-bottom: 32px;
  border-radius: 28px;
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    inset: -38px;
    border-radius: 64px;
    background-image:
      radial-gradient(rgba(255, 255, 255, 0.14) 0%, transparent 60%),
      radial-gradient(rgba(57, 255, 242, 0.18) 0%, transparent 55%),
      radial-gradient(rgba(199, 65, 255, 0.16) 0%, transparent 62%);
    background-size: 140px 140px, 180px 180px, 220px 220px;
    background-position: 0 0, 80px 40px, 140px 120px;
    opacity: 0.55;
    animation: particleDrift 12s linear infinite;
    z-index: 0;
  }

  &::after {
    content: '';
    position: absolute;
    inset: -14px;
    border-radius: 42px;
    background:
      radial-gradient(120% 130% at 50% 0%, rgba(199, 65, 255, 0.45), transparent 70%),
      radial-gradient(120% 130% at 50% 100%, rgba(57, 255, 242, 0.45), transparent 70%),
      radial-gradient(170% 170% at 50% 50%, rgba(255, 99, 211, 0.35), transparent 72%);
    filter: blur(26px);
    opacity: 0.75;
    animation: frameGlow 6s ease-in-out infinite;
    z-index: 0;
  }

  .frame-content {
    position: relative;
    z-index: 2;
    border-radius: inherit;
    box-shadow:
      0 0 36px rgba(57, 255, 242, 0.25),
      0 0 48px rgba(199, 65, 255, 0.18);
  }

  .corner {
    position: absolute;
    width: 54px;
    height: 54px;
    pointer-events: none;
    z-index: 3;
    opacity: 0.8;
  }

  .corner::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px solid transparent;
    border-radius: 16px;
    box-shadow: 0 0 12px rgba(57, 255, 242, 0.55);
    animation: cornerPulse 2.4s ease-in-out infinite;
  }

  .corner--tl {
    top: -8px;
    left: -8px;
  }

  .corner--tl::after {
    border-top-color: #39fff2;
    border-left-color: #39fff2;
    border-bottom: none;
    border-right: none;
    animation-delay: 0s;
  }

  .corner--tr {
    top: -8px;
    right: -8px;
  }

  .corner--tr::after {
    border-top-color: #c741ff;
    border-right-color: #c741ff;
    border-bottom: none;
    border-left: none;
    animation-delay: 0.4s;
  }

  .corner--bl {
    bottom: -8px;
    left: -8px;
  }

  .corner--bl::after {
    border-bottom-color: #ff9b3d;
    border-left-color: #ff9b3d;
    border-top: none;
    border-right: none;
    animation-delay: 0.8s;
  }

  .corner--br {
    bottom: -8px;
    right: -8px;
  }

  .corner--br::after {
    border-bottom-color: #39fff2;
    border-right-color: #39fff2;
    border-top: none;
    border-left: none;
    animation-delay: 1.2s;
  }

  @keyframes frameGlow {
    0% {
      opacity: 0.65;
      transform: scale(0.96);
    }
    50% {
      opacity: 0.92;
      transform: scale(1.04);
    }
    100% {
      opacity: 0.65;
      transform: scale(0.96);
    }
  }

  @keyframes particleDrift {
    0% {
      background-position: 0 0, 80px 40px, 140px 120px;
      opacity: 0.45;
    }
    40% {
      background-position: -60px 30px, 40px 120px, 200px 60px;
      opacity: 0.6;
    }
    70% {
      background-position: -120px 80px, 20px 190px, 260px 140px;
      opacity: 0.35;
    }
    100% {
      background-position: 0 0, 80px 40px, 140px 120px;
      opacity: 0.45;
    }
  }

  @keyframes cornerPulse {
    0% {
      opacity: 0.1;
      transform: scale(0.9);
    }
    40% {
      opacity: 0.8;
      transform: scale(1.05);
    }
    100% {
      opacity: 0.1;
      transform: scale(0.9);
    }
  }
`

const HeroTopBar = styled(Flex)`
  flex-direction: column;
  gap: 16px;
  color: white;

  ${({ theme }) => theme.mediaQueries.sm} {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  ${Heading} {
    color: white;
    text-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
  }

  button,
  a {
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25);
  }
`

const HeroBadges = styled(Flex)`
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`

type BadgeVariant = 'community' | 'partner' | 'live' | 'finished'

const HeroBadge = styled.span<{ variant: BadgeVariant }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.65px;
  text-transform: uppercase;
  color: #ffffff;
  text-shadow: 0 3px 8px rgba(0, 0, 0, 0.45);
  gap: 6px;

  svg {
    width: 16px;
    height: 16px;
  }

  ${({ variant, theme }) => {
    switch (variant) {
      case 'community':
        return css`
          background: rgba(76, 195, 125, 0.95);
          box-shadow: 0 0 14px rgba(76, 195, 125, 0.45);
        `
      case 'partner':
        return css`
          background: rgba(64, 153, 255, 0.92);
          box-shadow: 0 0 14px rgba(64, 153, 255, 0.4);
        `
      case 'finished':
        return css`
          background: rgba(120, 130, 150, 0.78);
          box-shadow: 0 0 14px rgba(120, 130, 150, 0.35);
        `
      case 'live':
      default:
        return css`
          background: ${theme.colors.primary};
          box-shadow: 0 0 14px ${theme.colors.primary}55;
        `
    }
  }}

  ${({ variant, theme }) =>
    variant === 'live' &&
    css`
      padding-left: 18px;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        left: 8px;
        top: 50%;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.85);
        transform: translateY(-50%);
        animation: ${liveDot} 1.0s ease-in-out infinite;
      }
    `}
`

const liveDot = keyframes`
  0% {
    transform: translateY(-50%) scale(0.7);
    opacity: 0.3;
  }
  50% {
    transform: translateY(-50%) scale(1.3);
    opacity: 1;
  }
  100% {
    transform: translateY(-50%) scale(0.7);
    opacity: 0.3;
  }
`

const HeroDescription = styled(Text)`
  max-width: 520px;
  color: white;
  text-shadow: 0 5px 14px rgba(0, 0, 0, 0.45);
  line-height: 1.4;
`

const HeroStats = styled(Flex)`
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;

  ${({ theme }) => theme.mediaQueries.md} {
    flex-direction: row;
    justify-content: space-between;
    align-items: stretch;
  }
`

const StatTilesWrapper = styled(Flex)`
  flex-wrap: wrap;
  gap: 12px;

  ${({ theme }) => theme.mediaQueries.md} {
    flex-wrap: nowrap;
    gap: 16px;
  }
`

const StatTile = styled.div<{ $withOverlay: boolean }>`
  background: ${({ $withOverlay, theme }) =>
    $withOverlay ? 'rgba(15, 20, 30, 0.55)' : `${theme.colors.backgroundAlt}E6`};
  border-radius: 12px;
  padding: 8px 12px;
  min-width: calc(50% - 10px);
  flex: 1 1 110px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: white;

  ${({ theme }) => theme.mediaQueries.md} {
    min-width: 140px;
  }

  ${({ theme, $withOverlay }) =>
    $withOverlay &&
    css`
      ${theme.mediaQueries.md} {
        backdrop-filter: blur(6px);
      }
    `}

  ${Text} {
    color: white;
    text-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  }

  ${Heading} {
    color: white;
    text-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
  }
`

const StatTileHeader = styled(Flex)`
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
`

const StatIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
`


const Section = styled.section`
  width: 100%;
  margin-bottom: 48px;
`

const SectionHeader = styled(Flex)`
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
`

const EmptyState = styled.div`
  border: 1px dashed ${({ theme }) => theme.colors.cardBorder};
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  width: 100%;
`

const AllowedCollectionDisplay: React.FC<{
  avatar?: string
  title: string
  power?: number
  link: string
}> = ({ avatar, title, power, link }) => {
  const isExternal = link?.startsWith('http')
  const href = link || '#'

  return (
    <AllowedCollectionLink href={href} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined}>
      <AllowedCollectionImage src={avatar || '/logo.png'} alt={title} />
      <PowerBadge>{power ? `x${power}` : 'x1'}</PowerBadge>
    </AllowedCollectionLink>
  )
}

interface PoolDetailsPageProps {
  pid: number
}

const enhanceFarmWithApr = (farm: DeserializedNftFarm | undefined): NftFarmWithStakedValue | undefined => {
  if (!farm) {
    return undefined
  }

  const config = nftFarmsConfig.find((pool) => pool.pid === farm.pid) as NftFarmConfigEntry | undefined
  const totalStaked = farm.totalStaked ?? new BigNumber(0)
  const totalShares = farm.totalShares ?? new BigNumber(0)
  const mainCollectionWeight = config?.mainCollectionWeight ? Number(config.mainCollectionWeight) : 1
  const baseLiquidity = farm.contractAddresses ? totalShares : totalStaked
  const participantThreshold = farm.participantThreshold ?? 0
  const liquidity = new BigNumber(Math.max(participantThreshold, baseLiquidity.toNumber()))
  const tokenPerBlock = farm.tokenPerBlock ? parseFloat(farm.tokenPerBlock) : 0
  const liquidityIsZero = liquidity.lte(0)

  const { cakeRewardsApr, lpRewardsApr } = getNftFarmApr(
    farm.poolWeight ?? new BigNumber(0),
    tokenPerBlock,
    liquidityIsZero ? new BigNumber(1) : liquidity,
    mainCollectionWeight || 1,
  )

  return {
    ...farm,
    apr: farm.isFinished || liquidityIsZero ? 0 : cakeRewardsApr,
    lpRewardsApr: farm.isFinished || liquidityIsZero ? 0 : lpRewardsApr,
    liquidity: totalStaked,
  }
}

const PoolDetailsPage: React.FC<PoolDetailsPageProps> = ({ pid }) => {
  const { t } = useTranslation()
  const { account } = useWeb3React()
  const { data: farms, userDataLoaded } = useFarms()
  const cakePrice = usePriceCakeBusd()

  usePollFarmsWithUserData(false)

  const decoratedFarms = useMemo(
    () => farms.map((farm) => enhanceFarmWithApr(farm)).filter((farm): farm is NftFarmWithStakedValue => Boolean(farm)),
    [farms],
  )

  const selectedFarm = useMemo(
    () => decoratedFarms.find((farm) => farm.pid === pid),
    [decoratedFarms, pid],
  )

  const otherFarms = useMemo(() => {
    return decoratedFarms
      .filter((farm) => farm.pid !== pid && !farm.isFinished)
      .sort((a, b) => Number(a.pid) - Number(b.pid))
  }, [decoratedFarms, pid])

  const selectedConfig = nftFarmsConfig.find((farm) => farm.pid === pid) as NftFarmConfigEntry | undefined
  const bannerImage = selectedConfig?.banner

  const allowedCollections = useMemo(() => {
    if (!selectedConfig) {
      return [] as Array<{ title: string; power?: number; avatar?: string; link: string }>
    }

    const farmAddr137 = selectedConfig.nftAddresses?.[137]?.toLowerCase()
    const firstFarmOfMainNft = (
      farmAddr137
        ? nftFarmsConfig.find((nftFarm) => nftFarm.nftAddresses?.[137]?.toLowerCase() === farmAddr137)
        : undefined
    ) ?? selectedConfig

    const supportedCollectionPids = selectedConfig.supportedCollectionPids
      ? [firstFarmOfMainNft?.pid, ...selectedConfig.supportedCollectionPids].filter(Boolean)
      : [firstFarmOfMainNft?.pid].filter(Boolean)

    const supportedNftStakeFarms = supportedCollectionPids
      .map((collectionPid) => nftFarmsConfig.find((farm) => farm.pid === collectionPid))
      .filter((farm): farm is typeof nftFarmsConfig[number] => Boolean(farm))

    const collectionPowers =
      selectedConfig.collectionPowers ??
      supportedNftStakeFarms.map((collection) => {
        switch (collection.pid) {
          case 1:
            return 1
          case 2:
            return 3
          case 3:
            return 6
          case 4:
            return 12
          default:
            return 15
        }
      })

    let collectBadgeAdded = false

    return supportedNftStakeFarms.map((farm, index) => {
      const dataFromMintingByPid = mintingConfig.find((collection) => collection.stake_pid === farm.pid)
      const farmAddr = farm.nftAddresses?.[137]?.toLowerCase()
      const dataFromMintingByAddress = farmAddr
        ? mintingConfig.find((collection) => collection.address?.toLowerCase() === farmAddr)
        : undefined

      let displayAvatar: string | undefined
      if (farm.pid <= 4) {
        if (!collectBadgeAdded) {
          displayAvatar = '/logo.png'
          collectBadgeAdded = true
        }
      } else {
        displayAvatar = farm.avatar ?? dataFromMintingByPid?.avatar ?? dataFromMintingByAddress?.avatar
      }

      return {
        title: farm.lpSymbol.replace('CoinCollect', ''),
        power: collectionPowers?.[index],
        avatar: displayAvatar ?? dataFromMintingByPid?.avatar ?? dataFromMintingByAddress?.avatar,
        link: farm?.projectLink?.getNftLink ?? farm?.projectLink?.mainLink ?? '/nfts/collections',
      }
    })
  }, [selectedConfig])

  const displayAllowedCollections = useMemo(() => allowedCollections, [allowedCollections])

  const aprDisplay = getDisplayApr(selectedFarm?.apr)
  const totalStakedDisplay = selectedFarm?.liquidity ? selectedFarm.liquidity.toFormat(0) : undefined
  const yourStake = selectedFarm?.userData?.stakedBalance
  const yourStakeDisplay = yourStake ? yourStake.toFormat(0) : undefined

  const heroDescription = useMemo(() => {
    if (!selectedFarm) {
      return ''
    }
    const poolName = selectedFarm.lpSymbol?.replace('CoinCollect', '').trim() || t('this collection')
    const rewardToken = selectedFarm.earningToken?.symbol ?? 'COLLECT'
    const intro = t('Stake %poolName% NFTs to earn %rewardToken%.', { poolName, rewardToken })

    let callout: string
    if (selectedFarm.isFinished) {
      callout = t('Pool has wrapped up—review performance and claim any remaining rewards.')
    } else if (selectedFarm.isCommunity) {
      callout = t('Back community builders and unlock special perks reserved for early supporters.')
    } else if (selectedConfig?.projectLink?.mainLink) {
      callout = t('Secure your spot to unlock partner extras and snapshot-based surprises.')
    } else {
      callout = t('Stake early to maximise your weight and stay eligible for seasonal drops.')
    }

    return `${intro} ${callout}`
  }, [selectedFarm, selectedConfig, t])

  return (
    <Page withMeta={false}>
        <Hero $banner={bannerImage}>
          <HeroTopBar>
            <Heading scale="xl">{selectedFarm?.lpSymbol ?? t('Loading')}</Heading>
            <NextLinkFromReactRouter to="/nftpools">
              <Button variant="secondary" scale="sm">
                {t('Back to Pools')}
              </Button>
            </NextLinkFromReactRouter>
          </HeroTopBar>
        <HeroBadges mt="12px">
          {selectedFarm && (
            <HeroBadge variant={selectedFarm.isCommunity ? 'community' : 'partner'}>
              {selectedFarm.isCommunity ? (
                <CommunityIcon width="16px" color="white" />
              ) : (
                <VerifiedIcon width="16px" color="white" />
              )}
              {selectedFarm.isCommunity ? t('Community') : t('Partner')}
            </HeroBadge>
          )}
          {selectedFarm?.isFinished ? (
            <HeroBadge variant="finished">{t('Finished')}</HeroBadge>
          ) : (
            <HeroBadge variant="live">{t('Live')}</HeroBadge>
          )}
        </HeroBadges>
        {heroDescription && (
          <HeroDescription mt="12px">
            {heroDescription}
          </HeroDescription>
        )}
        <HeroStats>
          <StatTilesWrapper>
            <StatTile $withOverlay={Boolean(bannerImage)}>
              <StatTileHeader>
                <StatIcon>
                  <ChartIcon width="16px" color="white" />
                </StatIcon>
                <Text fontSize="11px" textTransform="uppercase" color="textSubtle">
                  {t('APR')}
                </Text>
              </StatTileHeader>
              {aprDisplay ? (
                <Heading scale="md">{aprDisplay}</Heading>
              ) : (
                <Skeleton width="80px" height="24px" />
              )}
            </StatTile>
            <StatTile $withOverlay={Boolean(bannerImage)}>
              <StatTileHeader>
                <StatIcon>
                  <CurrencyIcon width="16px" color="white" />
                </StatIcon>
                <Text fontSize="11px" textTransform="uppercase" color="textSubtle">
                  {t('Total Staked')}
                </Text>
              </StatTileHeader>
              {totalStakedDisplay ? (
                <Heading scale="md">{totalStakedDisplay}</Heading>
              ) : (
                <Skeleton width="120px" height="24px" />
              )}
            </StatTile>
            <StatTile $withOverlay={Boolean(bannerImage)}>
              <StatTileHeader>
                <StatIcon>
                  <WalletIcon width="16px" color="white" />
                </StatIcon>
                <Text fontSize="11px" textTransform="uppercase" color="textSubtle">
                  {t('Your Stake')}
                </Text>
              </StatTileHeader>
              {account ? (
                userDataLoaded ? (
                  <Heading scale="md">{yourStakeDisplay ?? '0'}</Heading>
                ) : (
                  <Skeleton width="80px" height="24px" />
                )
              ) : (
                <Heading scale="md">—</Heading>
              )}
            </StatTile>
          </StatTilesWrapper>
          {displayAllowedCollections.length > 0 && (
            <AllowedCollectionsWrapper>
              <AllowedCollectionsRow>
                {displayAllowedCollections.map((collection, index) => (
                  <Flex key={`${collection.title}-${index}`} flexDirection="column" alignItems="center" width="72px">
                    <AllowedCollectionDisplay
                      avatar={collection.avatar}
                      title={collection.title}
                      power={collection.power}
                      link={collection.link}
                    />
                    <AllowedCollectionLabel mt="4px">
                      {collection.title}
                    </AllowedCollectionLabel>
                  </Flex>
                ))}
              </AllowedCollectionsRow>
              {displayAllowedCollections.length > 4 && (
                <ScrollHint>
                  <ChevronRightIcon className="scroll-chevron" color="white" width="18px" />
                </ScrollHint>
              )}
            </AllowedCollectionsWrapper>
          )}
        </HeroStats>
      </Hero>

      <Section>
        <SectionHeader>
          <Heading scale="lg">{t('Stake in %symbol%', { symbol: selectedFarm?.lpSymbol ?? '' })}</Heading>
          {selectedConfig?.projectLink?.mainLink && (
            <Button as="a" href={selectedConfig.projectLink.mainLink} target="_blank" rel="noopener noreferrer" variant="secondary">
              {t('Visit Project Site')}
            </Button>
          )}
        </SectionHeader>
        {selectedFarm ? (
          <AnimatedFrame>
            <span className="corner corner--tl" />
            <span className="corner corner--tr" />
            <span className="corner corner--bl" />
            <span className="corner corner--br" />
            <div className="frame-content">
              <FarmCard
                farm={selectedFarm}
                displayApr={aprDisplay ?? ''}
                cakePrice={cakePrice}
                account={account ?? undefined}
                removed={Boolean(selectedFarm.isFinished)}
                variant="expanded"
              />
            </div>
          </AnimatedFrame>
        ) : (
          <Skeleton width="100%" height="320px" />
        )}
      </Section>

      <Section>
        <SectionHeader>
          <Heading scale="lg">{t('Explore other pools')}</Heading>
        </SectionHeader>
        {otherFarms.length ? (
          <FlexLayout>
            {otherFarms.map((farm) => (
              <FarmCard
                key={farm.pid}
                farm={farm}
                displayApr={getDisplayApr(farm.apr) ?? ''}
                cakePrice={cakePrice}
                account={account ?? undefined}
                removed={Boolean(farm.isFinished)}
              />
            ))}
          </FlexLayout>
        ) : (
          <EmptyState>
            <Text color="textSubtle">{t('No other pools found.')}</Text>
          </EmptyState>
        )}
      </Section>
      </Page>
  )
}

export default PoolDetailsPage
