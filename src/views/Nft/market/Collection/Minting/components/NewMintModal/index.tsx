import { useEffect } from 'react'
import styled from 'styled-components'
import { Heading, ModalContainer, ModalHeader, ModalTitle, ModalBody, ModalCloseButton, Flex, Text, Button } from '@pancakeswap/uikit'
import { useWeb3React } from '@web3-react/core'
import { useTranslation } from 'contexts/Localization'
import delay from 'lodash/delay'
import confetti from 'canvas-confetti'
import NFTMedia from 'views/Nft/market/components/NFTMedia'
import PreviewImage from 'views/Nft/market/components/CollectibleCard/PreviewImage'


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

interface ClaimPrizesModalModalProps {
  onDismiss?: () => void
}

const NewMintModal: React.FC<ClaimPrizesModalModalProps> = ({ onDismiss }) => {
  const { t } = useTranslation()
  const { account } = useWeb3React()
  //const { currentLotteryId } = useLottery()
  const nft = { 'tokenId': 12, 'collectionAddress': "0xA", 'name': `#${12}`, 'collectionName': "My Name", 'image': { 'thumbnail': "https://i.seadn.io/gcs/files/b304c520de38cca993b1898db62754b7.png?auto=format&dpr=1&w=1000" }}


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
        <Flex justifyContent={"center"} alignItems="center" maxWidth={440}>
                <NFTMedia style={{ backgroundPosition: "center" }} as={PreviewImage} nft={nft} height={200} width={200} mt="10px" borderRadius="8px" />
        </Flex>


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
        <Button>
          Claim Rewards
        </Button>
        <Button>
          Stake Now
        </Button>
      </Flex>
      </ModalBody>
    </StyledModal>
  )
}

export default NewMintModal
