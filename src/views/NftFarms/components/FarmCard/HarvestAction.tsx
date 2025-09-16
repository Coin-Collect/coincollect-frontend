import { Button, Flex, Heading, Text } from '@pancakeswap/uikit'
import useWeb3React from 'hooks/useWeb3React'
import BigNumber from 'bignumber.js'
import Balance from 'components/Balance'
import { useTranslation } from 'contexts/Localization'
import { ToastDescriptionWithTx } from 'components/Toast'
import useToast from 'hooks/useToast'
import useCatchTxError from 'hooks/useCatchTxError'
import styled, { css, keyframes } from 'styled-components'
import { useEffect, useRef, useState } from 'react'

import { useAppDispatch } from 'state'
import { fetchFarmUserDataAsync } from 'state/nftFarms'
import { usePriceCakeBusd } from 'state/nftFarms/hooks'
import { BIG_ZERO } from 'utils/bigNumber'
import { getBalanceAmount } from 'utils/formatBalance'
import useHarvestFarm from '../../hooks/useHarvestFarm'
import { Token } from '@coincollect/sdk'
import formatRewardAmount from 'views/NftFarms/utils/formatRewardAmount'

const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  20% {
    transform: scale(1.18);
  }
  60% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`

const AnimatedValue = styled.span<{ $animate: boolean }>`
  display: inline-block;
  font-variant-numeric: tabular-nums;
  transition: transform 0.2s ease;
  ${({ $animate }) =>
    $animate &&
    css`
      animation: ${pulse} 1s ease;
    `}
`

interface FarmCardActionsProps {
  earnings?: BigNumber
  pid?: number
  earnLabel?: string
  sideRewards?: any
  earningToken?: Token
}

const HarvestAction: React.FC<FarmCardActionsProps> = ({ earnings, pid, earnLabel, sideRewards, earningToken }) => {
  const { account } = useWeb3React()
  const { toastSuccess } = useToast()
  const { fetchWithCatchTxError, loading: pendingTx } = useCatchTxError()
  const { t } = useTranslation()
  const { onReward } = useHarvestFarm(pid)
  const cakePrice = usePriceCakeBusd()
  const dispatch = useAppDispatch()
  const rawEarningsBalance = account ? getBalanceAmount(earnings, earningToken?.decimals) : BIG_ZERO
  const [animateValue, setAnimateValue] = useState(false)
  const [animatedAmount, setAnimatedAmount] = useState<BigNumber>(rawEarningsBalance)
  const previousBalanceValueRef = useRef<BigNumber>(rawEarningsBalance)
  const animationFrameRef = useRef<number | null>(null)
  const earningsKey = rawEarningsBalance.toFixed(18)
  const animationDuration = 1000

  useEffect(() => {
    const previousValue = previousBalanceValueRef.current

    if (!previousValue) {
      previousBalanceValueRef.current = rawEarningsBalance
      setAnimatedAmount(rawEarningsBalance)
      return
    }

    if (rawEarningsBalance.eq(previousValue)) {
      return
    }

    setAnimateValue(true)

    const startValue = animateValue ? animatedAmount : previousValue
    const endValue = rawEarningsBalance
    const startTime = performance.now()

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    previousBalanceValueRef.current = startValue

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / animationDuration, 1)
      const currentValue = startValue.plus(endValue.minus(startValue).multipliedBy(progress))
      setAnimatedAmount(currentValue)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick)
      } else {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        animationFrameRef.current = null
        previousBalanceValueRef.current = endValue
        setAnimateValue(false)
      }
    }

    animationFrameRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [earningsKey])

  useEffect(() => {
    if (!animateValue) {
      setAnimatedAmount(rawEarningsBalance)
      previousBalanceValueRef.current = rawEarningsBalance
    }
  }, [animateValue, rawEarningsBalance])

  const collapsedDisplay = formatRewardAmount(rawEarningsBalance)
  const expandedDisplay = animatedAmount.toFixed(8, BigNumber.ROUND_DOWN)
  const rewardBaseAmount = animateValue ? animatedAmount : rawEarningsBalance
  const displayBalance = animateValue ? expandedDisplay : collapsedDisplay
  const earningsBusd = rewardBaseAmount.multipliedBy(cakePrice).toNumber()

  return (
    <Flex mb="8px" justifyContent="space-between" alignItems="center">
      <Flex flexDirection="column" alignItems="flex-start">
      {sideRewards.length > 0 ? (
        <Flex justifyContent="space-between">
          <Text mr={10}>{earnLabel}:</Text>
          <Text bold>
            <AnimatedValue $animate={animateValue}>{displayBalance}</AnimatedValue>
          </Text>
        </Flex>
      ) : (
        <Heading color={rawEarningsBalance.eq(0) ? 'textDisabled' : 'text'}>
          <AnimatedValue $animate={animateValue}>{displayBalance}</AnimatedValue>
        </Heading>
      )}
        {earningsBusd > 0 && (
          <Balance fontSize="12px" color="textSubtle" decimals={2} value={earningsBusd} unit=" USD" prefix="~" />
        )}
        {sideRewards.map((reward, index) => (
          <Flex key={index} justifyContent="space-between">
            <Text mr={10}>{reward.token}:</Text>
            <Text bold>
              <AnimatedValue $animate={animateValue}>
                {animateValue
                  ? rewardBaseAmount.multipliedBy(reward.percentage).dividedBy(100).toFixed(8, BigNumber.ROUND_DOWN)
                  : formatRewardAmount(rewardBaseAmount.multipliedBy(reward.percentage).dividedBy(100))}
              </AnimatedValue>
            </Text>
          </Flex>
        ))}
      </Flex>
      <Button
        disabled={rawEarningsBalance.eq(0) || pendingTx}
        onClick={async () => {
          const receipt = await fetchWithCatchTxError(() => {
            return onReward()
          })
          if (receipt?.status) {
            toastSuccess(
              `${t('Harvested')}!`,
              <ToastDescriptionWithTx txHash={receipt.transactionHash}>
                {t('Your %symbol% earnings have been sent to your wallet!', { symbol: 'COLLECT' })}
              </ToastDescriptionWithTx>,
            )
            dispatch(fetchFarmUserDataAsync({ account, pids: [pid] }))
          }
        }}
      >
        {pendingTx ? t('Harvesting') : t('Harvest')}
      </Button>
    </Flex>
  )
}

export default HarvestAction
