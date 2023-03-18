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

const StyledColumn = styled(Flex)<{ noMobileBorder?: boolean; noDesktopBorder?: boolean }>`
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
  ${({ noDesktopBorder, theme }) =>
    noDesktopBorder &&
    `${theme.mediaQueries.md} {
           padding: 0;
           border-left: none;
         }
       `}
`

const Grid = styled.div`
  display: grid;
  grid-gap: 16px 8px;
  margin-top: 24px;
  grid-template-columns: repeat(2, auto);
  grid-template-areas:
    'a d'
    'b e'
    'c f';
  ${({ theme }) => theme.mediaQueries.sm} {
    grid-gap: 16px;
  }
  ${({ theme }) => theme.mediaQueries.md} {
    grid-template-areas:
      'a b c'
      'd e f';
    grid-gap: 32px;
    grid-template-columns: repeat(3, auto);
  }
`

const emissionsPerBlock = 1.85
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
  const mcapNumber = mcap.toNumber()
  const mcapString = formatLocalisedCompactNumber(mcap.toNumber())
  const lockedValueDollar = cakePriceBusd.times(tvl).toNumber()
  const circulatingSupply = cakeSupply - tvl

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
      <Flex flexDirection="column" style={{ gridArea: 'a' }}>
        <Text color="textSubtle">{t('Circulating Supply')}</Text>
        {circulatingSupply ? (
          <Balance decimals={0} lineHeight="1.1" fontSize="24px" bold value={circulatingSupply} />
        ) : (
          <Skeleton height={24} width={126} my="4px" />
        )}
      </Flex>
      <StyledColumn noMobileBorder style={{ gridArea: 'b' }}>
        <Text color="textSubtle">{t('Total supply')}</Text>
        {cakeSupply ? (
          <Balance decimals={0} lineHeight="1.1" fontSize="24px" bold value={cakeSupply} />
        ) : (
          <>
            <div ref={observerRef} />
            <Skeleton height={24} width={126} my="4px" />
          </>
        )}
      </StyledColumn>
      <StyledColumn noMobileBorder style={{ gridArea: 'c' }}>
        <Text color="textSubtle">{t('Max Supply')}</Text>

        <Balance decimals={0} lineHeight="1.1" fontSize="24px" bold value={500000000} />
      </StyledColumn>
      <StyledColumn noDesktopBorder style={{ gridArea: 'd' }}>
        <Text color="textSubtle">{t('Market cap')}</Text>
        {mcap?.gt(0) ? (
          <Balance prefix="$" decimals={0} lineHeight="1.1" fontSize="24px" bold value={mcapNumber} />
        ) : (
          <Skeleton height={24} width={126} my="4px" />
        )}
      </StyledColumn>
      <StyledColumn style={{ gridArea: 'e' }}>
        <Text color="textSubtle">{t('Total Value Locked (TVL)')}</Text>
        {tvl ? (
          <Balance prefix="$" decimals={0} lineHeight="1.1" fontSize="24px" bold value={lockedValueDollar} />
        ) : (
          <Skeleton height={24} width={126} my="4px" />
        )}
      </StyledColumn>
      <StyledColumn style={{ gridArea: 'f' }}>
        <Text color="textSubtle">{t('Current emissions')}</Text>

        <Heading scale="lg">{t('%cakeEmissions%/block', { cakeEmissions: emissionsPerBlock })}</Heading>
      </StyledColumn>
    </Grid>
  )
}

export default CakeDataRow
