import BigNumber from 'bignumber.js'
import { useCallback, useState } from 'react'
import styled from 'styled-components'
import {
  Flex,
  Text,
  Button,
  Modal,
  LinkExternal,
  AutoRenewIcon,
  ModalBody,
  WarningIcon,
  CheckmarkCircleFillIcon,
} from '@pancakeswap/uikit'
import { ModalActions, ModalInput } from 'components/Modal'
import RoiCalculatorModal from 'components/RoiCalculatorModal'
import { useTranslation } from 'contexts/Localization'
import { RoundedImage } from 'views/Nft/market/Collection/IndividualNFTPage/shared/styles'
import { useNftsForCollectionAndAddress } from 'views/Nft/market/hooks/useNftsForCollectionAndAddress'
import CircleLoader from 'components/Loader/CircleLoader'
import NoNftsImage from 'views/Nft/market/components/Activity/NoNftsImage'
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

const NftOption = styled(Flex)`
  width: 96px;
  flex-direction: column;
  align-items: center;
  margin: 4px;
  cursor: pointer;
`;

const Wrapper = styled(Flex)`
  background: ${props => props.theme.colors.background};
  border-radius: 16px;
  max-height: 400px;
  overflow-y: auto;
  padding: 15px;
`;

const SelectionInfo = styled(Flex)<{ $error: boolean }>`
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid ${({ theme, $error }) => ($error ? theme.colors.failure : theme.colors.primaryBright)};
  background: ${({ $error }) =>
    $error
      ? 'linear-gradient(135deg, rgba(237, 75, 158, 0.18) 0%, rgba(237, 75, 158, 0.08) 100%)'
      : 'linear-gradient(135deg, rgba(49, 208, 170, 0.18) 0%, rgba(49, 208, 170, 0.08) 100%)'};
  margin-bottom: 16px;
`;

const SelectionCountChip = styled(Flex)<{ $error: boolean }>`
  align-items: center;
  justify-content: center;
  min-width: 90px;
  padding: 6px 12px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 16px;
  color: ${({ theme, $error }) => ($error ? theme.colors.failure : theme.colors.success)};
  background: ${({ $error }) =>
    $error ? 'rgba(237, 75, 158, 0.12)' : 'rgba(49, 208, 170, 0.12)'};
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

  const stakingLimitNumber = stakingLimit.toNumber()
  const stakedCount = stakedBalance.toNumber()
  const totalSelectedCount = stakedCount + selectedNftList.length
  const remainingSlots = Math.max(stakingLimitNumber - totalSelectedCount, 0)
  const isStakeLimitReached = stakingLimitNumber > 0 && totalSelectedCount > stakingLimitNumber

  

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

    const label = nft.collectionName || tokenName || t('Collection')
    const key = `${nft.collectionAddress}-${nft.tokenId}`

    return (
      <NftOption key={key} onClick={() => handleSelectNft(nft.collectionAddress, nft.tokenId)}>
        {isSelected ? (
          <SelectedNftBox
            src={nft.image}
            height={90}
            width={90}
          />
        ) : (
          <NftBox
            src={nft.image}
            height={90}
            width={90}
          />
        )}
        <Text
          fontSize="11px"
          color="textSubtle"
          mt="6px"
          textAlign="center"
          width="100%"
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={label}
        >
          {label}
        </Text>
      </NftOption>
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
    <Modal minWidth="346px" bodyPadding='24px 24px 10px 24px' title={t('Select NFTs to Stake')} headerBackground={theme.colors.gradients.bubblegum} onDismiss={onDismiss}>
      <ModalBody maxWidth="620px">

        {stakingLimit.gt(0) && (
          <SelectionInfo $error={isStakeLimitReached}>
            <Flex
              alignItems="center"
              justifyContent="space-between"
              width="100%"
              flexWrap="wrap"
              style={{ gap: '12px' }}
            >
              <Flex alignItems="center" style={{ gap: '8px' }}>
                {isStakeLimitReached ? (
                  <WarningIcon width="22px" color="failure" />
                ) : (
                  <CheckmarkCircleFillIcon width="22px" color="success" />
                )}
                <Text fontSize="14px" fontWeight={600} color="textSubtle">
                  {t('Selected NFTs')}
                </Text>
              </Flex>
              <SelectionCountChip $error={isStakeLimitReached}>
                {t('%selectedCount%/%amount%', {
                  selectedCount: totalSelectedCount,
                  amount: stakingLimitNumber,
                })}
              </SelectionCountChip>
            </Flex>
            <Text color={isStakeLimitReached ? 'failure' : 'textSubtle'} fontSize="14px">
              {isStakeLimitReached
                ? t('Stake limit reached! Please remove extra NFTs to proceed.')
                : t('This selection brings you to %total%/%amount%. Slots remaining: %remaining%.', {
                    total: totalSelectedCount,
                    amount: stakingLimitNumber,
                    remaining: remainingSlots,
                  })}
            </Text>
          </SelectionInfo>
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
            <Flex flexWrap="wrap" justifyContent="center">
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
            <Flex p="24px" margin="0 auto" flexDirection="column" alignItems="center">
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
      </ModalBody>
    </Modal>
  )
}

export default DepositModal
