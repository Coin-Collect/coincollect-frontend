import { useEffect, useCallback, useState, useMemo, useRef, createContext } from 'react'
import BigNumber from 'bignumber.js'
import useWeb3React from 'hooks/useWeb3React'
import { Heading, RowType, Toggle, Text, Button, ArrowForwardIcon, Flex, Box } from '@pancakeswap/uikit'
import { ChainId } from '@coincollect/sdk'
import styled from 'styled-components'
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

const StyledVideo = styled.video`
  margin-left: auto;
  margin-right: auto;
  margin-top: 58px;
  border-radius: 16px;
  display: block;
`
const NUMBER_OF_FARMS_VISIBLE = 12

export const getDisplayApr = (cakeRewardsApr?: number) => {
  if (cakeRewardsApr === undefined || cakeRewardsApr === null) {
    return null
  }

  return formatRewardAmount(new BigNumber(cakeRewardsApr))
}

const Farms: React.FC = ({ children }) => {
  const { pathname } = useRouter()
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
  const isPartner = pathname.includes('partner-collections')
  const isCommunity = pathname.includes('community-collections')

  usePollFarmsWithUserData(isArchived)

  // Users with no wallet connected should see 0 as Earned amount
  // Connected users should see loading indicator until first userData has loaded
  const userDataReady = !account || (!!account && userDataLoaded)

  const [stakedOnly, setStakedOnly] = useUserFarmStakedOnly(isActive)

  const activeFarms = farmsLP.filter(
    (farm) =>
      farm.pid !== 0 && (farm.tokenPerBlock || farm.multiplier !== '0X') && !isArchivedPid(farm.pid) && !farm.isFinished && ((!isCommunity && !isPartner) || farm.isCommunity == isCommunity),
  )

  const inactiveFarms = farmsLP.filter((farm) => farm.pid !== 0 && ((!farm.tokenPerBlock && farm.multiplier === '0X') || farm.isFinished) && !isArchivedPid(farm.pid))
  const archivedFarms = farmsLP.filter((farm) => isArchivedPid(farm.pid))

  const stakedOnlyFarms = activeFarms.filter(
    (farm) => farm.userData && new BigNumber(farm.userData.stakedBalance).isGreaterThan(0),
  )

  const stakedInactiveFarms = inactiveFarms.filter(
    (farm) => farm.userData && new BigNumber(farm.userData.stakedBalance).isGreaterThan(0),
  )

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
        const { cakeRewardsApr, lpRewardsApr } = isActive
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
      chosenFarms = stakedOnly ? farmsList(stakedOnlyFarms) : farmsList(activeFarms)
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
        <StyledVideo
          src="/sheep.webm"
          width={120}
          height={103}
          autoPlay
          loop
          muted
          playsInline
        />
      </Page>
    </FarmsContext.Provider>
  )
}

export const FarmsContext = createContext({ chosenFarmsMemoized: [] })

export default Farms
