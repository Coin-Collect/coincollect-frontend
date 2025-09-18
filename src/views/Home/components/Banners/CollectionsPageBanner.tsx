import { useTranslation } from 'contexts/Localization'
import { Button, Text, useMatchBreakpoints } from '@pancakeswap/uikit'
import useWeb3React from 'hooks/useWeb3React'
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

import floatingAsset from 'views/Nft/market/Collections/images/floating-item.png'
import bgDesktop from 'views/Nft/market/Collections/images/bg-desktop.png'
import bgMobile from 'views/Nft/market/Collections/images/bg-mobile.png'
import { NextLinkFromReactRouter } from 'components/NextLink'

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


export const CollectionsPageBanner = () => {
  const { t } = useTranslation()
  const { isMobile, isTablet } = useMatchBreakpoints()
  const { account } = useWeb3React()

  const primaryCtaPath = account ? '/nfts/profile' : '/nftpools/community-collections'
  const primaryCtaLabel = account ? t('Dashboard') : isMobile ? t('Explore') : t('Community Collections')

  const readWhitepaperAction = (
    <NextLinkFromReactRouter to={primaryCtaPath}>
      <Button scale={['xs', 'sm', 'md']}>
        <Text color="white" bold fontSize={["14px", "14px", "16px"]}>
          {primaryCtaLabel}
        </Text>
      </Button>
    </NextLinkFromReactRouter>
  )

  const learnMoreAction = (
    <NextLinkFromReactRouter to='/nftpools'>
      <Button variant='subtle' scale={['xs', 'sm', 'md']}>
        <Text color="black" bold fontSize={["14px", "14px", "16px"]}>
          {isMobile ? t('Stake') : t('Stake NFT')}
        </Text>
      </Button>
    </NextLinkFromReactRouter>
  )

  return (
    <BannerContainer background="radial-gradient(112.67% 197.53% at 30.75% 3.72%, #e91e11 0%, #CCC211 76.19%, #C6A3FF 100%), linear-gradient(180deg, rgba(231, 253, 255, 0.2) 0%, rgba(242, 241, 255, 0.2) 100%)">
      <BannerMain
        badges={<PancakeSwapBadge />}
        title={
          <BannerTitle variant="orange">
            {isMobile || isTablet
              ? t('Stake Community NFTs for free')
              : t('Stake community NFTs for FREE income streams')}
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
