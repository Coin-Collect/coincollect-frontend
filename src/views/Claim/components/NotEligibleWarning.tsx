import { Box, Message, MessageText } from '@pancakeswap/uikit'
import { NextLinkFromReactRouter } from 'components/NextLink'
import { useTranslation } from 'contexts/Localization'
import styled, { keyframes } from 'styled-components'

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.85;
  }
  50% {
    transform: scale(1.04);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.85;
  }
`

const BuyNowLink = styled(NextLinkFromReactRouter)`
  color: ${({ theme }) => theme.colors.failure};
  text-decoration: underline;
  display: inline-block;
  animation: ${pulse} 1.2s ease-in-out infinite;
  font-weight: 700;
`

export function NotEligibleWarning({
  requiredToken,
}) {
  const { t } = useTranslation()

  return (
    <Message variant="warning" mb="0">
      <Box>
        <MessageText>
          {t(`Only ${requiredToken} owners can claim rewards.`)}
        </MessageText>
        <MessageText bold>
          <BuyNowLink to="/nfts/collections">
            {t('Buy Now')} »
          </BuyNowLink>
        </MessageText>
      </Box>
    </Message>
  )
}
