import { useTranslation } from 'contexts/Localization'
import { useMatchBreakpoints } from '@pancakeswap/uikit'
import {
  BackgroundGraphic,
  BannerActionContainer,
  BannerContainer,
  BannerGraphics,
  BannerMain,
  BannerTitle,
  ButtonLinkAction,
  FloatingGraphic,
  GraphicDetail,
  LinkExternalAction,
  PancakeSwapBadge,
} from 'components/Banner'
import styled from 'styled-components'

import floatingAsset from 'views/Claim/images/floating-item.png'
import bgDesktop from 'views/Claim/images/bg-desktop.png'
import bgMobile from 'views/Claim/images/bg-mobile.png'

const bgSmVariant: GraphicDetail = {
  src: bgMobile.src,
  width: 272,
  height: 224,
}

const bgXsVariant: GraphicDetail = {
  src: bgMobile.src,
  width: 218,
  height: 182,
}

const StyledButtonLinkAction = styled(ButtonLinkAction)`
  height: 33px;
  border-radius: 12px;
  background-color: ${({ theme }) => theme.colors.primary};

  ${({ theme }) => theme.mediaQueries.sm} {
    height: 48px;
    border-radius: 16px;
  }
`

const whitepaperLink =
  '/nftpools'
const learnMoreLink =
  '/nftpools'

export const ClaimPageBanner = () => {
  const { t } = useTranslation()
  const { isMobile, isTablet } = useMatchBreakpoints()

  const readWhitepaperAction = (
    <StyledButtonLinkAction color="white" href={whitepaperLink} padding={['8px 12px']}>
     {isMobile ? t('Explore') : t('Community Collections')}
    </StyledButtonLinkAction>
  )

  const learnMoreAction = (
    <LinkExternalAction fontSize={['14px']} color="black" href={learnMoreLink}>
      {isMobile ? t('Stake') : t('Stake NFT')}
    </LinkExternalAction>
  )

  return (
    <BannerContainer background="radial-gradient(112.67% 197.53% at 30.75% 3.72%, #b3db18 0%, #eaa21c 76.19%, #C6A3FF 100%), linear-gradient(180deg, rgba(231, 253, 255, 0.2) 0%, rgba(242, 241, 255, 0.2) 100%)">
      <BannerMain
        badges={<PancakeSwapBadge />}
        title={
          <BannerTitle variant="purple">
            {isMobile || isTablet
              ? t('Stake Community NFTs for free')
              : t('Stake community NFTs for FREE income streams, participate in our DAO')}
          </BannerTitle>
        }
        actions={
          <BannerActionContainer>
            {readWhitepaperAction}
            {learnMoreAction}
          </BannerActionContainer>
        }
      />
      <BannerGraphics>
        <BackgroundGraphic src={bgDesktop.src} width={468} height={224} sm={bgSmVariant} xs={bgXsVariant} />
        <FloatingGraphic src={floatingAsset.src} width={99} height={99} />
      </BannerGraphics>
    </BannerContainer>
  )
}