import { useMemo } from 'react'
import BigNumber from 'bignumber.js'
import { AutoRenewIcon, Button, Text, useModal } from '@pancakeswap/uikit'
import { PoolIds } from 'config/constants/types'
import { PublicIfoData, WalletIfoData } from 'views/Nft/market/Collection/Minting/types'
import { useTranslation } from 'contexts/Localization'
import useToast from 'hooks/useToast'
import useCatchTxError from 'hooks/useCatchTxError'
import { ToastDescriptionWithTx } from 'components/Toast'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { parseEther } from '@ethersproject/units'
import NewMintModal from '../../NewMintModal'

interface Props {
  poolId: PoolIds
  publicIfoData: PublicIfoData
  walletIfoData: WalletIfoData
  requiredChainId?: number
}

const networkLabels: Record<number, string> = {
  56: 'BNB Chain',
  97: 'BNB Chain Testnet',
  137: 'Polygon',
  1101: 'Polygon zkEVM',
  8453: 'Base',
}

const ClaimButton: React.FC<Props> = ({ poolId, publicIfoData, walletIfoData, requiredChainId }) => {
  const userPoolCharacteristics = walletIfoData[poolId]
  const { isHolder, discountAmount } = walletIfoData
  const { status, cost, balance } = publicIfoData
  const { t } = useTranslation()
  const { toastSuccess, toastError } = useToast()
  const { fetchWithCatchTxError } = useCatchTxError()
  const { account, chainId } = useActiveWeb3React()
  const [onPresentNewMintModal] = useModal(<NewMintModal collectionAddress={walletIfoData.contract.address} />, false)

  const setPendingTx = (isPending: boolean) => walletIfoData.setPendingTx(isPending, poolId)

  const mintCost = useMemo(() => {
    const price = new BigNumber(cost ?? 0).minus(discountAmount ?? 0)
    return price.isNegative() ? new BigNumber(0) : price
  }, [cost, discountAmount])

  const displayMintCost = useMemo(() => {
    const decimalPlaces = mintCost.decimalPlaces()
    if (decimalPlaces === null) {
      return mintCost.toString()
    }
    const precision = decimalPlaces > 4 ? 4 : decimalPlaces
    return mintCost.toFixed(precision)
  }, [mintCost])

  const needsNetworkSwitch = Boolean(requiredChainId && chainId && requiredChainId !== chainId)
  const requiredNetworkLabel = requiredChainId
    ? networkLabels[requiredChainId] ?? t('the correct network')
    : ''

  const handleClaim = async () => {
    if (needsNetworkSwitch) {
      toastError(
        t('Wrong network'),
        requiredNetworkLabel
          ? t('Minting is only available on %network%. Please switch networks and try again.', {
              network: requiredNetworkLabel,
            })
          : t('Please switch to the supported network before minting.'),
      )
      return
    }

    if (balance >= 2) {
      toastError('Minting Limit Reached', 'Max 2 NFTs per account.')
      return
    }

    if (!walletIfoData?.contract || !account) {
      toastError(t('Error'), t('Wallet connection error. Please reconnect and try again.'))
      return
    }

    try {
      const receipt = await fetchWithCatchTxError(() => {
        setPendingTx(true)
        const value = parseEther(mintCost.toFixed(18))
        return walletIfoData.contract.mint(account, 1, { value })
      })

      if (receipt?.status) {
        walletIfoData.setIsClaimed(poolId)
        toastSuccess(
          t('Success!'),
          <ToastDescriptionWithTx txHash={receipt.transactionHash}>
            {t('You have successfully minted your NFT.')}
          </ToastDescriptionWithTx>,
        )
        onPresentNewMintModal()
      }
    } finally {
      setPendingTx(false)
    }
  }

  return (
    <>
      <Button
        onClick={handleClaim}
        disabled={
          userPoolCharacteristics.isPendingTx ||
          needsNetworkSwitch ||
          (status !== 'live' && !(status === 'coming_soon' && isHolder))
        }
        width="100%"
        isLoading={userPoolCharacteristics.isPendingTx}
        endIcon={userPoolCharacteristics.isPendingTx ? <AutoRenewIcon spin color="currentColor" /> : null}
      >
        {t('Mint for ') + displayMintCost + ' POL'}
      </Button>
      {needsNetworkSwitch && (
        <Text color="failure" mt="8px" textAlign="center" fontSize="14px">
          {requiredNetworkLabel
            ? t('Please switch your wallet network to %network% to mint.', {
                network: requiredNetworkLabel,
              })
            : t('Please switch to the supported network to mint.')}
        </Text>
      )}
    </>
  )
}

export default ClaimButton
