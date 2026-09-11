import { useEffect, useCallback, useState, useMemo, useRef, createContext } from 'react'
import BigNumber from 'bignumber.js'
import useWeb3React from 'hooks/useWeb3React'
import { Heading, RowType, Toggle, Text, Button, ArrowForwardIcon, Flex, Box } from '@pancakeswap/uikit'
import { ChainId } from '@coincollect/sdk'
import styled, { keyframes } from 'styled-components'
import FlexLayout from 'components/Layout/Flex'
import Page from 'components/Layout/Page'
import { useFarms, usePollFarmsWithUserData, usePriceCakeBusd } from 'state/nftFarms/hooks'
import useIntersectionObserver from 'hooks/useIntersectionObserver'
import { DeserializedNftFarm } from 'state/types'
import { useTranslation } from 'contexts/Localization'
import { getBalanceNumber } from 'utils/formatBalance'
import { getNftFarmApr } from 'utils/apr'
import orderBy from 'lodash/orderBy'
import isArchivedPid from 'utils/farmHelpers'
import { latinise } from 'utils/latinise'
import { useUserFarmStakedOnly, useUserFarmsViewMode } from 'state/user/hooks'
import { ViewMode } from 'state/user/actions'
import { useRouter } from 'next/router'
import PageHeader from 'components/PageHeader'
import SearchInput from 'components/SearchInput'
import Select, { OptionProps } from 'components/Select/Select'
import Loading from 'components/Loading'
import { NftFarmWithStakedValue } from './components/FarmCard/FarmCard'
import formatRewardAmount from 'utils/formatRewardAmount'
import Table from './components/FarmTable/FarmTable'
import FarmTabButtons from './components/FarmTabButtons'
import { RowProps } from './components/FarmTable/Row'
import ToggleView from './components/ToggleView/ToggleView'
import { DesktopColumnSchema } from './components/types'
import { getAddress } from 'utils/addressHelpers'
import nftFarmsConfig from 'config/constants/nftFarms'
import { NextLinkFromReactRouter } from 'components/NextLink'
import CommunitySwitch from './components/CommunitySwitch'
import CompetitionBanner from 'views/Home/components/Banners/CompetitionBanner'
import { CommunityCollectionsBanner } from 'views/Home/components/Banners/CommunityCollectionsBanner'

const ControlContainer = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  position: relative;

  justify-content: space-between;
  flex-direction: column;
  margin-bottom: 32px;

  ${({ theme }) => theme.mediaQueries.sm} {
    flex-direction: row;
    flex-wrap: wrap;
    padding: 16px 32px;
    margin-bottom: 0;
  }
`

const ToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-left: 10px;

  ${Text} {
    margin-left: 8px;
  }
`

const LabelWrapper = styled.div`
  > ${Text} {
    font-size: 12px;
  }
`

const FilterContainer = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 0px;

  ${({ theme }) => theme.mediaQueries.sm} {
    width: auto;
    padding: 0;
  }
`

const ViewControls = styled.div`
  flex-wrap: wrap;
  justify-content: space-between;
  display: flex;
  align-items: center;
  width: 100%;

  > div {
    padding: 8px 0px;
  }

  ${({ theme }) => theme.mediaQueries.sm} {
    justify-content: flex-start;
    width: auto;

    > div {
      padding: 0;
    }
  }
`

const emptyStateFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-9px) rotate(2deg); }
`

const emptyStateOrbit = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const emptyStatePulse = keyframes`
  0%, 100% { opacity: 0.42; transform: scale(0.82); }
  50% { opacity: 1; transform: scale(1); }
`

const emptyStateGlow = keyframes`
  0%, 100% { opacity: 0.48; transform: scale(0.96); }
  50% { opacity: 0.8; transform: scale(1.04); }
`

const LivePoolsEmptyState = styled.section`
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(190px, 0.78fr) minmax(0, 1.22fr);
  align-items: center;
  gap: clamp(26px, 5vw, 72px);
  width: min(100%, 960px);
  min-height: 370px;
  margin: 8px auto 12px;
  padding: clamp(28px, 5vw, 56px);
  border: 1px solid rgba(115, 86, 255, 0.2);
  border-radius: 30px;
  background: radial-gradient(circle at 18% 15%, rgba(115, 86, 255, 0.13), transparent 34%),
    radial-gradient(circle at 92% 92%, rgba(255, 183, 78, 0.12), transparent 36%),
    ${({ theme }) => theme.colors.background};
  box-shadow: 0 24px 70px rgba(42, 26, 99, 0.13);

  &::before {
    content: '';
    position: absolute;
    z-index: -1;
    width: 420px;
    height: 420px;
    top: -240px;
    left: -120px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(118, 91, 255, 0.16), transparent 68%);
    animation: ${emptyStateGlow} 8s ease-in-out infinite;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    z-index: -1;
    inset: 0;
    opacity: 0.22;
    background-image: linear-gradient(rgba(126, 103, 210, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(126, 103, 210, 0.08) 1px, transparent 1px);
    background-size: 34px 34px;
    mask-image: linear-gradient(135deg, black, transparent 58%);
    pointer-events: none;
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
    gap: 14px;
    min-height: 0;
    padding: 34px 24px 30px;
    text-align: center;
  }
`

const EmptyStateVisual = styled.div`
  display: grid;
  justify-items: center;
  gap: 18px;
`

const EmptyStateOrb = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  width: min(230px, 62vw);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(118, 91, 255, 0.16), rgba(118, 91, 255, 0.03) 52%, transparent 70%);

  &::before {
    content: '';
    position: absolute;
    inset: 30px;
    border: 1px solid rgba(118, 91, 255, 0.18);
    border-radius: 50%;
    box-shadow: 0 0 0 14px rgba(118, 91, 255, 0.035), 0 0 44px rgba(118, 91, 255, 0.18);
  }
`

const OrbitalRing = styled.div`
  position: absolute;
  inset: 10px;
  border: 1px solid rgba(118, 91, 255, 0.23);
  border-radius: 50%;
  transform: rotate(-18deg);
  animation: ${emptyStateOrbit} 18s linear infinite;

  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #8e79ff;
    box-shadow: 0 0 0 5px rgba(142, 121, 255, 0.12), 0 0 16px rgba(142, 121, 255, 0.55);
  }

  &::before {
    top: 8%;
    right: 10%;
  }

  &::after {
    bottom: 9%;
    left: 8%;
    width: 5px;
    height: 5px;
    background: #ffb64d;
    box-shadow: 0 0 0 5px rgba(255, 182, 77, 0.1), 0 0 15px rgba(255, 182, 77, 0.5);
  }
`

const EmptyStateVideo = styled.video`
  position: relative;
  z-index: 1;
  display: block;
  width: 132px;
  height: 132px;
  object-fit: contain;
  filter: drop-shadow(0 16px 22px rgba(55, 34, 124, 0.24));
  animation: ${emptyStateFloat} 3.8s ease-in-out infinite;
`

const EmptyStateSignal = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 11px;
  border: 1px solid rgba(118, 91, 255, 0.15);
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.textSubtle};
  background: rgba(118, 91, 255, 0.06);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
`

const EmptyStateSignalDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffb64d;
  box-shadow: 0 0 0 4px rgba(255, 182, 77, 0.12);
  animation: ${emptyStatePulse} 2s ease-in-out infinite;
`

const EmptyStateCopy = styled.div`
  max-width: 470px;
`

const EmptyStateEyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
`

const EmptyStateEyebrowDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  box-shadow: 0 0 0 5px rgba(118, 91, 255, 0.1);
  animation: ${emptyStatePulse} 2.2s ease-in-out infinite;
`

const EmptyStateTitle = styled.h2`
  max-width: 410px;
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: clamp(28px, 4vw, 43px);
  font-weight: 800;
  letter-spacing: -0.055em;
  line-height: 1.04;
`

const EmptyStateDescription = styled.p`
  max-width: 420px;
  margin: 18px 0 0;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 15px;
  line-height: 1.65;
`

const EmptyStateLink = styled(NextLinkFromReactRouter)`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-top: 25px;
  padding: 11px 14px 11px 16px;
  border: 1px solid rgba(118, 91, 255, 0.2);
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.primary};
  background: rgba(118, 91, 255, 0.08);
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;

  &:hover {
    border-color: rgba(118, 91, 255, 0.38);
    background: rgba(118, 91, 255, 0.13);
    transform: translateY(-2px);
  }

  span {
    font-size: 17px;
    line-height: 1;
    transition: transform 180ms ease;
  }

  &:hover span {
    transform: translateX(3px);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover,
    &:hover span {
      transform: none;
    }
  }
`

const LivePoolsEmpty = ({ label }: { label: string }) => (
  <LivePoolsEmptyState role="status" aria-live="polite">
    <EmptyStateVisual aria-hidden="true">
      <EmptyStateOrb>
        <OrbitalRing />
        <EmptyStateVideo src="/sheep.webm" autoPlay loop muted playsInline />
      </EmptyStateOrb>
      <EmptyStateSignal>
        <EmptyStateSignalDot />
        {label}
      </EmptyStateSignal>
    </EmptyStateVisual>
    <EmptyStateCopy>
      <EmptyStateEyebrow>
        <EmptyStateEyebrowDot />
        NFT staking · next chapter
      </EmptyStateEyebrow>
      <EmptyStateTitle>New pools are on the way</EmptyStateTitle>
      <EmptyStateDescription>
        There are no live NFT staking pools right now. Keep an eye on this space — the next opportunity will appear here
        soon.
      </EmptyStateDescription>
      <EmptyStateLink to="/nftpools/history">
        Explore finished pools <span aria-hidden="true">→</span>
      </EmptyStateLink>
    </EmptyStateCopy>
  </LivePoolsEmptyState>
)
const NUMBER_OF_FARMS_VISIBLE = 12

export const getDisplayApr = (cakeRewardsApr?: number) => {
  if (cakeRewardsApr === undefined || cakeRewardsApr === null) {
    return null
  }

  return formatRewardAmount(new BigNumber(cakeRewardsApr))
}

const Farms: React.FC = ({ children }) => {
  const { pathname, query: routerQuery } = useRouter()
  const { t } = useTranslation()
  const { data: farmsLP, userDataLoaded } = useFarms()
  const cakePrice = usePriceCakeBusd()
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useUserFarmsViewMode()
  const { account } = useWeb3React()
  const [sortOption, setSortOption] = useState('latest')
  const { observerRef, isIntersecting } = useIntersectionObserver()
  const chosenFarmsLength = useRef(0)

  const isArchived = pathname.includes('archived')
  const isInactive = pathname.includes('history')
  const isActive = !isInactive && !isArchived
  const collectionFilter =
    routerQuery.collection === 'partner' || routerQuery.collection === 'community' ? routerQuery.collection : undefined
  const isPartner = pathname.includes('partner-collections') || collectionFilter === 'partner'
  const isCommunity = pathname.includes('community-collections') || collectionFilter === 'community'

  const matchesCollection = (farm: DeserializedNftFarm) =>
    (!isCommunity && !isPartner) || farm.isCommunity === isCommunity

  usePollFarmsWithUserData(isArchived)

  // Users with no wallet connected should see 0 as Earned amount
  // Connected users should see loading indicator until first userData has loaded
  const userDataReady = !account || (!!account && userDataLoaded)

  const [stakedOnly, setStakedOnly] = useUserFarmStakedOnly(isActive, false)

  const activeFarms = farmsLP.filter(
    (farm) =>
      farm.pid !== 0 &&
      (farm.tokenPerBlock || farm.multiplier !== '0X') &&
      !isArchivedPid(farm.pid) &&
      !farm.isFinished &&
      matchesCollection(farm),
  )

  const inactiveFarms = farmsLP.filter(
    (farm) =>
      farm.pid !== 0 &&
      ((!farm.tokenPerBlock && farm.multiplier === '0X') || farm.isFinished) &&
      !isArchivedPid(farm.pid) &&
      matchesCollection(farm),
  )
  const archivedFarms = farmsLP.filter((farm) => isArchivedPid(farm.pid))

  const stakedOnlyFarms = activeFarms.filter(
    (farm) => farm.userData && new BigNumber(farm.userData.stakedBalance).isGreaterThan(0),
  )

  const stakedInactiveFarms = inactiveFarms.filter(
    (farm) => farm.userData && new BigNumber(farm.userData.stakedBalance).isGreaterThan(0),
  )

  // The Staked only filter should keep a user's finished positions visible on the Live tab.
  const stakedLiveFarms = [...stakedOnlyFarms, ...stakedInactiveFarms]

  const stakedArchivedFarms = archivedFarms.filter(
    (farm) => farm.userData && new BigNumber(farm.userData.stakedBalance).isGreaterThan(0),
  )

  const farmsList = useCallback(
    (farmsToDisplay: DeserializedNftFarm[]): NftFarmWithStakedValue[] => {
      let farmsToDisplayWithAPR: NftFarmWithStakedValue[] = farmsToDisplay.map((farm) => {
        if (!farm.totalStaked) {
          return farm
        }

        // We use staked nft count for regular pools
        const totalStaked = farm.totalStaked
        // We use sum of weights for smart pools
        const totalShares = farm.totalShares
        const mainCollectionWeight = nftFarmsConfig.filter((f) => f.pid == farm.pid)[0]["mainCollectionWeight"]

        const isSmartNftStakePool = Boolean(farm.contractAddresses)
        const totalLiquidityWithThreshold = new BigNumber(Math.max(farm.participantThreshold ?? 0, isSmartNftStakePool ? totalShares.toNumber() : totalStaked.toNumber()))
        const { cakeRewardsApr, lpRewardsApr } = isActive && !farm.isFinished
          ? getNftFarmApr(new BigNumber(farm.poolWeight), farm.tokenPerBlock ? parseFloat(farm.tokenPerBlock) : null, totalLiquidityWithThreshold, mainCollectionWeight)
          : { cakeRewardsApr: 0, lpRewardsApr: 0 }
        return { ...farm, apr: cakeRewardsApr, lpRewardsApr, liquidity: totalStaked }
      })

      if (query) {
        const lowercaseQuery = latinise(query.toLowerCase())
        farmsToDisplayWithAPR = farmsToDisplayWithAPR.filter((farm: NftFarmWithStakedValue) => {
          const farmConfig = nftFarmsConfig.find((configFarm) => configFarm.pid === farm.pid)

          const nameFields = [
            farm.lpSymbol,
            farm.lpSymbol?.replace('CoinCollect', ''),
            farm.earningToken?.symbol,
            ...(farm.sideRewards?.map((reward) => reward.token) ?? []),
          ]

          const aliasAndLinkFields = [
            farmConfig?.lpSymbol,
            farmConfig?.lpSymbol?.replace('CoinCollect', ''),
            farmConfig?.projectLink?.mainLink,
            farmConfig?.projectLink?.getNftLink,
          ]

          const addressFields = [
            getAddress(farm.nftAddresses),
            farm.contractAddresses ? getAddress(farm.contractAddresses) : '',
          ]

          const searchableText = [...nameFields, ...aliasAndLinkFields, ...addressFields]
            .filter(Boolean)
            .map((value) => latinise(String(value).toLowerCase()))
            .join(' ')

          return searchableText.includes(lowercaseQuery)
        })
      }
      return farmsToDisplayWithAPR
    },
    [cakePrice, query, isActive],
  )

  const handleChangeQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value)
  }

  const [numberOfFarmsVisible, setNumberOfFarmsVisible] = useState(NUMBER_OF_FARMS_VISIBLE)

  const chosenFarmsMemoized = useMemo(() => {
    let chosenFarms = []

    const sortFarms = (farms: NftFarmWithStakedValue[]): NftFarmWithStakedValue[] => {
      switch (sortOption) {
        case 'apr':
          return orderBy(farms, (farm: NftFarmWithStakedValue) => farm.apr + farm.lpRewardsApr, 'desc')
        case 'multiplier':
          return orderBy(
            farms,
            (farm: NftFarmWithStakedValue) => (farm.multiplier ? Number(farm.multiplier.slice(0, -1)) : 0),
            'desc',
          )
        case 'earned':
          return orderBy(
            farms,
            (farm: NftFarmWithStakedValue) => (farm.userData ? Number(farm.userData.earnings) : 0),
            'desc',
          )
        case 'liquidity':
          return orderBy(farms, (farm: NftFarmWithStakedValue) => Number(farm.liquidity), 'desc')
        case 'latest':
          return orderBy(farms, (farm: NftFarmWithStakedValue) => Number(farm.pid), 'desc')
        default:
          return farms
      }
    }

    const prioritizeStakedFarms = (farms: NftFarmWithStakedValue[]): NftFarmWithStakedValue[] => {
      if (!account) {
        return farms
      }

      const staked: NftFarmWithStakedValue[] = []
      const unstaked: NftFarmWithStakedValue[] = []

      farms.forEach((farm) => {
        const hasStake = farm.userData && new BigNumber(farm.userData.stakedBalance).isGreaterThan(0)
        if (hasStake) {
          staked.push(farm)
        } else {
          unstaked.push(farm)
        }
      })

      return [...staked, ...unstaked]
    }

    if (isActive) {
      chosenFarms = stakedOnly ? farmsList(stakedLiveFarms) : farmsList(activeFarms)
    }
    if (isInactive) {
      chosenFarms = stakedOnly ? farmsList(stakedInactiveFarms) : farmsList(inactiveFarms)
    }
    if (isArchived) {
      chosenFarms = stakedOnly ? farmsList(stakedArchivedFarms) : farmsList(archivedFarms)
    }

    return prioritizeStakedFarms(sortFarms(chosenFarms)).slice(0, numberOfFarmsVisible)
  }, [
    account,
    sortOption,
    activeFarms,
    farmsList,
    inactiveFarms,
    archivedFarms,
    isActive,
    isInactive,
    isArchived,
    stakedArchivedFarms,
    stakedInactiveFarms,
    stakedOnly,
    stakedOnlyFarms,
    stakedLiveFarms,
    numberOfFarmsVisible,
  ])

  chosenFarmsLength.current = chosenFarmsMemoized.length

  useEffect(() => {
    if (isIntersecting) {
      setNumberOfFarmsVisible((farmsCurrentlyVisible) => {
        if (farmsCurrentlyVisible <= chosenFarmsLength.current) {
          return farmsCurrentlyVisible + NUMBER_OF_FARMS_VISIBLE
        }
        return farmsCurrentlyVisible
      })
    }
  }, [isIntersecting])

  const rowData = chosenFarmsMemoized.map((farm) => {
    const lpLabel = farm.lpSymbol && farm.lpSymbol.toUpperCase().replace('COINCOLLECT', '')

    const row: RowProps = {
      apr: {
        value: getDisplayApr(farm.apr),
        pid: farm.pid,
        multiplier: farm.multiplier,
        lpLabel,
        lpSymbol: farm.lpSymbol,
        cakePrice,
        originalValue: farm.apr,
      },
      farm: {
        label: lpLabel,
        pid: farm.pid,
        nftAddress: getAddress(farm.nftAddresses)
      },
      earned: {
        earnings: getBalanceNumber(new BigNumber(farm.userData.earnings)),
        pid: farm.pid,
      },
      liquidity: {
        liquidity: farm.liquidity,
      },
      multiplier: {
        multiplier: farm.multiplier,
      },
      details: farm,
    }

    return row
  })

  const renderContent = (): JSX.Element => {
    if (viewMode === ViewMode.TABLE && rowData.length) {
      const columnSchema = DesktopColumnSchema

      const columns = columnSchema.map((column) => ({
        id: column.id,
        name: column.name,
        label: column.label,
        sort: (a: RowType<RowProps>, b: RowType<RowProps>) => {
          switch (column.name) {
            case 'farm':
              return b.id - a.id
            case 'apr':
              if (a.original.apr.value && b.original.apr.value) {
                return Number(a.original.apr.value) - Number(b.original.apr.value)
              }

              return 0
            case 'earned':
              return a.original.earned.earnings - b.original.earned.earnings
            default:
              return 1
          }
        },
        sortable: column.sortable,
      }))

      return <Table data={rowData} columns={columns} userDataReady={userDataReady} />
    }

    if (isActive && activeFarms.length === 0 && !query.trim() && !stakedOnly)
      return <LivePoolsEmpty label="Waiting for the next pool" />

    return <FlexLayout>{children}</FlexLayout>
  }

  const handleSortOptionChange = (option: OptionProps): void => {
    setSortOption(option.value)
  }

  return (
    <FarmsContext.Provider value={{ chosenFarmsMemoized }}>
      <PageHeader>
        <Box mb="32px" mt="16px">
          <CommunityCollectionsBanner />
        </Box>
        {/*
        <Heading as="h1" scale="xxl" color="secondary" mb="24px">
          {t('NFT Stake')}
        </Heading>
        <Heading scale="lg" color="text">
          {t('Stake NFT to earn Rewards.')}
        </Heading>
        */}
        {/*<NextLinkFromReactRouter to="/farms/auction" id="lottery-pot-banner">
          <Button p="0" variant="text">
            <Text color="primary" bold fontSize="16px" mr="4px">
              {t('Community Auctions')}
            </Text>
            <ArrowForwardIcon color="primary" />
          </Button>
        </NextLinkFromReactRouter>*/}
        <CommunitySwitch />
      </PageHeader>
      <Page>
        <ControlContainer>
          <ViewControls>
            {/*<ToggleView viewMode={viewMode} onToggle={(mode: ViewMode) => setViewMode(mode)} />*/}
            <ToggleWrapper>
              <Toggle
                id="staked-only-farms"
                checked={stakedOnly}
                onChange={() => setStakedOnly(!stakedOnly)}
                scale="sm"
              />
              <Text> {t('Staked only')}</Text>
            </ToggleWrapper>
            <FarmTabButtons hasStakeInFinishedFarms={stakedInactiveFarms.length > 0} />
          </ViewControls>
          <FilterContainer>
            <LabelWrapper>
              <Text textTransform="uppercase">{t('Sort by')}</Text>
              <Select
                options={[
                  {
                    label: t('Latest'),
                    value: 'latest',
                  },
                  {
                    label: t('Hot'),
                    value: 'hot',
                  },
                  {
                    label: t('APR'),
                    value: 'apr',
                  },
                  {
                    label: t('Multiplier'),
                    value: 'multiplier',
                  },
                  {
                    label: t('Earned'),
                    value: 'earned',
                  },
                  {
                    label: t('Liquidity'),
                    value: 'liquidity',
                  },
                ]}
                onOptionChange={handleSortOptionChange}
              />
            </LabelWrapper>
            <LabelWrapper style={{ marginLeft: 16 }}>
              <Text textTransform="uppercase">{t('Search')}</Text>
              <SearchInput onChange={handleChangeQuery} placeholder="Search Nft Pools" />
            </LabelWrapper>
          </FilterContainer>
        </ControlContainer>
        {renderContent()}
        {account && !userDataLoaded && stakedOnly && (
          <Flex justifyContent="center">
            <Loading />
          </Flex>
        )}
        <div ref={observerRef} />
      </Page>
    </FarmsContext.Provider>
  )
}

export const FarmsContext = createContext({ chosenFarmsMemoized: [] })

export default Farms
