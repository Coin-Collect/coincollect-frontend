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
  color: ${({ theme }) => theme.colors.contrast};
`

const SectionDescription = styled(Text)`
  color: rgba(255, 255, 255, 0.85);
`

const GamesView: React.FC = () => {
  const nftData = [
    {
      name: 'Cyberpunk NFT',
      image: '/images/poolBanners/nfts/cyberpunk.webp',
      link: 'https://opensea.io/collection/cyberpunk-citizenship/overview'
    },
    {
      name: 'Key NFT',
      image: '/images/poolBanners/nfts/key.webp',
      link: 'https://key2web3.com/'
    },
    {
      name: 'Lootbox NFT',
      image: '/images/poolBanners/nfts/lootbox.webp',
      link: 'https://opensea.io/collection/questgalaxy-lootbox/overview'
    }
  ]

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
      { label: 'SOL', logoSrc: '/images/games/tokens/sol.webp' },
      { label: 'COLLECT', logoSrc: '/images/games/tokens/0x56633733fc8BAf9f730AD2b6b9956Ae22c6d4148.png' },
      { label: 'ETH', logoSrc: '/images/games/tokens/eth-min.png' },
      { label: 'LINK', logoSrc: '/images/games/tokens/link-min.png' },
      { label: 'UNI', logoSrc: '/images/games/tokens/uni.png' },
      { label: 'AAVE', logoSrc: '/images/games/tokens/aave-min.png' },
      { label: 'SAND', logoSrc: '/images/games/tokens/sand.png' },
    ],
    earnableNfts: nftData,
  }

  const rogueCircuit = {
    name: 'RainBow Tetris',
    description:
      'A kaleidoscopic puzzle clash where shifting blocks ignite chain reactions, unlocking COLLECT boosts and seasonal trophy NFTs as you battle for high-score dominance.',
    bannerUrl: '/images/poolBanners/44.webp',
    ctaLabel: 'Join the Waitlist',
    ctaHref: 'https://docs.coincollect.org/collaboration-pools-unlocking-rewards-and-opportunities',
    projectLabel: 'CoinCollect Studios',
    projectHref: 'https://coincollect.org',
    usableNfts: ['Quest Galaxy Pass', 'COLLECT Season Badges'],
    earnableRewards: [
      { label: 'COLLECT', logoSrc: '/images/games/tokens/0x56633733fc8BAf9f730AD2b6b9956Ae22c6d4148.png' },
      { label: 'ETH', logoSrc: '/images/games/tokens/eth-min.png' },
      { label: 'LINK', logoSrc: '/images/games/tokens/link-min.png' },
      { label: 'UNI', logoSrc: '/images/games/tokens/uni.png' },
      { label: 'SHIB', logoSrc: '/images/games/tokens/shib-min.png' },
      { label: 'TEL', logoSrc: '/images/games/tokens/tel.png' },
    ],
    earnableNfts: nftData,
  }

  const comingSoon = {
    name: 'Your Game Here',
    description:
      'Have a play-to-earn experience that thrives on powerful NFT utility? Partner with CoinCollect to showcase it to our community and plug into COLLECT rewards.',
    bannerUrl: '/images/poolBanners/partners/9.webp',
    ctaLabel: 'Submit Your Game',
    ctaHref: 'https://docs.coincollect.org/collaboration-pools-unlocking-rewards-and-opportunities',
    projectLabel: 'docs.coincollect.org',
    projectHref: 'https://docs.coincollect.org',
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
          <GameCard {...rogueCircuit} isComingSoon />
          <GameCard {...comingSoon} isComingSoon />
        </CardsGrid>
      </CardsSection>
    </Page>
  )
}

export default GamesView
