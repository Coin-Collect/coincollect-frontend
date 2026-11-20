import { useCallback } from 'react'
import { useTranslation } from 'contexts/Localization'
import useToast from 'hooks/useToast'
import { useCallWithGasPrice } from 'hooks/useCallWithGasPrice'
import useCatchTxError from 'hooks/useCatchTxError'
import { ToastDescriptionWithTx } from 'components/Toast'
import { useCoinCollectClaimRewardContract, useCoinCollectClaimRewardV2Contract } from 'hooks/useContract'

export const useClaimReward = (claimId, nftAddresses, nftIds, rewardToken, version, refresh) => {
  const { toastSuccess } = useToast()
  const { fetchWithCatchTxError, loading: pendingTx } = useCatchTxError()
  const { callWithGasPrice } = useCallWithGasPrice()
  const { t } = useTranslation()
  const legacy = useCoinCollectClaimRewardContract()
  const modern = useCoinCollectClaimRewardV2Contract()
  const claimRewardContract = version == 1 ? legacy : modern

  const handleClaimReward = useCallback(async () => {
    const receipt = await fetchWithCatchTxError(() => {
      return callWithGasPrice(claimRewardContract, 'claimReward', [claimId, nftAddresses, nftIds])
    })
    if (receipt?.status) {
      toastSuccess(
        t('Reward Claimed'),
        <ToastDescriptionWithTx txHash={receipt.transactionHash}>
          {t('Your %symbol% tokens sent to your wallet!', { symbol: rewardToken })}
        </ToastDescriptionWithTx>,
      )
      // Refresh claim data
      refresh()
    }
  }, [
    claimRewardContract,
    claimId,
    nftAddresses,
    nftIds,
    refresh,
    rewardToken,
    t,
    toastSuccess,
    callWithGasPrice,
    fetchWithCatchTxError,
  ])

  return { handleClaimReward, pendingTx }
}

