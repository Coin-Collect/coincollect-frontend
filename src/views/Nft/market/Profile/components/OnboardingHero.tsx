import { useMemo } from 'react'
import styled, { keyframes } from 'styled-components'
import { Box, Button, CardBody as UICardBody, Flex, Heading, Text } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import { NftLocation, NftToken } from 'state/nftMarket/types'
import { useRouter } from 'next/router'
import NFTMedia, { AspectRatio } from 'views/Nft/market/components/NFTMedia'
import { StyledCollectibleCard } from 'views/Nft/market/components/CollectibleCard/styles'

type HeroCardConfig = {
  key: string
  badge: string
  title: string
  description: string
  metric: string
  gradient: string
  iconGradient: string
  icon: JSX.Element
  ctaPath: string
  ctaGradient: string
  ctaHover: string
  ctaLabel: string
}

type NftPreview = {
  key: string
  name: string
  utility: string
  status: string
  accent: string
  collection?: string
  token?: NftToken
}

type GameCardConfig = {
  key: string
  title: string
  description: string
  gradient: string
  glow: string
}

interface OnboardingHeroProps {
  totalNfts: number
  stakedPoolCount: number
  claimableCount: number
  walletNfts: NftToken[]
}

const float = keyframes`
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
  100% {
    transform: translateY(0px);
  }
`

const pulse = keyframes`
  0% {
    opacity: 0.4;
    transform: scale(0.95);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.05);
  }
  100% {
    opacity: 0.4;
    transform: scale(0.95);
  }
`

const shine = keyframes`
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(120%);
  }
`

const Wrapper = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 40px;
  margin-bottom: 56px;
`

const StepsRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: stretch;
    justify-content: center;
  }

  @media (min-width: 1200px) {
    gap: 24px;
  }
`

const HeroCard = styled(Box)<{ gradient: string }>`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 22px;
  border-radius: 22px;
  overflow: hidden;
  width: 100%;
  background: ${({ gradient }) => gradient};
  border: 1px solid rgba(148, 163, 255, 0.24);
  box-shadow: 0 18px 36px rgba(76, 29, 149, 0.3);
  backdrop-filter: blur(22px);
  transition: transform 0.35s ease, box-shadow 0.35s ease;
  min-height: 188px;

  &:before {
    content: '';
    position: absolute;
    inset: -12%;
    background: radial-gradient(circle at top right, rgba(45, 212, 191, 0.38), transparent 65%);
    opacity: 0.85;
    pointer-events: none;
  }

  &:after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, transparent 5%, rgba(255, 255, 255, 0.16) 45%, transparent 85%);
    transform: translateX(-140%);
    animation: ${shine} 14s ease-in-out infinite;
    pointer-events: none;
    mix-blend-mode: screen;
  }

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 28px 52px rgba(129, 140, 248, 0.42);
  }

  @media (min-width: 768px) {
    max-width: 260px;
  }

  @media (min-width: 1200px) {
    max-width: 280px;
    padding: 22px 26px;
  }
`

const CardContent = styled(Flex)`
  position: relative;
  z-index: 1;
  flex-direction: column;
  gap: 12px;
`

const StepBadge = styled(Text)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 20px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  mix-blend-mode: screen;
  align-self: center;
`

const HeroIcon = styled(Box)<{ gradient: string }>`
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  position: relative;
  overflow: hidden;
  background: ${({ gradient }) => gradient};
  box-shadow: 0 0 24px rgba(34, 211, 238, 0.45);
  animation: ${float} 6s ease-in-out infinite;

  &:before {
    content: '';
    position: absolute;
    inset: -40%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.3), transparent 60%);
    animation: ${pulse} 5s ease-in-out infinite;
  }

  svg {
    position: relative;
    z-index: 1;
  }
`

const CardCta = styled(Button).attrs({ type: 'button' })<{ $background: string; $hover: string }>`
  margin-top: auto;
  width: 100%;
  justify-content: center;
  background-image: ${({ $background }) => $background};
  background-size: 120% 120%;
  background-position: 0 0;
  background-color: transparent;
  border: none;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0.02em;
  border-radius: 999px;
  padding: 12px 16px;
  white-space: normal;
  text-align: center;
  line-height: 150%;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.28);
  transition: transform 0.25s ease, box-shadow 0.25s ease, background-position 0.25s ease;

  &:hover {
    background-image: ${({ $hover }) => $hover};
    background-position: 100% 0;
    box-shadow: 0 18px 34px rgba(30, 64, 175, 0.35);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.28);
  }
`

const MetricText = styled(Text)`
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
`

const SectionHeader = styled(Flex)`
  flex-direction: column;
  gap: 8px;
`

const SectionSubtitle = styled(Text)`
  color: ${({ theme }) => theme.colors.textSubtle};
  max-width: 640px;
`

const SpotlightGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 20px;

  @media (min-width: 576px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 992px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

const SpotlightCard = styled(StyledCollectibleCard)<{ accent: string }>`
  min-width: 260px;
  max-width: 320px;
  scroll-snap-align: start;
  position: relative;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  background: ${({ theme }) => theme.colors.backgroundAlt};

  &:before {
    content: '';
    position: absolute;
    inset: -40%;
    background: ${({ accent }) => accent};
    opacity: 0.35;
    filter: blur(80px);
    z-index: 0;
    pointer-events: none;
  }

  ${({ theme }) => theme.mediaQueries.md} {
    &:hover {
      transform: translateY(-6px);
      box-shadow: 0 28px 48px rgba(59, 130, 246, 0.28);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
  }
`

const SpotlightBody = styled(UICardBody)`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100%;
  z-index: 1;
  background: ${({ theme }) => theme.colors.backgroundAlt};
`

const SpotlightImageWrapper = styled(Box)`
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.28);
`

const SpotlightImageFallback = styled(Box)`
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(129, 140, 248, 0.65), rgba(45, 212, 191, 0.5));

  &:after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, rgba(255, 255, 255, 0.45), transparent 60%);
    opacity: 0.45;
  }
`

const SpotlightStatusBadge = styled(Text)<{ $gradient: string }>`
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 6px 12px;
  border-radius: 999px;
  background: ${({ $gradient }) => $gradient};
  color: #f8fafc;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.25);
`

const SpotlightCollectionBadge = styled(Text)`
  position: absolute;
  bottom: 12px;
  left: 12px;
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radii.small};
  background: rgba(15, 23, 42, 0.75);
  color: #f8fafc;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.45);
`

const UtilityButton = styled(Button).attrs({ type: 'button' })<{ $background: string; $hover: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 14px 18px;
  border-radius: 16px;
  background-image: ${({ $background }) => $background};
  background-size: 120% 120%;
  background-position: 0 0;
  border: none;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  box-shadow: 0 18px 32px rgba(15, 23, 42, 0.32);
  transition: transform 0.25s ease, box-shadow 0.25s ease, background-position 0.25s ease;
  margin-top: auto;

  &:hover {
    background-image: ${({ $hover }) => $hover};
    background-position: 100% 0;
    transform: translateY(-2px);
    box-shadow: 0 24px 44px rgba(59, 130, 246, 0.35);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.25);
  }
`

const GameGrid = styled.div`
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(1, minmax(0, 1fr));

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const GameCard = styled(Box)<{ gradient: string; glow: string }>`
  position: relative;
  padding: 24px;
  border-radius: 24px;
  background: ${({ gradient }) => gradient};
  border: 1px solid rgba(96, 165, 250, 0.28);
  backdrop-filter: blur(18px);
  overflow: hidden;
  min-height: 200px;
  box-shadow: 0 24px 46px rgba(14, 165, 233, 0.35);
  transition: transform 0.35s ease, box-shadow 0.35s ease;

  &:before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ glow }) => glow};
    opacity: 0.8;
    filter: blur(32px);
  }

  &:after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(140deg, rgba(255, 255, 255, 0.24), transparent 55%);
    mix-blend-mode: screen;
    opacity: 0.7;
  }

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 32px 60px rgba(59, 130, 246, 0.45);
  }
`

const GameLabel = styled(Text)`
  display: inline-flex;
  align-items: center;
  padding: 4px 14px;
  border-radius: 999px;
  background: rgba(129, 140, 248, 0.25);
  color: #bfdbfe;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
`

const GameCardContent = styled(Flex)`
  position: relative;
  z-index: 1;
  flex-direction: column;
  gap: 12px;
  height: 100%;
`

const MintIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M16 4L6 8.5V14C6 20.4 10.4 26.3 16 28C21.6 26.3 26 20.4 26 14V8.5L16 4Z"
      stroke="white"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.9"
    />
    <path
      d="M16 11V19"
      stroke="white"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 15H20"
      stroke="white"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const ClaimIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 12L16 6L24 12V22C24 23.1046 23.1046 24 22 24H10C8.89543 24 8 23.1046 8 22V12Z"
      stroke="white"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.9"
    />
    <path
      d="M12 16L15 19L20 14"
      stroke="white"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const StakeIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 18C8 13.5817 11.5817 10 16 10C20.4183 10 24 13.5817 24 18"
      stroke="white"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.9"
    />
    <path
      d="M10 18H22"
      stroke="white"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 22H20"
      stroke="white"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const OnboardingHero: React.FC<OnboardingHeroProps> = ({ totalNfts, stakedPoolCount, claimableCount, walletNfts }) => {
  const { t } = useTranslation()
  const router = useRouter()

  const heroCards = useMemo<HeroCardConfig[]>(
    () => [
      {
        key: 'mint',
        badge: t('Mint Card'),
        title: t('Mint NFT'),
        description: t('Mint your KEY NFT to unlock quests, airdrops, and the CoinCollect multiverse.'),
        metric:
          totalNfts > 0
            ? t('%count% collectible(s) discovered', { count: totalNfts })
            : t('Mint your first KEY and begin the journey.'),
        gradient: 'linear-gradient(145deg, rgba(122, 32, 224, 0.85), rgba(16, 47, 94, 0.8))',
        iconGradient: 'linear-gradient(145deg, rgba(129, 140, 248, 0.85), rgba(34, 211, 238, 0.9))',
        icon: <MintIcon />,
        ctaPath: '/nfts/collections',
        ctaGradient: 'linear-gradient(135deg, rgba(167, 139, 250, 0.95), rgba(79, 70, 229, 0.88))',
        ctaHover: 'linear-gradient(135deg, rgba(193, 181, 255, 1), rgba(99, 102, 241, 0.95))',
        ctaLabel: t('MINT'),
      },
      {
        key: 'claim',
        badge: t('Claim Card'),
        title: t('Claim Rewards'),
        description: t('Claim token flows, partner drops, and daily boosts powered by your NFTs.'),
        metric:
          claimableCount > 0
            ? t('%count% reward pool(s) ready to claim', { count: claimableCount })
            : t('Connect eligible NFTs to reveal claimable rewards.'),
        gradient: 'linear-gradient(145deg, rgba(20, 83, 136, 0.9), rgba(59, 130, 246, 0.68))',
        iconGradient: 'linear-gradient(145deg, rgba(45, 212, 191, 0.85), rgba(125, 211, 252, 0.85))',
        icon: <ClaimIcon />,
        ctaPath: '/claim',
        ctaGradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.95), rgba(37, 99, 235, 0.85))',
        ctaHover: 'linear-gradient(135deg, rgba(125, 211, 252, 1), rgba(59, 130, 246, 0.95))',
        ctaLabel: t('CLAIM'),
      },
      {
        key: 'stake',
        badge: t('Stake Card'),
        title: t('Stake NFT'),
        description: t('Stake into futuristic pools, grow passive rewards, and level up your dashboard.'),
        metric:
          stakedPoolCount > 0
            ? t('Staking in %count% pool(s)', { count: stakedPoolCount })
            : t('Stake NFTs to activate passive Collect earnings.'),
        gradient: 'linear-gradient(145deg, rgba(17, 94, 89, 0.9), rgba(22, 163, 74, 0.65))',
        iconGradient: 'linear-gradient(145deg, rgba(74, 222, 128, 0.85), rgba(45, 212, 191, 0.85))',
        icon: <StakeIcon />,
        ctaPath: '/nftpools',
        ctaGradient: 'linear-gradient(135deg, rgba(74, 222, 128, 0.9), rgba(45, 212, 191, 0.85))',
        ctaHover: 'linear-gradient(135deg, rgba(134, 239, 172, 1), rgba(52, 211, 153, 0.95))',
        ctaLabel: t('STAKE'),
      },
    ],
    [t, totalNfts, claimableCount, stakedPoolCount],
  )

  const nftPreviewItems = useMemo<NftPreview[]>(() => {
    if (walletNfts.length > 0) {
      const showcase = walletNfts.slice(0, 6).map((nft, index) => {
        const isClaimCard = index % 2 === 0
        const status = isClaimCard ? t('Claim Rewards Ready') : t('Stakeable Utility')
        const utility = isClaimCard
          ? t('Eligible for seasonal drops and reward streams.')
          : t('Boost APR in featured staking pools.')

        let accent = 'linear-gradient(135deg, rgba(59, 130, 246, 0.6), rgba(45, 212, 191, 0.45))'
        if (nft.location === NftLocation.FORSALE) {
          accent = 'linear-gradient(135deg, rgba(244, 114, 182, 0.6), rgba(147, 51, 234, 0.45))'
        } else if (nft.location === NftLocation.PROFILE) {
          accent = 'linear-gradient(135deg, rgba(56, 189, 248, 0.6), rgba(129, 140, 248, 0.45))'
        }

        return {
          key: `${nft.collectionAddress}-${nft.tokenId}`,
          name: nft.name || t('Collectible #%id%', { id: nft.tokenId }),
          utility,
          status,
          accent,
          collection: nft.collectionName,
          token: nft,
        }
      })

      if (showcase.length >= 4) {
        return showcase
      }

      return [
        ...showcase,
        ...Array.from({ length: 4 - showcase.length }).map((_, fillerIndex) => ({
          key: `placeholder-${fillerIndex}`,
          name: t('Mystery NFT'),
          utility: t('Preview coming soon'),
          status: t('Connect more wallets to display.'),
          accent: 'linear-gradient(135deg, rgba(129, 140, 248, 0.6), rgba(236, 72, 153, 0.45))',
          token: undefined,
        })),
      ]
    }

    return [
      {
        key: 'placeholder-1',
        name: t('Genesis Key NFT'),
        utility: t('Claim OG rewards and unlock partner drops.'),
        status: t('Claim Rewards Ready'),
        accent: 'linear-gradient(135deg, rgba(129, 140, 248, 0.6), rgba(45, 212, 191, 0.45))',
        token: undefined,
      },
      {
        key: 'placeholder-2',
        name: t('Vault Guardian NFT'),
        utility: t('Stake into cosmic pools for boosted APR.'),
        status: t('Stakeable Utility'),
        accent: 'linear-gradient(135deg, rgba(56, 189, 248, 0.6), rgba(59, 130, 246, 0.45))',
        token: undefined,
      },
      {
        key: 'placeholder-3',
        name: t('Metaverse Avatar'),
        utility: t('Unlocks access to partner experiences.'),
        status: t('Utility Highlight'),
        accent: 'linear-gradient(135deg, rgba(147, 51, 234, 0.6), rgba(236, 72, 153, 0.45))',
        token: undefined,
      },
      {
        key: 'placeholder-4',
        name: t('Loot Hunter NFT'),
        utility: t('Bridge rewards directly into your wallet.'),
        status: t('Claim Rewards Ready'),
        accent: 'linear-gradient(135deg, rgba(250, 204, 21, 0.6), rgba(59, 130, 246, 0.45))',
        token: undefined,
      },
    ]
  }, [walletNfts, t])

  const statusButtonMap = useMemo<
    Record<
      string,
      {
        path: string
        gradient: string
        hover: string
        label: string
      }
    >
  >(
    () => ({
      [t('Claim Rewards Ready')]: {
        path: '/claim',
        gradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.85), rgba(37, 99, 235, 0.85))',
        hover: 'linear-gradient(135deg, rgba(125, 211, 252, 1), rgba(59, 130, 246, 0.95))',
        label: t('Claim Rewards'),
      },
      [t('Stakeable Utility')]: {
        path: '/nftpools',
        gradient: 'linear-gradient(135deg, rgba(74, 222, 128, 0.9), rgba(34, 197, 94, 0.85))',
        hover: 'linear-gradient(135deg, rgba(134, 239, 172, 1), rgba(52, 211, 153, 0.95))',
        label: t('Stake NFTs'),
      },
    }),
    [t],
  )

  const gameCards = useMemo<GameCardConfig[]>(
    () => [
      {
        key: 'key',
        title: t('KEY NFT'),
        description: t('Unlock portals, decrypt puzzles, and access multi-chain missions.'),
        gradient: 'linear-gradient(145deg, rgba(34, 197, 94, 0.42), rgba(45, 212, 191, 0.35))',
        glow: 'radial-gradient(circle, rgba(45, 212, 191, 0.55), transparent 70%)',
      },
      {
        key: 'lootbox',
        title: t('Lootbox NFT'),
        description: t('Spin into randomized power-ups and seasonal tournament boosts.'),
        gradient: 'linear-gradient(145deg, rgba(129, 140, 248, 0.45), rgba(236, 72, 153, 0.4))',
        glow: 'radial-gradient(circle, rgba(236, 72, 153, 0.55), transparent 70%)',
      },
      {
        key: 'cyberpunk',
        title: t('Cyberpunk NFT'),
        description: t('Deploy in arcade battles with neon shields and adaptive traits.'),
        gradient: 'linear-gradient(145deg, rgba(59, 130, 246, 0.45), rgba(14, 116, 144, 0.4))',
        glow: 'radial-gradient(circle, rgba(59, 130, 246, 0.55), transparent 70%)',
      },
    ],
    [t],
  )

  return (
    <Wrapper>
      <StepsRow>
        {heroCards.map((card, index) => (
          <HeroCard key={card.key} gradient={card.gradient}>
            <CardContent>
              <Flex flexDirection="column" alignItems="center" gap="12px">
                <StepBadge>{t('Step %step%', { step: index + 1 })}</StepBadge>
                <Heading scale="md" color="white" style={{ lineHeight: '130%', textAlign: 'center' }}>
                  {card.title}
                </Heading>
              </Flex>
              <Flex alignItems="center" justifyContent="center" gap="12px">
                <HeroIcon gradient={card.iconGradient}>{card.icon}</HeroIcon>
              </Flex>
              <Text color="rgba(226, 232, 240, 0.82)" fontSize="13px" lineHeight="150%" textAlign="center">
                {card.description}
              </Text>
              <MetricText>{card.metric}</MetricText>
              <CardCta
                $background={card.ctaGradient}
                $hover={card.ctaHover}
                onClick={() => router.push(card.ctaPath)}
              >
                {card.ctaLabel}
              </CardCta>
            </CardContent>
          </HeroCard>
        ))}
      </StepsRow>

      <Box>
        <SectionHeader>
          <Heading scale="lg" color="text">
            {t('Owned NFTs Spotlight')}
          </Heading>
          <SectionSubtitle>
            {t('Showcasing NFTs across your wallets with quick-glance utility tags for claiming rewards or staking into pools.')}
          </SectionSubtitle>
        </SectionHeader>
        <Box mt="24px">
          <SpotlightGrid>
            {nftPreviewItems.slice(0, 4).map((item) => {
              const statusCta = statusButtonMap[item.status]
              const defaultCta = {
                path: '/nfts/collections',
                gradient: 'linear-gradient(135deg, rgba(148, 163, 255, 0.9), rgba(129, 140, 248, 0.85))',
                hover: 'linear-gradient(135deg, rgba(165, 180, 252, 1), rgba(129, 140, 248, 0.95))',
                label: t('Explore NFTs'),
              }
              const actionCta = statusCta ?? defaultCta
              return (
                <SpotlightCard key={item.key} accent={item.accent}>
                  <SpotlightBody p="16px">
                    <SpotlightImageWrapper>
                      {item.token ? (
                        <AspectRatio ratio={1}>
                          <NFTMedia
                            nft={item.token}
                            width={320}
                            height={320}
                            borderRadius="18px"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </AspectRatio>
                      ) : (
                        <AspectRatio ratio={1}>
                          <SpotlightImageFallback />
                        </AspectRatio>
                      )}
                      <SpotlightStatusBadge $gradient={actionCta.gradient}>
                        {item.status}
                      </SpotlightStatusBadge>
                      {item.collection && (
                        <SpotlightCollectionBadge>
                          {t('Collection: %name%', { name: item.collection })}
                        </SpotlightCollectionBadge>
                      )}
                    </SpotlightImageWrapper>
                    <Heading scale="md" color="text">
                      {item.name}
                    </Heading>
                    <Text mt="8px" color="textSubtle">
                      {item.utility}
                    </Text>
                    <UtilityButton
                      $background={actionCta.gradient}
                      $hover={actionCta.hover}
                      onClick={() => router.push(actionCta.path)}
                    >
                      {actionCta.label}
                    </UtilityButton>
                  </SpotlightBody>
                </SpotlightCard>
              )
            })}
          </SpotlightGrid>
        </Box>
      </Box>

      <Box>
        <SectionHeader>
          <Heading scale="lg" color="text">
            {t('Playable Game NFTs')}
          </Heading>
          <SectionSubtitle>
            {t('Special NFTs radiating with game-ready energy. Slot them into CoinCollect mini-games and seasonal quests.')}
          </SectionSubtitle>
        </SectionHeader>
        <Box mt="24px">
          <GameGrid>
            {gameCards.map((card) => (
              <GameCard key={card.key} gradient={card.gradient} glow={card.glow}>
                <GameCardContent>
                  <GameLabel>{t('Playable in Games')}</GameLabel>
                  <Heading scale="md" color="white">
                    {card.title}
                  </Heading>
                  <Text color="rgba(226, 232, 240, 0.82)">{card.description}</Text>
                </GameCardContent>
              </GameCard>
            ))}
          </GameGrid>
        </Box>
      </Box>
    </Wrapper>
  )
}

export default OnboardingHero
