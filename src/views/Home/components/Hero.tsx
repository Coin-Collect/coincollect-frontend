import styled, { keyframes } from 'styled-components'
import { NextLinkFromReactRouter } from 'components/NextLink'
import { Flex, Heading, Button } from '@pancakeswap/uikit'
import useWeb3React from 'hooks/useWeb3React'
import { useTranslation } from 'contexts/Localization'
import ConnectWalletButton from 'components/ConnectWalletButton'
import useTheme from 'hooks/useTheme'
import { SlideSvgDark, SlideSvgLight } from './SlideSvg'
import { getSrcSet } from './CompositeImage'

const flyingAnim = () => keyframes`
  from {
    transform: translate(0,  0px);
  }
  50% {
    transform: translate(-5px, -5px);
  }
  to {
    transform: translate(0, 0px);
  }
`


const BgWrapper = styled.div`
  z-index: -1;
  overflow: hidden;
  position: absolute;
  width: 100%;
  height: 100%;
  bottom: 0px;
  left: 0px;
`

const InnerWrapper = styled.div`
  position: absolute;
  width: 100%;
  bottom: -3px;
`

const BunnyWrapper = styled.div`
  width: 100%;
  text-align: center;
  animation: ${flyingAnim} 3.5s ease-in-out infinite;
`


const imagePath = '/images/home/lunar-bunny/'
const imageSrc = 'bunny'


const Hero = () => {
  const { t } = useTranslation()
  const { account } = useWeb3React()
  const { theme } = useTheme()

  return (
    <>
      <BgWrapper>
        <InnerWrapper>{theme.isDark ? <SlideSvgDark width="100%" /> : <SlideSvgLight width="100%" />}</InnerWrapper>
      </BgWrapper>
      <Flex
        position="relative"
        flexDirection={['column-reverse', null, null, 'row']}
        alignItems={['center', null, null, 'center']}
        justifyContent="center"
        mt={['50px', null, 0]}
        id="homepage-hero"
      >

        <Flex flex="1" flexDirection="column">
          <Heading scale="xxl" color="secondary" mb="24px">
            {t('The moon is made of pancakes.')}
          </Heading>
          <Heading scale="md" mb="24px">
            {t('Trade, earn, and win crypto on the most popular decentralized platform in the galaxy.')}
          </Heading>

          <Flex>
            {/*!account && <ConnectWalletButton mr="8px" />*/}

            <NextLinkFromReactRouter to="/nftpools">
              <Button mr="8px" variant='primary'>{t('✧˖° Explore')}</Button>
            </NextLinkFromReactRouter>
            <NextLinkFromReactRouter to="/nfts/collections">
              <Button variant='secondary'>{t('Mint NFT')}</Button>
            </NextLinkFromReactRouter>
          </Flex>
        </Flex>

        <Flex
          height={['100%', null, null, '100%']}
          width={['100%', null, null, '100%']}
          flex={[null, null, null, '1']}
          mb={['24px', null, null, '0']}
          position="relative"
        >
          <BunnyWrapper>
            <video 
              autoPlay 
              loop 
              muted 
              playsInline
              style={{ width: '100%', height: 'auto' }}
            >
              <source src="/sheep.webm" type="video/webm" />
              Your browser does not support the video tag.
            </video>
          </BunnyWrapper>
          
        </Flex>
      </Flex>
    </>
  )
}

export default Hero
