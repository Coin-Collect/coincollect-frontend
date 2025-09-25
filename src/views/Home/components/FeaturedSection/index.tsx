import { useTranslation } from 'contexts/Localization'
import { ChevronLeftIcon, ChevronRightIcon, Flex, Text } from '@pancakeswap/uikit'
import useTheme from 'hooks/useTheme'
import styled from 'styled-components'
import { useRef, useCallback, useMemo, useEffect, useState } from 'react'
import useWeb3React from 'hooks/useWeb3React'
import BigNumber from 'bignumber.js'
import { useFarms, usePollFarmsWithUserData, usePriceCakeBusd } from 'state/nftFarms/hooks'
import FarmCard from 'views/NftFarms/components/FarmCard/FarmCard'
import { getDisplayApr } from 'views/NftFarms/Farms'
import { getNftFarmApr } from 'utils/apr'
import nftFarmsConfig from 'config/constants/nftFarms'

const CARD_GAP = 16

const CardWrapper = styled.div`
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  border-radius: 24px;
  padding: 0 8px 12px;
  gap: ${CARD_GAP}px;

  &::-webkit-scrollbar {
    display: none;
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }
`

const CardItem = styled.div`
  flex: 0 0 85vw;
  max-width: 320px;
  scroll-snap-align: center;
  scroll-snap-stop: always;
  display: flex;
  justify-content: center;

  & > * {
    width: 100%;
  }

  ${({ theme }) => theme.mediaQueries.sm} {
    flex-basis: 300px;
    max-width: 300px;
  }

  ${({ theme }) => theme.mediaQueries.lg} {
    flex-basis: 360px;
    max-width: 360px;
  }
`
const ArrowWrapper = styled(Flex)`
  display: none;

  ${({ theme }) => theme.mediaQueries.sm} {
    display: flex;
  }
`

const ArrowButton = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  border: 2px solid ${({ theme }) => theme.colors.primary};
  svg path {
    fill: ${({ theme }) => theme.colors.primary};
  }
  cursor: pointer;
`

export const FeaturedSection: React.FC = () => {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const { account } = useWeb3React()
  const { data: farmsData } = useFarms()
  usePollFarmsWithUserData()
  const cakePrice = usePriceCakeBusd()
  const scrollWrapper = useRef<HTMLDivElement>(null)
  const [visiblePids, setVisiblePids] = useState<number[]>([])

  useEffect(() => {
    if (!farmsData || farmsData.length === 0) {
      return
    }

    const activeFarms = farmsData.filter((farm) => !farm.isFinished)
    const poolSource = activeFarms.length > 0 ? activeFarms : farmsData
    const availablePids = poolSource.map((farm) => farm.pid)
    const hasValidSelection =
      visiblePids.length === 6 && visiblePids.every((pid) => availablePids.includes(pid))

    if (hasValidSelection) {
      return
    }

    const shuffled = [...poolSource]
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    const selection = shuffled.slice(0, 6).map((farm) => farm.pid)
    setVisiblePids(selection)
  }, [farmsData, visiblePids])

  const farmCards = useMemo(() => {
    if (!farmsData || visiblePids.length === 0) {
      return []
    }

    return visiblePids
      .map((pid) => farmsData.find((farm) => farm.pid === pid))
      .filter((farm): farm is typeof farmsData[number] => Boolean(farm))
      .map((farm) => {
        const configEntry = nftFarmsConfig.find((configFarm) => configFarm.pid === farm.pid)
        const mainCollectionWeight = configEntry?.mainCollectionWeight ?? 1
        const isSmartNftStakePool = Boolean(farm.contractAddresses)
        const totalStaked = farm.totalStaked ?? new BigNumber(0)
        const totalShares = farm.totalShares ?? new BigNumber(0)
        const rawLiquidity = Math.max(
          farm.participantThreshold ?? 0,
          isSmartNftStakePool ? totalShares.toNumber() : totalStaked.toNumber(),
        )
        const totalLiquidityWithThreshold = new BigNumber(rawLiquidity > 0 ? rawLiquidity : 1)
        const { cakeRewardsApr, lpRewardsApr } = getNftFarmApr(
          new BigNumber(farm.poolWeight),
          farm.tokenPerBlock ? parseFloat(farm.tokenPerBlock) : 0,
          totalLiquidityWithThreshold,
          mainCollectionWeight,
        )

        return {
          ...farm,
          apr: cakeRewardsApr,
          lpRewardsApr,
          liquidity: totalStaked,
        }
      })
  }, [farmsData, visiblePids])

  const onButtonClick = useCallback((scrollTo: 'next' | 'pre') => {
    const scrollTarget = scrollWrapper.current
    if (!scrollTarget) return
    const firstCard = scrollTarget.firstElementChild as HTMLElement | null
    const cardWidth = firstCard ? firstCard.clientWidth : 260
    const scrollAmount = cardWidth + CARD_GAP

    scrollTarget.scrollBy({
      left: scrollTo === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    })
  }, [])
  return (
    <Flex flexDirection="column" style={{ gap: 36 }}>
      <Flex flexDirection="column">
        <Flex justifyContent="center" style={{ gap: 8 }}>
          <Text fontSize={["25px","30px","40px"]} fontWeight={600} textAlign="center">
            {t('Community')}
          </Text>
          <Text fontSize={["25px","30px","40px"]} fontWeight={600} color="secondary" textAlign="center">
            {t('Collections')}
          </Text>
        </Flex>

        <Text textAlign="center" color="textSubtle">
          {t('Stake Your NFTs and Start Earning!')}
        </Text>
      </Flex>
      <Flex>
        <ArrowWrapper alignItems="center" mr="8px">
          <ArrowButton>
            <ChevronLeftIcon onClick={() => onButtonClick('pre')} color={theme.colors.textSubtle} />
          </ArrowButton>
        </ArrowWrapper>
        <CardWrapper ref={scrollWrapper}>
          {farmCards.length > 0 ? (
            farmCards.map((farm) => (
              <CardItem key={farm.pid}>
                <FarmCard
                  farm={farm}
                  displayApr={getDisplayApr(farm.apr)}
                  removed={false}
                  cakePrice={cakePrice}
                  account={account ?? undefined}
                />
              </CardItem>
            ))
          ) : (
            <Flex alignItems="center" justifyContent="center" width="100%">
              <Text color="textSubtle">{t('NFT pools loading...')}</Text>
            </Flex>
          )}
        </CardWrapper>
        <ArrowWrapper alignItems="center" ml="8px">
          <ArrowButton>
            <ChevronRightIcon onClick={() => onButtonClick('next')} color={theme.colors.textSubtle} />
          </ArrowButton>
        </ArrowWrapper>
      </Flex>
    </Flex>
  )
}
