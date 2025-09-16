import { Button, Heading, Skeleton, Text } from '@pancakeswap/uikit'
import useWeb3React from 'hooks/useWeb3React'
import BigNumber from 'bignumber.js'
import Balance from 'components/Balance'
import { useTranslation } from 'contexts/Localization'
import { ToastDescriptionWithTx } from 'components/Toast'
import useToast from 'hooks/useToast'
import useCatchTxError from 'hooks/useCatchTxError'
import AnimatedValue from 'components/AnimatedValue'

import { useAppDispatch } from 'state'
import { fetchFarmUserDataAsync } from 'state/farms'
import { usePriceCakeBusd } from 'state/farms/hooks'
import { BIG_ZERO } from 'utils/bigNumber'
import { getBalanceAmount } from 'utils/formatBalance'
import { FarmWithStakedValue } from 'views/Farms/components/FarmCard/FarmCard'
import useHarvestFarm from '../../../hooks/useHarvestFarm'
import { ActionContainer, ActionContent, ActionTitles } from './styles'
import useAnimatedRewardValue from 'hooks/useAnimatedRewardValue'

interface HarvestActionProps extends FarmWithStakedValue {
  userDataReady: boolean
}

const HarvestAction: React.FunctionComponent<HarvestActionProps> = ({ pid, userData, userDataReady }) => {
  const { toastSuccess } = useToast()
  const { fetchWithCatchTxError, loading: pendingTx } = useCatchTxError()
  const earningsBigNumber = new BigNumber(userData.earnings)
  const cakePrice = usePriceCakeBusd()
  const earnings = userDataReady ? getBalanceAmount(earningsBigNumber) : BIG_ZERO
  const { displayValue, baseValue, isAnimating } = useAnimatedRewardValue(earnings, { disabled: !userDataReady })
  const earningsBusd = baseValue.multipliedBy(cakePrice).toNumber()

  const { onReward } = useHarvestFarm(pid)
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { account } = useWeb3React()

  return (
    <ActionContainer>
      <ActionTitles>
        <Text bold textTransform="uppercase" color="secondary" fontSize="12px" pr="4px">
        COLLECT
        </Text>
        <Text bold textTransform="uppercase" color="textSubtle" fontSize="12px">
          {t('Earned')}
        </Text>
      </ActionTitles>
      <ActionContent>
        <div>
          {userDataReady ? (
            <Heading>
              <AnimatedValue $animate={isAnimating}>{displayValue}</AnimatedValue>
            </Heading>
          ) : (
            <Skeleton width={60} />
          )}
          {userDataReady && earningsBusd > 0 && (
            <Balance fontSize="12px" color="textSubtle" decimals={2} value={earningsBusd} unit=" USD" prefix="~" />
          )}
        </div>
        <Button
          disabled={baseValue.eq(0) || pendingTx || !userDataReady}
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
          ml="4px"
        >
          {pendingTx ? t('Harvesting') : t('Harvest')}
        </Button>
      </ActionContent>
    </ActionContainer>
  )
}

export default HarvestAction
