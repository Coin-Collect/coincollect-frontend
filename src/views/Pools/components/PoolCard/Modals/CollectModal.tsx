import { useState } from 'react'
import useWeb3React from 'hooks/useWeb3React'
import {
  Modal,
  Text,
  Button,
  Heading,
  Flex,
  AutoRenewIcon,
  ButtonMenu,
  ButtonMenuItem,
  HelpIcon,
  useTooltip,
} from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import useTheme from 'hooks/useTheme'
import useToast from 'hooks/useToast'
import { ToastDescriptionWithTx } from 'components/Toast'
import { Token } from '@coincollect/sdk'
import { formatNumber } from 'utils/formatBalance'
import useCatchTxError from 'hooks/useCatchTxError'
import { updateUserBalance, updateUserPendingReward, updateUserStakedBalance } from 'state/pools'
import { useAppDispatch } from 'state'
import useHarvestPool from '../../../hooks/useHarvestPool'
import useStakePool from '../../../hooks/useStakePool'

interface CollectModalProps {
  formattedBalance: string
  fullBalance: string
  earningToken: Token
  earningsDollarValue: number
  sousId: number
  isBnbPool: boolean
  isCompoundPool?: boolean
  onDismiss?: () => void
  onTxSuccess?: () => void
}

const CollectModal: React.FC<CollectModalProps> = ({
  formattedBalance,
  fullBalance,
  earningToken,
  earningsDollarValue,
  sousId,
  isBnbPool,
  isCompoundPool = false,
  onDismiss,
  onTxSuccess,
}) => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { toastSuccess } = useToast()
  const { account } = useWeb3React()
  const dispatch = useAppDispatch()
  const { fetchWithCatchTxError, loading: pendingTx } = useCatchTxError()
  const { onReward } = useHarvestPool(sousId, isBnbPool)
  const { onStake } = useStakePool(sousId, isBnbPool)
  const [shouldCompound, setShouldCompound] = useState(isCompoundPool)
  const { targetRef, tooltip, tooltipVisible } = useTooltip(
    <>
      <Text mb="12px">{t('Compound: collect and restake CAKE into pool.')}</Text>
      <Text>{t('Harvest: collect CAKE and send to wallet')}</Text>
    </>,
    { placement: 'bottom-end', tooltipOffset: [20, 10] },
  )

  const handleHarvestConfirm = async () => {
    
    const receipt = await fetchWithCatchTxError(() => {

      // Compound
      if (shouldCompound) {
        return onStake(fullBalance, earningToken.decimals)
      }

      // Harvest
      return onReward()
    })
    if (receipt?.status) {
      if (shouldCompound) {
        toastSuccess(
          `${t('Compounded')}!`,
          <ToastDescriptionWithTx txHash={receipt.transactionHash}>
            {t('Your %symbol% earnings have been re-invested into the pool!', { symbol: earningToken.symbol })}
          </ToastDescriptionWithTx>,
        )
      } else {
        toastSuccess(
          `${t('Harvested')}!`,
          <ToastDescriptionWithTx txHash={receipt.transactionHash}>
            {t('Your %symbol% earnings have been sent to your wallet!', { symbol: earningToken.symbol })}
          </ToastDescriptionWithTx>,
        )
      }
      dispatch(updateUserStakedBalance(sousId, account))
      dispatch(updateUserPendingReward(sousId, account))
      dispatch(updateUserBalance(sousId, account))
      onTxSuccess?.()
      onDismiss?.()
    }
  }

  return (
    <Modal
      title={`${earningToken.symbol} ${isCompoundPool ? t('Collect') : t('Harvest')}`}
      onDismiss={onDismiss}
      headerBackground={theme.colors.gradients.cardHeader}
    >
      {isCompoundPool && (
        <Flex justifyContent="center" alignItems="center" mb="24px">
          <ButtonMenu
            activeIndex={shouldCompound ? 0 : 1}
            scale="sm"
            variant="subtle"
            onItemClick={(index) => setShouldCompound(!index)}
          >
            <ButtonMenuItem as="button">{t('Compound')}</ButtonMenuItem>
            <ButtonMenuItem as="button">{t('Harvest')}</ButtonMenuItem>
          </ButtonMenu>
          <Flex ml="10px" ref={targetRef}>
            <HelpIcon color="textSubtle" />
          </Flex>
          {tooltipVisible && tooltip}
        </Flex>
      )}

      <Flex justifyContent="space-between" alignItems="center" mb="24px">
        <Text>{shouldCompound ? t('Compounding') : t('Harvesting')}:</Text>
        <Flex flexDirection="column">
          <Heading>
            {formattedBalance} {earningToken.symbol}
          </Heading>
          {earningsDollarValue > 0 && (
            <Text fontSize="12px" color="textSubtle">{`~${formatNumber(earningsDollarValue)} USD`}</Text>
          )}
        </Flex>
      </Flex>

      <Button
        mt="8px"
        onClick={handleHarvestConfirm}
        isLoading={pendingTx}
        endIcon={pendingTx ? <AutoRenewIcon spin color="currentColor" /> : null}
      >
        {pendingTx ? t('Confirming') : t('Confirm')}
      </Button>
      <Button variant="text" onClick={onDismiss} pb="0px">
        {t('Close Window')}
      </Button>
    </Modal>
  )
}

export default CollectModal
