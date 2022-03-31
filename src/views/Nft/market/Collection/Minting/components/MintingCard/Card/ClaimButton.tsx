import { AutoRenewIcon, Button } from '@pancakeswap/uikit'
import { PoolIds } from 'config/constants/types'
import { PublicIfoData, WalletIfoData } from 'views/Nft/market/Collection/Minting/types'
import { useTranslation } from 'contexts/Localization'
import useToast from 'hooks/useToast'
import useCatchTxError from 'hooks/useCatchTxError'
import { ToastDescriptionWithTx } from 'components/Toast'
import useActiveWeb3React from 'hooks/useActiveWeb3React'

interface Props {
  poolId: PoolIds
  ifoVersion: number
  publicIfoData: PublicIfoData
  walletIfoData: WalletIfoData
}

const ClaimButton: React.FC<Props> = ({ poolId, ifoVersion, publicIfoData, walletIfoData }) => {
  const userPoolCharacteristics = walletIfoData[poolId]
  const { status } = publicIfoData
  const { t } = useTranslation()
  const { toastSuccess } = useToast()
  const { fetchWithCatchTxError } = useCatchTxError()
  const { account } = useActiveWeb3React()

  const setPendingTx = (isPending: boolean) => walletIfoData.setPendingTx(isPending, poolId)

  const handleClaim = async () => {

    const receipt = await fetchWithCatchTxError(() => {
      setPendingTx(true)
      return walletIfoData.contract.mint(account, 1)
    })
    if (receipt?.status) {
      walletIfoData.setIsClaimed(poolId)
      toastSuccess(
        t('Success!'),
        <ToastDescriptionWithTx txHash={receipt.transactionHash}>
          {t('You have successfully minted your NFT.')}
        </ToastDescriptionWithTx>,
      )
    }
    setPendingTx(false)

  }

  return (
    <Button
      onClick={handleClaim}
      disabled={userPoolCharacteristics.isPendingTx || status !== 'live'}
      width="100%"
      isLoading={userPoolCharacteristics.isPendingTx}
      endIcon={userPoolCharacteristics.isPendingTx ? <AutoRenewIcon spin color="currentColor" /> : null}
    >
      {t('Mint')}
    </Button>
  )
}

export default ClaimButton
