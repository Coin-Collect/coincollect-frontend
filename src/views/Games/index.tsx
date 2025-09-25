import styled from 'styled-components'
import { Flex, Heading, Text } from '@pancakeswap/uikit'
import Page from 'components/Layout/Page'
import Container from 'components/Layout/Container'
import FlexLayout from 'components/Layout/Flex'
import Hero from './components/Hero'
import GameCard from './components/GameCard'

const CardsSection = styled(Container)`
  display: flex;
  flex-direction: column;
  gap: 32px;

  ${({ theme }) => theme.mediaQueries.md} {
    gap: 40px;
  }
`

const CardsGrid = styled(FlexLayout)`
  margin-left: -8px;
  margin-right: -8px;

  & > * {
    margin: 0 8px 32px;
  }

  ${({ theme }) => theme.mediaQueries.lg} {
    & > * {
      min-width: 300px;
    }
  }
`

const SectionHeader = styled(Flex)`
  flex-direction: column;
  row-gap: 12px;
`

const SectionTitle = styled(Heading)`
  color: ${({ theme }) => theme.colors.white};
`

const SectionDescription = styled(Text)`
  color: rgba(255, 255, 255, 0.85);
`

const GamesView: React.FC = () => {
  const mainGame = {
    name: 'GhostAlien',
    description:
      'Retro cyberpunk space shooter where you blast ghost-shaped invaders to stack arcade thrills and on-chain rewards.',
    bannerUrl: '/images/games/bannerGhost.webp',
    ctaLabel: 'Play GhostAlien',
    ctaHref: 'https://questgalaxy.com/ghostalien.html',
    projectLabel: 'Quest Galaxy Hub',
    projectHref: 'https://questgalaxy.com',
    usableNfts: ['Quest Galaxy Pass'],
    earnableRewards: [
      { label: 'GHOST', logoSrc: '/images/games/tokens/bonk.png' },
      { label: 'COLLECT', logoSrc: '/images/games/tokens/0xdbc80878e4Ffe6A4f87fb94DB2Ee58a642986816.png' },
    ],
    earnableNfts: ['GhostAlien Trophy NFTs'],
  }

  const comingSoon = {
    name: 'Your Game Here',
    description:
      'Have a play-to-earn experience that thrives on powerful NFT utility? Partner with CoinCollect to showcase it to our community and plug into COLLECT rewards.',
    bannerUrl: '/images/poolBanners/partners/9.webp',
    ctaLabel: 'Submit Your Game',
    ctaHref: 'mailto:hello@coincollect.org?subject=CoinCollect%20Games%20Listing',
    projectLabel: 'Partner With CoinCollect',
    projectHref: 'https://coincollect.org/contact',
    usableNfts: [],
    earnableRewards: [],
    earnableNfts: [],
  }

  return (
    <Page>
      <Hero />
      <CardsSection id="games-grid">
        <SectionHeader>
          <SectionTitle scale="lg">Featured Game Worlds</SectionTitle>
          <SectionDescription maxWidth="720px">
            Dive into curated experiences designed around CoinCollect NFTs. Each title is vetted for immersive gameplay, sustainable tokenomics, and community-first design.
          </SectionDescription>
        </SectionHeader>
        <CardsGrid>
          <GameCard {...mainGame} />
          <GameCard {...comingSoon} isComingSoon />
        </CardsGrid>
      </CardsSection>
    </Page>
  )
}

export default GamesView
