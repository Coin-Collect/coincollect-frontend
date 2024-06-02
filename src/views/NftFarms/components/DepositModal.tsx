import BigNumber from 'bignumber.js'
import { useCallback, useState } from 'react'
import styled from 'styled-components'
import { Flex, Text, Button, Modal, LinkExternal, AutoRenewIcon, ModalBody } from '@pancakeswap/uikit'
import { ModalActions, ModalInput } from 'components/Modal'
import RoiCalculatorModal from 'components/RoiCalculatorModal'
import { useTranslation } from 'contexts/Localization'
import { RoundedImage } from 'views/Nft/market/Collection/IndividualNFTPage/shared/styles'
import { useNftsForCollectionAndAddress } from 'views/Nft/market/hooks/useNftsForCollectionAndAddress'
import CircleLoader from 'components/Loader/CircleLoader'
import NoNftsImage from 'views/Nft/market/components/Activity/NoNftsImage'
import useTheme from 'hooks/useTheme'


const NftBox = styled(RoundedImage)`
    border-radius: 6px;
    position: relative;
    background-color: #ffffff;
    &:hover {
        border: 2px solid #cac7c8;
    }
`
const SelectedNftBox = styled(RoundedImage)`
    border-radius: 6px;
    background-color: #f8bbd0;
    border: 2px solid #e91e63;
`

const Wrapper = styled(Flex)`
  background: ${props => props.theme.colors.background};
  border-radius: 16px;
  max-height: 400px;
  overflow-y: auto;
  padding: 15px;
`;

interface DepositModalProps {
  max: BigNumber
  stakingLimit: BigNumber
  stakedBalance: BigNumber
  multiplier?: string
  lpPrice: BigNumber
  lpLabel?: string
  onConfirm: (selectedNftList: { collectionAddress: string; tokenId: number }[]) => void
  onDismiss?: () => void
  tokenName?: string
  apr?: number
  displayApr?: string
  addLiquidityUrl?: string
  cakePrice?: BigNumber
  pid?: number
}

const DepositModal: React.FC<DepositModalProps> = ({
  max,
  stakingLimit,
  stakedBalance,
  onConfirm,
  onDismiss,
  tokenName = '',
  multiplier,
  displayApr,
  lpPrice,
  lpLabel,
  apr,
  addLiquidityUrl,
  cakePrice,
  pid,
}) => {
  const [val, setVal] = useState('')
  const [pendingTx, setPendingTx] = useState(false)
  const [selectedNftList, setSelectedNftList] = useState<{ collectionAddress: string; tokenId: number }[]>([]);
  const { t } = useTranslation()
  const { theme } = useTheme()

  const isStakeLimitReached = stakingLimit.toNumber() > 0 && stakedBalance.toNumber() + selectedNftList.length > stakingLimit.toNumber()

  

  const { nfts, isLoading, error, revalidateNfts } = useNftsForCollectionAndAddress(pid)
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
    <Modal title={t('Select NFTs to Stake')} headerBackground={theme.colors.gradients.bubblegum} onDismiss={onDismiss}>
      <ModalBody maxWidth="620px">

        {stakingLimit.gt(0) && (
          <Text color="secondary" bold mb="5px" style={{ textAlign: 'center' }} fontSize="20px">
            {t('Max stake: %amount% NFT', {
              amount: stakingLimit.toNumber(),
              token: lpLabel,
            })}
          </Text>
        )}

        {isStakeLimitReached && (
          <Text color="warning" fontSize="20px" style={{ textAlign: 'center' }} mb="10px">
            {t('Max Stake Limit Reached!')}
          </Text>
        )}

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
            isLoading={pendingTx}
            endIcon={pendingTx ? <AutoRenewIcon spin color="currentColor" /> : null}
            disabled={
              selectedNftList.length === 0 || isStakeLimitReached
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
        <LinkExternal href={addLiquidityUrl} style={{ alignSelf: 'center' }}>
          {t('Get %symbol%', { symbol: tokenName })}
        </LinkExternal>
      </ModalBody>
    </Modal>
  )
}

export default DepositModal
