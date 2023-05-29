import { Box, Message, MessageText } from '@pancakeswap/uikit'
import { NextLinkFromReactRouter } from 'components/NextLink'
import { useTranslation } from 'contexts/Localization'

export function NotEligibleWarning({
  requiredToken,
  nftCount,
  remainingClaims
}) {
  const { t } = useTranslation()

  return (
    <Message variant={nftCount > 0 ? "success" : "warning"} mb="15px">
      <Box>
        <MessageText>
          {nftCount === 0
            ? t(`Only owners of ${ requiredToken }s can claim these rewards.You can immediately purchase an NFT to become eligible for claiming.`)
        : remainingClaims > 0
          ? t(`You have already claimed all your NFTs, but you still have ${remainingClaims} more claim(s) left. You can use your remaining claim(s) by purchasing new NFTs.`)
          : t(`You have reached the claim limit.`)
        }
        </MessageText>
        {remainingClaims > 0 && (
          <MessageText bold>
            <NextLinkFromReactRouter style={{ textDecoration: 'underline' }} to="/nfts/collections">
              {t('Buy Now')} »
            </NextLinkFromReactRouter>
          </MessageText>
        )}
      </Box>
    </Message>
  )
}
