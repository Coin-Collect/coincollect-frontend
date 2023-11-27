import { useEffect } from 'react'
import styled from 'styled-components'
import { Heading, ModalContainer, ModalHeader, ModalTitle, ModalBody, ModalCloseButton, Flex, Text, Button, Skeleton } from '@pancakeswap/uikit'
import { useWeb3React } from '@web3-react/core'
import { useTranslation } from 'contexts/Localization'
import delay from 'lodash/delay'
import confetti from 'canvas-confetti'
import NFTMedia from 'views/Nft/market/components/NFTMedia'
import PreviewImage from 'views/Nft/market/components/CollectibleCard/PreviewImage'
import { useLastMintedNft } from 'state/nftMarket/hooks'


const StyledModal = styled(ModalContainer)`
  position: relative;
  overflow: visible;

  ${({ theme }) => theme.mediaQueries.sm} {
    min-width: 380px;
  }
`

const StyledModalHeader = styled(ModalHeader)`
  background: ${({ theme }) => theme.colors.gradients.cardHeader};
  border-top-right-radius: 32px;
  border-top-left-radius: 32px;
`

const BunnyDecoration = styled.div`
  position: absolute;
  top: -116px; // line up bunny at the top of the modal
  left: 0px;
  text-align: center;
  width: 100%;
`

const showConfetti = () => {
  confetti({
    particleCount: 200,
    startVelocity: 30,
    gravity: 0.5,
    spread: 350,
    origin: {
      x: 0.5,
      y: 0.3,
    },
  })
}

interface NewMintModalProps {
  onDismiss?: () => void,
  collectionAddress: string
}

const NewMintModal: React.FC<NewMintModalProps> = ({ onDismiss, collectionAddress }) => {
  const { t } = useTranslation()
  const { account, chainId } = useWeb3React()
  const { lastMintedNft, isLoading, error, isValidating } = useLastMintedNft(account, collectionAddress, chainId)
  const isNftReady = !isLoading && !error && lastMintedNft && lastMintedNft.length > 0

  const nft = { 'tokenId': 12, 'collectionAddress': "0xA", 'name': isNftReady ? lastMintedNft[0].name : null, 'collectionName': "My Name", 'image': { 'thumbnail': isNftReady ? lastMintedNft[0].image : null } }


  useEffect(() => {
    delay(showConfetti, 100)
  }, [])

  return (
    <StyledModal minWidth="280px">
      <BunnyDecoration>
        <img src="/images/decorations/prize-bunny.png" alt="bunny decoration" height="124px" width="168px" />
      </BunnyDecoration>
      <StyledModalHeader>
        <ModalTitle>
          <Heading>{t('NFT minted successfully!')}</Heading>
        </ModalTitle>
        <ModalCloseButton onDismiss={onDismiss} />
      </StyledModalHeader>
      <ModalBody p="24px">

        {isLoading || isValidating ? (
          <Flex alignItems="center" justifyContent="center">
            <Skeleton height={200} width={200} />
          </Flex>
        ) : (
          <>
            <Flex alignItems="center" justifyContent="center">
              <Text fontSize="14px" color="textSubtle">
                {nft.name}
              </Text>
            </Flex>

            <Flex justifyContent={"center"} alignItems="center" maxWidth={440}>
              <NFTMedia
                style={{ backgroundPosition: "center" }}
                as={PreviewImage}
                nft={nft}
                height={200}
                width={200}
                mt="10px"
                borderRadius="8px"
              />
            </Flex>
          </>
        )}



        <Flex alignItems="center" justifyContent="center">
          <Text mt="8px" mb="10px" fontSize="22px" color='primary' bold>
            {t('What is next?')}
          </Text>
        </Flex>

        <Flex flexDirection="column">
          <Text mb="4px" textAlign={['center', null, 'left']}>
            {t(`1.Mint the next NFT now with a holder discount`)}
          </Text>
          <Text mb="4px" textAlign={['center', null, 'left']}>
            {t(`2.Go to the claim page and redeem your rewards`)}
          </Text>
          <Text mb="4px" textAlign={['center', null, 'left']}>
            {t(`3.Stake your NFT and start earning!`)}
          </Text>
        </Flex>

        <Flex alignItems="center" justifyContent="space-evenly" mt="15px">
          <Button as="a" external href="/claim">
            Claim Rewards
          </Button>
          <Button as="a" external href="/nftpools">
            Stake Now
          </Button>
        </Flex>
      </ModalBody>
    </StyledModal>
  )
}

export default NewMintModal
