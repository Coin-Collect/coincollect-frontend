import type BigNumber from 'bignumber.js'
import { useState } from 'react'
import { useTranslation } from 'contexts/Localization'
import { useStakedNfts } from 'views/Nft/market/hooks/useStakedNfts'
import NftSelectionModal from './NftSelectionModal'

interface WithdrawModalProps {
  max: BigNumber
  onConfirm: (selectedNftList: { collectionAddress: string; tokenId: number }[]) => void
  onDismiss?: () => void
  tokenName?: string
  pid: number
}

export default function WithdrawModal({ onConfirm, onDismiss, tokenName = '', pid }: WithdrawModalProps) {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const [selected, setSelected] = useState<{ collectionAddress: string; tokenId: number }[]>([])
  const { nfts, isLoading, error, revalidateNfts } = useStakedNfts(pid)

  return (
    <NftSelectionModal
      title={t('Select NFTs to UnStake')}
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
      disabled={!selected.length}
      pending={pending}
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
