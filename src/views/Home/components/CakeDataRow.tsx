import { Flex, Heading, Skeleton, Text } from '@pancakeswap/uikit'
import Balance from 'components/Balance'
import cakeAbi from 'config/abi/cake.json'
import tokens from 'config/constants/tokens'
import { useTranslation } from 'contexts/Localization'
import useIntersectionObserver from 'hooks/useIntersectionObserver'
import { useSlowRefreshEffect } from 'hooks/useRefreshEffect'
import { useEffect, useState } from 'react'
import { usePriceCakeBusd } from 'state/farms/hooks'
import styled from 'styled-components'
import { getCoinCollectPoolAddress } from 'utils/addressHelpers'
import { formatBigNumber, formatLocalisedCompactNumber } from 'utils/formatBalance'
import { multicallPolygonv2 } from 'utils/multicall'

const StyledColumn = styled(Flex)<{ noMobileBorder?: boolean }>`
  flex-direction: column;
  ${({ noMobileBorder, theme }) =>
    noMobileBorder
      ? `${theme.mediaQueries.md} {
           padding: 0 16px;
           border-left: 1px ${theme.colors.inputSecondary} solid;
         }
       `
      : `border-left: 1px ${theme.colors.inputSecondary} solid;
         padding: 0 8px;
         ${theme.mediaQueries.sm} {
           padding: 0 16px;
         }
       `}
`

const Grid = styled.div`
  display: grid;
  grid-gap: 16px 8px;
  margin-top: 24px;
  grid-template-columns: repeat(2, auto);

  ${({ theme }) => theme.mediaQueries.sm} {
    grid-gap: 16px;
  }

  ${({ theme }) => theme.mediaQueries.md} {
    grid-gap: 32px;
    grid-template-columns: repeat(4, auto);
  }
`

const emissionsPerBlock = 6.8
const collectPoolAddress = getCoinCollectPoolAddress()

const CakeDataRow = () => {
  const { t } = useTranslation()
  const { observerRef, isIntersecting } = useIntersectionObserver()
  const [loadData, setLoadData] = useState(false)
  const [cakeSupply, setCakeSupply] = useState(0)
  const [burnedBalance, setBurnedBalance] = useState(0)
  const [tvl, setTvl] = useState(0)
  const cakePriceBusd = usePriceCakeBusd()
  const mcap = cakePriceBusd.times(cakeSupply)
  const mcapString = formatLocalisedCompactNumber(mcap.toNumber())

  useEffect(() => {
    if (isIntersecting) {
      setLoadData(true)
    }
  }, [isIntersecting])

  useSlowRefreshEffect(() => {
    const fetchTokenData = async () => {
      const totalSupplyCall = { address: tokens.collect.address, name: 'totalSupply' }
      const burnedTokenCall = {
        address: tokens.collect.address,
        name: 'balanceOf',
        params: ['0x000000000000000000000000000000000000dEaD'],
      }
      const tvlTokenCall = {
        address: tokens.collect.address,
        name: 'balanceOf',
        params: [collectPoolAddress],
      }
      const tokenDataResultRaw = await multicallPolygonv2(cakeAbi, [totalSupplyCall, burnedTokenCall, tvlTokenCall], {
        requireSuccess: false,
      })
      const [totalSupply, burned, tvlBalance] = tokenDataResultRaw.flat()
      
      setCakeSupply(totalSupply && burned ? +formatBigNumber(totalSupply.sub(burned)) : 0)
      setBurnedBalance(burned ? +formatBigNumber(burned) : 0)
      setTvl(tvlBalance ? +formatBigNumber(tvlBalance) : 0)
    }


    if (loadData) {
      fetchTokenData()
    }
  }, [loadData])

  return (
    <Grid>
      <Flex flexDirection="column">
        <Text color="textSubtle">{t('Total supply')}</Text>
        {cakeSupply ? (
          <Balance decimals={0} lineHeight="1.1" fontSize="24px" bold value={cakeSupply} />
        ) : (
          <>
            <div ref={observerRef} />
            <Skeleton height={24} width={126} my="4px" />
          </>
        )}
      </Flex>
      <StyledColumn>
        <Text color="textSubtle">{t('Total Value Locked (TVL)')}</Text>
        {tvl ? (
          <Balance decimals={0} lineHeight="1.1" fontSize="24px" bold value={tvl} />
        ) : (
          <Skeleton height={24} width={126} my="4px" />
        )}
      </StyledColumn>
      <StyledColumn noMobileBorder>
        <Text color="textSubtle">{t('Market cap')}</Text>
        {mcap?.gt(0) && mcapString ? (
          <Heading scale="lg">{t('$%marketCap%', { marketCap: mcapString })}</Heading>
        ) : (
          <Skeleton height={24} width={126} my="4px" />
        )}
      </StyledColumn>
      <StyledColumn>
        <Text color="textSubtle">{t('Current emissions')}</Text>

        <Heading scale="lg">{t('%cakeEmissions%/block', { cakeEmissions: emissionsPerBlock })}</Heading>
      </StyledColumn>
    </Grid>
  )
}

export default CakeDataRow
