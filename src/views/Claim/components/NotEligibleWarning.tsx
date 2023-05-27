import { Box, Message, MessageText } from '@pancakeswap/uikit'
import { NextLinkFromReactRouter } from 'components/NextLink'
import { useTranslation } from 'contexts/Localization'

export function NotEligibleWarning({
  requiredToken,
  nftCount
}) {
  const { t } = useTranslation()
  
  return (
    <Message variant={nftCount > 0 ? "success" : "warning"} mb="15px">
      <Box>
      <MessageText>
    {nftCount > 0
    ? t('Your NFTs have already been claimed. You can purchase more NFTs to earn additional claiming rights.')
    : t(`Only owners of ${requiredToken}s can claim these rewards. You can immediately purchase an NFT to become eligible for claiming.`)
    }
    </MessageText>
          <MessageText bold>
              <NextLinkFromReactRouter style={{ textDecoration: 'underline' }} to="/nfts/collections">
                {t('Buy Now')} »
              </NextLinkFromReactRouter>
          </MessageText>
      </Box>
    </Message>
  )
}
