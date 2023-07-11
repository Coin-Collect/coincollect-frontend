import BigNumber from 'bignumber.js'
import { useCallback, useMemo, useState } from 'react'
import { Button, Flex, Modal, Text } from '@pancakeswap/uikit'
import { ModalActions, ModalInput } from 'components/Modal'
import { useTranslation } from 'contexts/Localization'
import { getFullDisplayBalance } from 'utils/formatBalance'
import { RoundedImage } from 'views/Nft/market/Collection/IndividualNFTPage/shared/styles'
import NoNftsImage from 'views/Nft/market/components/Activity/NoNftsImage'
import CircleLoader from 'components/Loader/CircleLoader'
import styled from 'styled-components'
import { useStakedNfts } from 'views/Nft/market/hooks/useStakedNfts'

const NftBox = styled(RoundedImage)`
    border-radius: 6px;
`

const SelectedNftBox = styled(RoundedImage)`
    border-radius: 6px;
    box-shadow: 0 0 10px 4px #e91e63;
`

interface WithdrawModalProps {
  max: BigNumber
  onConfirm: (selectedNftList: { collectionAddress: string; tokenId: number }[]) => void
  onDismiss?: () => void
  tokenName?: string
  pid?: number
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({ onConfirm, onDismiss, max, tokenName = '', pid }) => {
  const [pendingTx, setPendingTx] = useState(false)
  const [selectedNftList, setSelectedNftList] = useState<{ collectionAddress: string; tokenId: number }[]>([]);
  const { t } = useTranslation()
  const fullBalance = useMemo(() => {
    return getFullDisplayBalance(max)
  }, [max])

  const {nfts, isLoading, error} = useStakedNfts(pid)

  const nftList = nfts.map((nft) => {
    const isSelected = selectedNftList.some(
      (selectedNft) =>
        selectedNft.collectionAddress === nft.collectionAddress &&
        selectedNft.tokenId === nft.tokenId
    );
  
    return isSelected ? (
      <SelectedNftBox
        key={nft.tokenId}
        onClick={() => handleSelectNft(nft.collectionAddress, nft.tokenId)}
        src={nft.image}
        height={90}
        width={68}
        m="8px"
      />
    ) : (
      <NftBox
        key={nft.tokenId}
        onClick={() => handleSelectNft(nft.collectionAddress, nft.tokenId)}
        src={nft.image}
        height={90}
        width={68}
        m="8px"
      />
    );
  });

  const handleSelectNft = useCallback((collectionAddress: string, tokenId: number) => {
    const isSelected = selectedNftList.some(
      (selectedNft) =>
        selectedNft.collectionAddress === collectionAddress && selectedNft.tokenId === tokenId
    );
  
    if (isSelected) {
      setSelectedNftList((prevList) =>
        prevList.filter(
          (selectedNft) =>
            selectedNft.collectionAddress !== collectionAddress || selectedNft.tokenId !== tokenId
        )
      );
    } else {
      setSelectedNftList((prevList) => [...prevList, { collectionAddress, tokenId }]);
    }
  }, [selectedNftList, setSelectedNftList]);


  return (
    <Modal title={t('Unstake %nftName%', {nftName: tokenName})} onDismiss={onDismiss}>
      
      {nftList.length === 0 && !isLoading && !error ? (
      <Flex p="24px" flexDirection="column" alignItems="center">
        <NoNftsImage />
        <Text pt="8px" bold>
          {t('No NFTs found')}
        </Text>
      </Flex>
    ) : nftList.length > 0 ? (
      <Flex flexWrap="wrap" justifyContent="space-evenly">
        {nftList}
      </Flex>
    ) : error ? (
      <Flex p="24px" flexDirection="column" alignItems="center">
        <Button variant="light" onClick={onDismiss} width="100%">
          {t('Retry')}
        </Button>
        <Text pt="8px" bold>
          {t('Network error!')}
        </Text>
      </Flex>
    ) : (
      <Flex p="24px" flexDirection="column" alignItems="center">
        <CircleLoader size="30px" />
      </Flex>
    )}
     
      
      <ModalActions>
        <Button variant="secondary" onClick={onDismiss} width="100%" disabled={pendingTx}>
          {t('Cancel')}
        </Button>
        <Button
          width="100%"
          disabled={
            pendingTx || selectedNftList.length == 0
          }
          onClick={async () => {
            setPendingTx(true)
            await onConfirm(selectedNftList)
            onDismiss?.()
            setPendingTx(false)
          }}
        >
          {pendingTx ? t('Confirming') : t('Confirm')}
        </Button>
      </ModalActions>

    </Modal>
  )
}

export default WithdrawModal
