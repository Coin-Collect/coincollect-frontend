import styled, { keyframes } from 'styled-components'
import { Flex, Heading, Text, Button, Box } from '@pancakeswap/uikit'

const waveAnimation = keyframes`
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.8;
  }
  50% {
    transform: translate3d(-4px, -6px, 0) scale(1.03);
    opacity: 1;
  }
  100% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.8;
  }
`

const HeroWrapper = styled(Box)`
  position: relative;
  overflow: hidden;
  border-radius: 32px;
  padding: 40px 32px;
  margin-bottom: 48px;
  min-height: 320px;

  ${({ theme }) => theme.mediaQueries.md} {
    padding: 56px 64px;
    min-height: 380px;
  }

  &:before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(118, 69, 217, 0.75) 0%, rgba(31, 197, 255, 0.45) 50%, rgba(11, 16, 26, 0.85) 100%);
    z-index: 2;
    pointer-events: none;
  }
`

const GlowOrb = styled.div`
  position: absolute;
  top: 18%;
  left: 52%;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0) 70%);
  opacity: 0.3;
  animation: ${waveAnimation} 7s ease-in-out infinite;
  z-index: 2;

  ${({ theme }) => theme.mediaQueries.md} {
    left: 58%;
    top: 12%;
  }
`

const HeroLayout = styled(Flex)`
  position: relative;
  z-index: 3;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 32px;
  height: 100%;
  text-align: center;

  ${({ theme }) => theme.mediaQueries.md} {
    text-align: left;
    align-items: flex-start;
    justify-content: center;
  }
`

const HeroContent = styled(Flex)`
  position: relative;
  z-index: 4;
  flex-direction: column;
  gap: 24px;
  color: ${({ theme }) => theme.colors.contrast};
  width: 100%;
  max-width: 600px;

  ${({ theme }) => theme.mediaQueries.md} {
    max-width: 700px;
  }
`

const HeroTitle = styled(Heading).attrs({ color: 'contrast' })`
  color: #ffffff !important;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(0, 0, 0, 0.4);
`

const HeroDescription = styled(Text)`
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
`

const ButtonRow = styled(Flex)`
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;

  ${({ theme }) => theme.mediaQueries.md} {
    justify-content: flex-start;
  }

  button {
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
`

const HeroVideoBackground = styled.video`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 32px;
  filter: saturate(110%) brightness(0.8);
  z-index: 1;
`

const Hero: React.FC = () => {
  return (
    <HeroWrapper>
      <HeroVideoBackground autoPlay loop muted playsInline preload="auto" aria-hidden="true">
        <source src="/questGalaxy.mp4" type="video/mp4" />
      </HeroVideoBackground>
      <GlowOrb />
      <HeroLayout>
        <HeroContent>
          <HeroTitle scale="xl">Unlock the Future of Play-to-Earn</HeroTitle>
          <HeroDescription fontSize="18px" lineHeight="150%">
            Enter the QuestGalaxy × CoinCollect universe where NFTs aren't just collectibles — they're keys to new worlds. Power up your adventures, claim rewards, and thrive in the COLLECT economy as every quest fuels your journey through the metaverse.
          </HeroDescription>
          <ButtonRow>
            <Button as="a" href="https://ghostalien.questgalaxy.com/" target="_blank" rel="noreferrer" scale="md">
              Play Game
            </Button>
            <Button as="a" href="https://questgalaxy.com/" target="_blank" rel="noreferrer" variant="secondary" scale="md">
              Learn More
            </Button>
          </ButtonRow>
        </HeroContent>
      </HeroLayout>
    </HeroWrapper>
  )
}

export default Hero
