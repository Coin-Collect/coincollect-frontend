import { Button, Flex, Heading, Text } from '@pancakeswap/uikit'
import useWeb3React from 'hooks/useWeb3React'
import BigNumber from 'bignumber.js'
import Balance from 'components/Balance'
import { useTranslation } from 'contexts/Localization'
import { ToastDescriptionWithTx } from 'components/Toast'
import useToast from 'hooks/useToast'
import useCatchTxError from 'hooks/useCatchTxError'
import AnimatedValue from 'components/AnimatedValue'

import { useAppDispatch } from 'state'
import { fetchFarmUserDataAsync } from 'state/nftFarms'
import { usePriceCakeBusd } from 'state/nftFarms/hooks'
import { BIG_ZERO } from 'utils/bigNumber'
import { getBalanceAmount } from 'utils/formatBalance'
import useHarvestFarm from '../../hooks/useHarvestFarm'
import { Token } from '@coincollect/sdk'
import formatRewardAmount from 'utils/formatRewardAmount'
import useAnimatedRewardValue from 'hooks/useAnimatedRewardValue'

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
  const { displayValue, baseValue, isAnimating } = useAnimatedRewardValue(rawEarningsBalance)
  const earningsBusd = baseValue.multipliedBy(cakePrice).toNumber()

  return (
    <Flex mb="8px" justifyContent="space-between" alignItems="center">
      <Flex flexDirection="column" alignItems="flex-start">
        {sideRewards.length > 0 ? (
          <Flex justifyContent="space-between">
            <Text mr={10}>{earnLabel}:</Text>
            <Text bold>
              <AnimatedValue $animate={isAnimating}>{displayValue}</AnimatedValue>
            </Text>
          </Flex>
        ) : (
          <Heading color={rawEarningsBalance.eq(0) ? 'textDisabled' : 'text'}>
            <AnimatedValue $animate={isAnimating}>{displayValue}</AnimatedValue>
          </Heading>
        )}
        {earningsBusd > 0 && (
          <Balance fontSize="12px" color="textSubtle" decimals={2} value={earningsBusd} unit=" USD" prefix="~" />
        )}
        {sideRewards.map((reward, index) => (
          <Flex key={index} justifyContent="space-between">
            <Text mr={10}>{reward.token}:</Text>
            <Text bold>
              <AnimatedValue $animate={isAnimating}>
                {isAnimating
                  ? baseValue.multipliedBy(reward.percentage).dividedBy(100).toFixed(8, BigNumber.ROUND_DOWN)
                  : formatRewardAmount(baseValue.multipliedBy(reward.percentage).dividedBy(100))}
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
