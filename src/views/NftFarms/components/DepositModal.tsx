import type BigNumber from 'bignumber.js'
import { useState } from 'react'
import { useTranslation } from 'contexts/Localization'
import { useNftsForCollectionAndAddress } from 'views/Nft/market/hooks/useNftsForCollectionAndAddress'
import NftSelectionModal, { NftSelectionLimit } from './NftSelectionModal'

export { NftBox, SelectedNftBox, NftOption, Wrapper, SelectionInfo, SelectionCountChip } from './NftSelectionModal'

interface DepositModalProps {
  max: BigNumber
  stakingLimit: BigNumber
  stakedBalance: BigNumber
  multiplier?: string
  lpPrice: BigNumber
  lpLabel?: string
  onConfirm: (selectedNftList: { collectionAddress: string; tokenId: string }[]) => void
  onDismiss?: () => void
  tokenName?: string
  apr?: number
  displayApr?: string
  addLiquidityUrl?: string
  cakePrice?: BigNumber
  pid: number
}

export default function DepositModal({
  onConfirm,
  onDismiss,
  tokenName = '',
  pid,
  stakingLimit,
  stakedBalance,
}: DepositModalProps) {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const [selected, setSelected] = useState<{ collectionAddress: string; tokenId: string }[]>([])
  const { nfts, isLoading, error, revalidateNfts } = useNftsForCollectionAndAddress(pid)
  const limit = stakingLimit.toNumber()
  const count = stakedBalance.toNumber() + selected.length
  return (
    <NftSelectionModal
      title={t('Select NFTs to Stake')}
      options={nfts.map(({ collectionAddress, tokenId, collectionName, image }) => {
        const isMatch = (nft: (typeof selected)[number]) =>
          nft.collectionAddress === collectionAddress && nft.tokenId === tokenId
        const label = collectionName || tokenName || t('Collection')
        return {
          key: `${collectionAddress}:${tokenId}`,
          label,
          image,
          accessibleLabel: `${label} #${tokenId}`,
          selected: selected.some(isMatch),
          onSelect: () =>
            setSelected((previous) =>
              previous.some(isMatch)
                ? previous.filter((nft) => !isMatch(nft))
                : [...previous, { collectionAddress, tokenId }],
            ),
        }
      })}
      loading={isLoading}
      error={Boolean(error)}
      onRetry={() => void revalidateNfts()}
      onDismiss={onDismiss}
      disabled={!selected.length || (limit > 0 && count > limit)}
      pending={pending}
      before={limit > 0 && <NftSelectionLimit current={count} max={limit} />}
      onConfirm={async () => {
        setPending(true)
        try {
          await onConfirm(selected)
          onDismiss?.()
        } finally {
          setPending(false)
        }
      }}
    />
  )
}
