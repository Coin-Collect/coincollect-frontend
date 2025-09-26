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
  padding: 56px 32px;
  margin-bottom: 48px;
  background: radial-gradient(circle at 20% 20%, rgba(118, 69, 217, 0.35) 0%, rgba(22, 12, 52, 0.7) 45%, rgba(11, 16, 26, 0.95) 100%),
    linear-gradient(135deg, rgba(118, 69, 217, 0.75) 0%, rgba(31, 197, 255, 0.65) 80%);

  ${({ theme }) => theme.mediaQueries.md} {
    padding: 72px 64px;
  }

  &:before,
  &:after {
    content: '';
    position: absolute;
    border-radius: 50%;
    filter: blur(0px);
  }

  &:before {
    top: -120px;
    right: -80px;
    width: 260px;
    height: 260px;
    background: rgba(31, 197, 255, 0.6);
    opacity: 0.6;
  }

  &:after {
    bottom: -140px;
    left: -100px;
    width: 320px;
    height: 320px;
    background: rgba(118, 69, 217, 0.55);
    opacity: 0.7;
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
  opacity: 0.5;
  animation: ${waveAnimation} 7s ease-in-out infinite;

  ${({ theme }) => theme.mediaQueries.md} {
    left: 58%;
    top: 12%;
  }
`

const HeroLayout = styled(Flex)`
  flex-direction: column;
  justify-content: space-between;
  align-items: stretch;
  gap: 32px;

  ${({ theme }) => theme.mediaQueries.md} {
    flex-direction: row;
    gap: 48px;
  }
`

const HeroContent = styled(Flex)`
  position: relative;
  z-index: 1;
  flex-direction: column;
  gap: 24px;
  color: ${({ theme }) => theme.colors.contrast};

  ${({ theme }) => theme.mediaQueries.md} {
    max-width: 520px;
  }
`

const HeroTitle = styled(Heading).attrs({ color: 'contrast' })`
  color: #ffffff !important;
`

const HeroDescription = styled(Text)`
  color: rgba(255, 255, 255, 0.92);
`

const HeroVisual = styled(Box)`
  position: relative;
  z-index: 1;
  margin-top: 32px;
  width: 100%;
  max-width: 420px;
  align-self: center;

  ${({ theme }) => theme.mediaQueries.md} {
    margin-top: 0;
    align-self: flex-end;
  }
`

const ButtonRow = styled(Flex)`
  flex-wrap: wrap;
  gap: 16px;
`

const VisualPanel = styled.div`
  width: 100%;
  padding-top: 70%;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 100%);
  border: 1px solid rgba(255, 255, 255, 0.24);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 42px rgba(15, 20, 36, 0.55);
  position: relative;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(118, 69, 217, 0.28) 0%, rgba(10, 14, 26, 0.7) 100%);
    opacity: 0.65;
    z-index: 1;
    pointer-events: none;
  }

  &:after {
    content: '';
    position: absolute;
    inset: 12px;
    border-radius: 20px;
    background: linear-gradient(135deg, rgba(31, 197, 255, 0.35) 0%, rgba(118, 69, 217, 0.28) 45%, rgba(66, 32, 115, 0.35) 100%);
    opacity: 0.5;
    z-index: 1;
    pointer-events: none;
  }
`

const VideoBackground = styled.video`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 24px;
  filter: saturate(110%);
  z-index: 0;
`

const Hero: React.FC = () => {
  return (
    <HeroWrapper>
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
        <HeroVisual>
          <VisualPanel>
            <VideoBackground autoPlay loop muted playsInline preload="auto" aria-hidden="true">
              <source src="/questGalaxy.mp4" type="video/mp4" />
            </VideoBackground>
          </VisualPanel>
        </HeroVisual>
      </HeroLayout>
    </HeroWrapper>
  )
}

export default Hero
