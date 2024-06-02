import BigNumber from 'bignumber.js'
import { useCallback, useMemo, useState } from 'react'
import { Button, Flex, Modal, ModalBody, Text } from '@pancakeswap/uikit'
import { ModalActions, ModalInput } from 'components/Modal'
import { useTranslation } from 'contexts/Localization'
import { getFullDisplayBalance } from 'utils/formatBalance'
import { RoundedImage } from 'views/Nft/market/Collection/IndividualNFTPage/shared/styles'
import NoNftsImage from 'views/Nft/market/components/Activity/NoNftsImage'
import CircleLoader from 'components/Loader/CircleLoader'
import styled from 'styled-components'
import { useStakedNfts } from 'views/Nft/market/hooks/useStakedNfts'
import useTheme from 'hooks/useTheme'

const NftBox = styled(RoundedImage)`
    width: 90px;
    height: 90px;
    border-radius: 6px;
    background-color: #ffffff;
    &:hover {
        border: 2px solid #cac7c8;
    }
`
const SelectedNftBox = styled(RoundedImage)`
    width: 90px;
    height: 90px;
    position: relative;
    border-radius: 6px;
    background-color: #f8bbd0;
    border: 2px solid #e91e63;

    &:after {
        content: '✔';
        position: absolute;
        top: 20%;
        left: 80%;
        transform: translate(-50%, -50%);
        font-size: 15px;
        color: white;
        background: rgba(233, 30, 99, 0.8);
        border-radius: 50%;
        padding: 5px;
    }
`;

const Wrapper = styled(Flex)`
  background: ${props => props.theme.colors.background};
  border-radius: 16px;
  max-height: 400px;
  overflow-y: auto;
  padding: 15px;
`;

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
  const { theme } = useTheme()

  const fullBalance = useMemo(() => {
    return getFullDisplayBalance(max)
  }, [max])

  const { nfts, isLoading, error, revalidateNfts } = useStakedNfts(pid)
  const handleRefresh = () => {
    // Call the revalidateNfts function to trigger SWR to revalidate the data
    revalidateNfts();
  };

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
        width={90}
        m="3px"
      />
    ) : (
      <NftBox
        key={nft.tokenId}
        onClick={() => handleSelectNft(nft.collectionAddress, nft.tokenId)}
        src={nft.image}
        height={90}
        width={90}
        m="3px"
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
    <Modal minWidth="346px" bodyPadding='24px 24px 10px 24px' title={t('Select NFTs to UnStake')} headerBackground={theme.colors.gradients.bubblegum} onDismiss={onDismiss}>
      <ModalBody maxWidth="620px">

        <Wrapper>
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
              <Button variant="light" onClick={handleRefresh} width="100%">
                {t('Retry')}
              </Button>
              <Text pt="8px" fontSize='15px'>
                {t('There was a temporary network issue while fetching NFTs.')}
              </Text>
              <Text pt="8px" fontSize='15px'>
                {t('Please wait a few seconds and press the retry button.')}
              </Text>
            </Flex>
          ) : (
            <Flex p="24px" flexDirection="column" alignItems="center">
              <CircleLoader size="30px" />
              <Text mt={1}>NFTs will be listed shortly...</Text>
            </Flex>
          )}
        </Wrapper>

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
      </ModalBody>
    </Modal>
  )
}

export default WithdrawModal
