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

interface EarnableTokensModalProps extends InjectedModalProps {
  tokens: RewardToken[]
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

const TokensGrid = styled(Flex)`
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
`

const TokenCard = styled(Flex)`
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  box-shadow: 0 6px 16px rgba(15, 21, 43, 0.16);
  min-width: 120px;
`

const TokenImage = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 10px 20px rgba(15, 21, 43, 0.25);
`

const EarnableTokensModal: React.FC<EarnableTokensModalProps> = ({ tokens, title = 'Earnable Tokens', onDismiss }) => {
  return (
    <StyledModalContainer>
      <ModalHeader>
        <ModalTitle>
          <Heading>{title}</Heading>
        </ModalTitle>
        <ModalCloseButton onDismiss={onDismiss} />
      </ModalHeader>
      <StyledModalBody>
        <Text fontSize="14px" color="textSubtle" textAlign="center">
          Explore the full lineup of tokens you can earn while playing this experience.
        </Text>
        <TokensGrid>
          {tokens.map((token) => (
            <TokenCard key={token.label}>
              <TokenImage src={token.logoSrc} alt={token.label} />
              <Text fontWeight={600}>{token.label}</Text>
            </TokenCard>
          ))}
        </TokensGrid>
      </StyledModalBody>
    </StyledModalContainer>
  )
}

export default EarnableTokensModal
