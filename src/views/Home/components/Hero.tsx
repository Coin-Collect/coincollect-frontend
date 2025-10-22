import { useEffect, useMemo, useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { NextLinkFromReactRouter } from 'components/NextLink'
import { Flex, Heading, Button } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'

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

const titleFadeIn = () => keyframes`
  0% {
    opacity: 0;
    transform: translateY(30px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`

const swapIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(65%) scale(0.9);
    filter: blur(8px);
  }
  55% {
    opacity: 1;
    transform: translateY(-12%) scale(1.04);
    filter: blur(0);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`

const BgWrapper = styled.div`
  z-index: 0;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
`

const BackgroundVideo = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: calc(100vh + 56px);
  min-width: 100vw;
  min-height: calc(100vh + 56px);
  object-fit: cover;
  filter: saturate(1.1) brightness(0.85);
  opacity: 0.88;
  
  ${({ theme }) => theme.mediaQueries.nav} {
    height: calc(100vh + 44px);
    min-height: calc(100vh + 44px);
  }
`

const VideoGradientOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: calc(100vh + 56px);
  background:
    linear-gradient(180deg, rgba(10, 8, 20, 0.82) 0%, rgba(10, 8, 20, 0.68) 45%, rgba(9, 7, 15, 0.85) 100%),
    linear-gradient(120deg, rgba(30, 22, 60, 0.35), rgba(15, 10, 25, 0.55));
    
  ${({ theme }) => theme.mediaQueries.nav} {
    height: calc(100vh + 44px);
  }
`

const BunnyWrapper = styled.div`
  width: 100%;
  text-align: center;
  animation: ${flyingAnim} 3.5s ease-in-out infinite;
`

const AnimatedTitle = styled(Heading)`
  animation: ${titleFadeIn} 1.2s ease-out;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;

  ${({ theme }) => theme.mediaQueries.sm} {
    gap: 16px;
  }
`

const WordSlot = styled.span<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  min-width: 0;
  color: ${({ $active }) => ($active ? 'rgba(102, 126, 255, 1)' : '#ffffff')};
  transition: color 0.45s ease, text-shadow 0.45s ease;

  ${({ $active }) =>
    $active
      ? 'text-shadow: 0 4px 12px rgba(0, 0, 0, 0.8), 0 2px 6px rgba(0, 0, 0, 0.9), 0 8px 24px rgba(102, 126, 255, 0.4);'
      : 'text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7), 0 1px 4px rgba(0, 0, 0, 0.8);'}

  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 12%;
    right: 12%;
    height: 3px;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(102, 126, 255, 0.9) 0%, rgba(140, 82, 255, 0.8) 100%);
    opacity: ${({ $active }) => ($active ? 0.95 : 0)};
    transform: scaleX(${({ $active }) => ($active ? 1 : 0.45)});
    filter: blur(${({ $active }) => ($active ? '0px' : '2px')});
    transition: opacity 0.45s ease, transform 0.45s ease, filter 0.45s ease;
    box-shadow: ${({ $active }) => ($active ? '0 0 20px rgba(120, 92, 255, 0.6)' : 'none')};
  }
`

const WordText = styled.span<{ $active: boolean }>`
  display: inline-block;
  font-weight: ${({ $active }) => ($active ? 800 : 700)};
  letter-spacing: 0.02em;
  animation: ${swapIn} 700ms cubic-bezier(0.22, 0.61, 0.36, 1);
  transform-origin: bottom;
  color: ${({ $active }) => ($active ? 'rgba(102, 126, 255, 1)' : '#ffffff')};
  text-shadow: ${({ $active }) =>
    $active 
      ? '0 4px 12px rgba(0, 0, 0, 0.8), 0 2px 6px rgba(0, 0, 0, 0.9), 0 8px 24px rgba(102, 126, 255, 0.4)' 
      : '0 2px 8px rgba(0, 0, 0, 0.7), 0 1px 4px rgba(0, 0, 0, 0.8)'};
`

const Hero = () => {
  const { t } = useTranslation()

  const wordPool = useMemo(
    () => [t('Collect'), t('Stake'), t('Play'), t('Earn'), t('Trade'), t('Build'), t('Quest'), t('Grow')],
    [t],
  )

  const getInitialIndices = (pool: string[]) => {
    const size = pool.length || 1
    return Array.from({ length: 4 }, (_, idx) => idx % size)
  }

  const [slotIndices, setSlotIndices] = useState(() => getInitialIndices(wordPool))
  const [activeWord, setActiveWord] = useState(0)
  const activeWordRef = useRef(activeWord)

  useEffect(() => {
    activeWordRef.current = activeWord
  }, [activeWord])

  useEffect(() => {
    setSlotIndices(getInitialIndices(wordPool))
    setActiveWord(0)
  }, [wordPool])

  useEffect(() => {
    if (!wordPool.length) return undefined

    const interval = window.setInterval(() => {
      setSlotIndices((prev) => {
        const next = [...prev]
        const position = activeWordRef.current
        const poolSize = wordPool.length

        if (poolSize === 0) {
          next[position] = 0
          return next
        }

        let candidate = (next[position] + 1) % poolSize
        let attempts = 0
        while (next.includes(candidate) && attempts < poolSize) {
          candidate = (candidate + 1) % poolSize
          attempts += 1
        }
        next[position] = candidate
        return next
      })

      setActiveWord((prev) => (prev + 1) % 4)
    }, 2400)

    return () => window.clearInterval(interval)
  }, [wordPool])

  const currentWords = useMemo(() => slotIndices.map((index) => wordPool[index] ?? wordPool[0] ?? ''), [slotIndices, wordPool])

  return (
    <>
      <BgWrapper>
        <BackgroundVideo autoPlay loop muted playsInline preload="auto" poster="/wallpaper.jpeg">
          <source src="/wallpaper.webm" type="video/webm" />
        </BackgroundVideo>
        <VideoGradientOverlay />
      </BgWrapper>
      <Flex
        position="relative"
        flexDirection={['column-reverse', null, null, 'row']}
        alignItems={['center', null, null, 'center']}
        justifyContent="center"
        mt={['5px', null, 0]}
        id="homepage-hero"
      >
        <Flex flex="1" flexDirection="column">
          <AnimatedTitle scale="xxl" mb="24px" color="#ffffff">
            {currentWords.map((word, idx) => (
              <WordSlot key={`slot-${idx}`} $active={activeWord === idx}>
                <WordText key={`${idx}-${word}`} $active={activeWord === idx}>
                  {word}
                </WordText>
              </WordSlot>
            ))}
          </AnimatedTitle>
          <Heading scale="md" mb="24px" color="#ffffff" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.7), 0 1px 4px rgba(0, 0, 0, 0.8)' }}>
            {t('Turn your NFTs into real crypto rewards.')}
          </Heading>

          <Flex>
            <NextLinkFromReactRouter to="/nftpools">
              <Button mr="8px" variant="primary">
                {t('✧˖° Explore')}
              </Button>
            </NextLinkFromReactRouter>
            <NextLinkFromReactRouter to="/nfts/collections">
              <Button variant="secondary">{t('Mint NFT')}</Button>
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
            <video autoPlay loop muted playsInline style={{ width: '100%', height: 'auto', marginTop: '0px' }}>
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
