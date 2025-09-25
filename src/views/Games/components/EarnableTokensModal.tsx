import {
  ModalBody,
  ModalContainer,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
  Heading,
  Text,
  Flex,
  InjectedModalProps,
} from '@pancakeswap/uikit'
import styled from 'styled-components'
import { RewardToken } from '../types'

interface NFTItem {
  name: string
  image: string
  link: string
}

interface EarnableTokensModalProps extends InjectedModalProps {
  tokens: RewardToken[]
  nfts: NFTItem[]
  title?: string
}

const StyledModalContainer = styled(ModalContainer)`
  max-width: 420px;
  width: 100%;
  ${({ theme }) => theme.mediaQueries.md} {
    min-width: 480px;
  }
`

const StyledModalBody = styled(ModalBody)`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const TokensGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
`

const TokenCard = styled(Flex)`
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
  }
`

const TokenImage = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 10px 20px rgba(15, 21, 43, 0.25);
`

const SectionTitle = styled(Heading)`
  font-size: 16px;
  margin-bottom: 12px;
  color: ${({ theme }) => theme.colors.text};
`

const NFTCard = styled(Flex)`
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
  }
`

const NFTImage = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 10px 20px rgba(15, 21, 43, 0.25);
`

const NFTLink = styled.a`
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 100%;
`

const EarnableTokensModal: React.FC<EarnableTokensModalProps> = ({ tokens, nfts = [], title = 'Earnable Rewards', onDismiss }) => {
  const hasTokens = tokens.length > 0
  const hasNfts = nfts.length > 0

  return (
    <StyledModalContainer minWidth="420px">
      <ModalHeader>
        <ModalTitle>
          <Heading>{title}</Heading>
        </ModalTitle>
        <ModalCloseButton onDismiss={onDismiss} />
      </ModalHeader>
      <StyledModalBody>
        <Text fontSize="14px" color="textSubtle" textAlign="center">
          Explore the full lineup of rewards you can earn while playing this experience.
        </Text>
        
        {hasTokens && (
          <>
            <SectionTitle>Tokens</SectionTitle>
            <TokensGrid>
              {tokens.map((token) => (
                <TokenCard key={token.label}>
                  <TokenImage src={token.logoSrc} alt={token.label} />
                  <Text fontWeight={600}>{token.label}</Text>
                </TokenCard>
              ))}
            </TokensGrid>
          </>
        )}
        
        {hasNfts && (
          <>
            <SectionTitle>Usable NFTs in-Game</SectionTitle>
            <TokensGrid>
              {nfts.map((nft) => (
                <NFTCard key={nft.name}>
                  <NFTLink href={nft.link} target="_blank" rel="noopener noreferrer">
                    <NFTImage src={nft.image} alt={nft.name} />
                    <Text fontWeight={600} textAlign="center">{nft.name}</Text>
                  </NFTLink>
                </NFTCard>
              ))}
            </TokensGrid>
          </>
        )}
      </StyledModalBody>
    </StyledModalContainer>
  )
}

export default EarnableTokensModal
