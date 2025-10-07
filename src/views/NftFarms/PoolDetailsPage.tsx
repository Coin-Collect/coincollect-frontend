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
import { getNftFarmApr } from 'utils/apr'
import formatRewardAmount from 'utils/formatRewardAmount'

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

const HeroTopBar = styled(Flex)`
  flex-direction: column;
  gap: 16px;

  ${({ theme }) => theme.mediaQueries.sm} {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`

const HeroTags = styled(Flex)`
  flex-wrap: wrap;
  gap: 8px;
`

const HeroStats = styled(Flex)`
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;

  ${({ theme }) => theme.mediaQueries.md} {
    flex-direction: row;
    gap: 32px;
  }
`

const StatTile = styled.div<{ $withOverlay: boolean }>`
  background: ${({ $withOverlay, theme }) => ($withOverlay ? 'rgba(0, 0, 0, 0.35)' : theme.colors.backgroundAlt)};
  border-radius: 16px;
  padding: 16px 20px;
  min-width: 160px;

  ${({ theme, $withOverlay }) =>
    $withOverlay &&
    css`
      ${theme.mediaQueries.md} {
        backdrop-filter: blur(6px);
      }
    `}
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
      .filter((farm) => farm.pid !== pid)
      .sort((a, b) => Number(a.isFinished) - Number(b.isFinished))
  }, [decoratedFarms, pid])

  const selectedConfig = nftFarmsConfig.find((farm) => farm.pid === pid)
  const bannerImage = selectedConfig?.banner

  const aprDisplay = getDisplayApr(selectedFarm?.apr)
  const totalStakedDisplay = selectedFarm?.liquidity ? selectedFarm.liquidity.toFormat(0) : undefined
  const yourStake = selectedFarm?.userData?.stakedBalance
  const yourStakeDisplay = yourStake ? formatRewardAmount(yourStake) : undefined

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
          <StatTile $withOverlay={Boolean(bannerImage)}>
            <Text fontSize="12px" textTransform="uppercase" color="textSubtle">
              {t('APR')}
            </Text>
            {aprDisplay ? (
              <Heading scale="lg">{aprDisplay}</Heading>
            ) : (
              <Skeleton width="80px" height="24px" />
            )}
          </StatTile>
          <StatTile $withOverlay={Boolean(bannerImage)}>
            <Text fontSize="12px" textTransform="uppercase" color="textSubtle">
              {t('Total Staked')}
            </Text>
            {totalStakedDisplay ? (
              <Heading scale="lg">{totalStakedDisplay}</Heading>
            ) : (
              <Skeleton width="120px" height="24px" />
            )}
          </StatTile>
          <StatTile $withOverlay={Boolean(bannerImage)}>
            <Text fontSize="12px" textTransform="uppercase" color="textSubtle">
              {t('Your Stake')}
            </Text>
            {account ? (
              userDataLoaded ? (
                <Heading scale="lg">{yourStakeDisplay ?? '0'}</Heading>
              ) : (
                <Skeleton width="80px" height="24px" />
              )
            ) : (
              <Heading scale="lg">—</Heading>
            )}
          </StatTile>
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
