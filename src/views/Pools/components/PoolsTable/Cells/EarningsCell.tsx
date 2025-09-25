import styled from 'styled-components'
import { Skeleton, Text, Flex, Box, useModal, useMatchBreakpoints } from '@pancakeswap/uikit'
import { DeserializedPool } from 'state/types'
import BigNumber from 'bignumber.js'
import { PoolCategory } from 'config/constants/types'
import { BIG_ZERO } from 'utils/bigNumber'
import { getBalanceAmount, getFullDisplayBalance } from 'utils/formatBalance'
import { useTranslation } from 'contexts/Localization'
import BaseCell, { CellContent } from './BaseCell'
import CollectModal from '../../PoolCard/Modals/CollectModal'
import AnimatedValue from 'components/AnimatedValue'
import useAnimatedRewardValue from 'hooks/useAnimatedRewardValue'
import formatRewardAmount from 'utils/formatRewardAmount'
import Balance from 'components/Balance'

interface EarningsCellProps {
  pool: DeserializedPool
  account: string
  userDataLoaded: boolean
}

const StyledCell = styled(BaseCell)`
  flex: 4.5;
  ${({ theme }) => theme.mediaQueries.sm} {
    flex: 1 0 120px;
  }
`

const EarningsCell: React.FC<EarningsCellProps> = ({ pool, account, userDataLoaded }) => {
  const { t } = useTranslation()
  const { isMobile } = useMatchBreakpoints()
  const { sousId, earningToken, poolCategory, userData, earningTokenPrice } = pool
  const isManualCakePool = sousId === 0

  const earnings = userData?.pendingReward ? new BigNumber(userData.pendingReward) : BIG_ZERO
  const tokenAmount = getBalanceAmount(earnings, earningToken.decimals)
  const { displayValue, baseValue, isAnimating, collapsedValue } = useAnimatedRewardValue(tokenAmount, {
    disabled: !account || !userDataLoaded,
  })
  const hasEarnings = account && baseValue.gt(0)
  const earningTokenDollarBalance = baseValue.multipliedBy(earningTokenPrice).toNumber()
  const fullBalance = getFullDisplayBalance(earnings, earningToken.decimals)
  const formattedBalance = formatRewardAmount(baseValue)
  const isBnbPool = poolCategory === PoolCategory.BINANCE

  const labelText = t('%asset% Earned', { asset: earningToken.symbol })

  const [onPresentCollect] = useModal(
    <CollectModal
      formattedBalance={formattedBalance}
      fullBalance={fullBalance}
      earningToken={earningToken}
      earningsDollarValue={earningTokenDollarBalance}
      sousId={sousId}
      isBnbPool={isBnbPool}
      isCompoundPool={isManualCakePool}
    />,
  )

  const handleEarningsClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    onPresentCollect()
  }

  return (
    <StyledCell role="cell">
      <CellContent>
        <Text fontSize="12px" color="textSubtle" textAlign="left">
          {labelText}
        </Text>
        {!userDataLoaded && account ? (
          <Skeleton width="80px" height="16px" />
        ) : (
          <>
            <Flex>
              <Box mr="8px" height="32px" onClick={hasEarnings ? handleEarningsClick : undefined}>
                <Text
                  mt="4px"
                  fontWeight={hasEarnings && !isMobile ? 600 : 400}
                  fontSize={isMobile ? '14px' : '16px'}
                  color={hasEarnings ? 'primary' : 'textDisabled'}
                >
                  <AnimatedValue $animate={hasEarnings && isAnimating}>
                    {hasEarnings ? displayValue : collapsedValue}
                  </AnimatedValue>
                </Text>
                {hasEarnings ? (
                  earningTokenPrice > 0 && (
                    <Balance
                      display="inline"
                      fontSize="12px"
                      color="textSubtle"
                      decimals={2}
                      prefix="~"
                      value={earningTokenDollarBalance}
                      unit=" USD"
                    />
                  )
                ) : (
                  <Text mt="4px" fontSize="12px" color="textDisabled">
                    0 USD
                  </Text>
                )}
              </Box>
            </Flex>
          </>
        )}
      </CellContent>
    </StyledCell>
  )
}

export default EarningsCell
