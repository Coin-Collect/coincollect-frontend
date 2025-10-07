import { useMemo } from 'react'
import BigNumber from 'bignumber.js'
import styled, { css } from 'styled-components'
import {
  Breadcrumbs,
  Button,
  Flex,
  Heading,
  Skeleton,
  Tag,
  Text,
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

const AllowedCollectionsRow = styled(Flex)`
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-items: center;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;

  &::-webkit-scrollbar {
    display: none;
  }

  ${({ theme }) => theme.mediaQueries.md} {
    max-width: 360px;
    justify-content: flex-end;
    overflow-x: visible;
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

  ${Button} {
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25);
  }
`

const HeroTags = styled(Flex)`
  flex-wrap: wrap;
  gap: 8px;
  color: white;

  ${Tag} {
    color: white;
    text-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  }
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
  background: ${({ $withOverlay, theme }) => ($withOverlay ? 'rgba(0, 0, 0, 0.32)' : theme.colors.backgroundAlt)};
  border-radius: 14px;
  padding: 12px 14px;
  min-width: calc(50% - 8px);
  flex: 1 1 120px;
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

  const config = nftFarmsConfig.find((pool) => pool.pid === farm.pid)
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

  const selectedConfig = nftFarmsConfig.find((farm) => farm.pid === pid)
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

  const limitedAllowedCollections = useMemo(() => allowedCollections, [allowedCollections])

  const aprDisplay = getDisplayApr(selectedFarm?.apr)
  const totalStakedDisplay = selectedFarm?.liquidity ? selectedFarm.liquidity.toFormat(0) : undefined
  const yourStake = selectedFarm?.userData?.stakedBalance
  const yourStakeDisplay = yourStake ? yourStake.toFormat(0) : undefined

  return (
    <Page>
      <Breadcrumbs mb="24px">
        <NextLinkFromReactRouter to="/nftpools">
          <Text color="primary">{t('NFT Pools')}</Text>
        </NextLinkFromReactRouter>
        {selectedFarm ? <Text>{selectedFarm.lpSymbol}</Text> : <Skeleton width="120px" height="18px" />}
      </Breadcrumbs>

      <Hero $banner={bannerImage}>
        <HeroTopBar>
          <Heading scale="xl">{selectedFarm?.lpSymbol ?? t('Loading')}</Heading>
          <NextLinkFromReactRouter to="/nftpools">
            <Button variant="secondary" scale="sm">
              {t('Back to Pools')}
            </Button>
          </NextLinkFromReactRouter>
        </HeroTopBar>
        <HeroTags mt="12px">
          {selectedFarm?.isCommunity && <Tag outline variant="secondary">{t('Community')}</Tag>}
          {selectedFarm?.isFinished ? (
            <Tag outline variant="text">
              {t('Finished')}
            </Tag>
          ) : (
            <Tag outline variant="success">
              {t('Live')}
            </Tag>
          )}
        </HeroTags>
        <HeroStats>
          <StatTilesWrapper>
            <StatTile $withOverlay={Boolean(bannerImage)}>
              <Text fontSize="11px" textTransform="uppercase" color="textSubtle">
                {t('APR')}
              </Text>
              {aprDisplay ? (
                <Heading scale="md">{aprDisplay}</Heading>
              ) : (
                <Skeleton width="80px" height="24px" />
              )}
            </StatTile>
            <StatTile $withOverlay={Boolean(bannerImage)}>
              <Text fontSize="11px" textTransform="uppercase" color="textSubtle">
                {t('Total Staked')}
              </Text>
              {totalStakedDisplay ? (
                <Heading scale="md">{totalStakedDisplay}</Heading>
              ) : (
                <Skeleton width="120px" height="24px" />
              )}
            </StatTile>
            <StatTile $withOverlay={Boolean(bannerImage)}>
              <Text fontSize="11px" textTransform="uppercase" color="textSubtle">
                {t('Your Stake')}
              </Text>
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
          {limitedAllowedCollections.length > 0 && (
            <AllowedCollectionsRow>
              {limitedAllowedCollections.map((collection, index) => (
                <Flex key={`${collection.title}-${index}`} flexDirection="column" alignItems="center" width="72px">
                  <AllowedCollectionDisplay
                    avatar={collection.avatar}
                    title={collection.title}
                    power={collection.power}
                    link={collection.link}
                  />
                  <Text fontSize="10px" color="textSubtle" mt="4px" textAlign="center" lineHeight="1.2">
                    {collection.title}
                  </Text>
                </Flex>
              ))}
            </AllowedCollectionsRow>
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
          <FarmCard
            farm={selectedFarm}
            displayApr={aprDisplay}
            cakePrice={cakePrice}
            account={account}
            removed={Boolean(selectedFarm.isFinished)}
            variant="expanded"
          />
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
                displayApr={getDisplayApr(farm.apr)}
                cakePrice={cakePrice}
                account={account}
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
