import { Button, Flex, Heading, Text } from '@pancakeswap/uikit'
import { useWeb3React } from '@web3-react/core'
import BigNumber from 'bignumber.js'
import Balance from 'components/Balance'
import { useTranslation } from 'contexts/Localization'
import { ToastDescriptionWithTx } from 'components/Toast'
import useToast from 'hooks/useToast'
import useCatchTxError from 'hooks/useCatchTxError'

import { useAppDispatch } from 'state'
import { fetchFarmUserDataAsync } from 'state/nftFarms'
import { usePriceCakeBusd } from 'state/nftFarms/hooks'
import { BIG_ZERO } from 'utils/bigNumber'
import { getBalanceAmount } from 'utils/formatBalance'
import useHarvestFarm from '../../hooks/useHarvestFarm'

interface FarmCardActionsProps {
  earnings?: BigNumber
  pid?: number
  earnLabel?: string
  sideRewards?: any
}

const HarvestAction: React.FC<FarmCardActionsProps> = ({ earnings, pid, earnLabel, sideRewards }) => {
  const { account } = useWeb3React()
  const { toastSuccess } = useToast()
  const { fetchWithCatchTxError, loading: pendingTx } = useCatchTxError()
  const { t } = useTranslation()
  const { onReward } = useHarvestFarm(pid)
  const cakePrice = usePriceCakeBusd()
  const dispatch = useAppDispatch()
  const rawEarningsBalance = account ? getBalanceAmount(earnings) : BIG_ZERO
  const displayBalance = rawEarningsBalance.toFixed(6, BigNumber.ROUND_DOWN)
  const earningsBusd = rawEarningsBalance ? rawEarningsBalance.multipliedBy(cakePrice).toNumber() : 0

  return (
    <Flex mb="8px" justifyContent="space-between" alignItems="center">
      <Flex flexDirection="column" alignItems="flex-start">
      {sideRewards.length > 0 ? (
        <Flex justifyContent="space-between">
          <Text mr={10}>{earnLabel}:</Text>
          <Text bold>{displayBalance}</Text>
        </Flex>
      ) : (
        <Heading color={rawEarningsBalance.eq(0) ? 'textDisabled' : 'text'}>
          {displayBalance}
        </Heading>
      )}
        {earningsBusd > 0 && (
          <Balance fontSize="12px" color="textSubtle" decimals={2} value={earningsBusd} unit=" USD" prefix="~" />
        )}
        {sideRewards.map((reward, index) => (
          <Flex key={index} justifyContent="space-between">
            <Text mr={10}>{reward.token}:</Text>
            <Text bold>{(Number(displayBalance) * (reward.percentage / 100)).toFixed(6)}</Text>
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
