import styled, { css } from 'styled-components'
import { Card, CardBody, Flex, Heading, Text, Button, LinkExternal, useModal, useTooltip } from '@pancakeswap/uikit'
import EarnableTokensModal from './EarnableTokensModal'
import { RewardToken } from '../types'

interface NFTItem {
  name: string
  image: string
  link: string
}

interface GameCardProps {
  name: string
  description: string
  bannerUrl: string
  ctaLabel: string
  ctaHref: string
  projectLabel?: string
  projectHref?: string
  usableNfts: string[]
  earnableRewards: RewardToken[]
  earnableNfts: NFTItem[]
  isComingSoon?: boolean
}

const StyledCard = styled(Card)<{ $comingSoon?: boolean }>`
  align-self: stretch;
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(15, 21, 54, 0.28);
    border-color: ${({ theme }) => theme.colors.primary};
  }

  ${({ $comingSoon, theme }) =>
    $comingSoon &&
    css`
      border-style: dashed;
      border-color: ${theme.colors.cardBorder};
      &:hover {
        border-color: ${theme.colors.cardBorder};
        transform: translateY(-2px);
        box-shadow: 0 6px 18px rgba(15, 21, 54, 0.18);
      }
    `}
`

const Banner = styled.div<{ $image: string }>`
  position: relative;
  height: 200px;
  background: ${({ $image }) => `url(${$image}) center/cover no-repeat`};
  display: flex;
  align-items: flex-end;
  padding: 20px;
  color: ${({ theme }) => theme.colors.invertedContrast};

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(5, 7, 16, 0.2) 25%, rgba(5, 7, 16, 0.73) 100%);
  }
`

const BannerContent = styled(Flex)`
  position: relative;
  z-index: 1;
  flex-direction: column;
  gap: 8px;
`

const BannerHeading = styled(Heading).attrs({ color: 'contrast' })`
  color: #ffffff !important;
`

const StatusPill = styled.div<{ $soon?: boolean }>`
  align-self: flex-start;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: ${({ theme, $soon }) =>
    $soon ? 'rgba(255, 170, 0, 0.84)' : theme.colors.success};
  color: #0f152b;
  backdrop-filter: blur(6px);
`

const OnlineBadge = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  padding: 4px 8px;
  border-radius: 999px;
  background: #00ff88;
  color: #0f152b;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.6);
  animation: glowGreen 2s ease-in-out infinite alternate, pulse 1.5s ease-in-out infinite;

  @keyframes glowGreen {
    from {
      box-shadow: 0 0 20px rgba(0, 255, 136, 0.6), 0 0 30px rgba(0, 255, 136, 0.4);
    }
    to {
      box-shadow: 0 0 30px rgba(0, 255, 136, 0.8), 0 0 40px rgba(0, 255, 136, 0.6);
    }
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
`

const OfflineBadge = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  padding: 4px 8px;
  border-radius: 999px;
  background: #ff4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  box-shadow: 0 2px 8px rgba(255, 68, 68, 0.3);
`

const StyledCardBody = styled(CardBody)`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px 24px 28px;

  ${({ theme }) => theme.mediaQueries.sm} {
    padding: 28px 32px 32px;
  }
`

const DetailSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const DetailLabel = styled(Text)`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textSubtle};
`

const PillRow = styled(Flex)`
  gap: 8px;
  flex-wrap: wrap;
`

const Pill = styled.div`
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(118, 69, 217, 0.14);
  border: 1px solid rgba(118, 69, 217, 0.28);
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};

  ${({ theme }) => theme.isDark && 'color: rgba(255, 255, 255, 0.92);'}
`

const EmptyText = styled(Text)`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textDisabled};
`

const TokenRow = styled(Flex)`
  gap: 8px;
  align-items: center;
  cursor: pointer;
  justify-content: flex-start;
`

const TokenIcon = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 4px 10px rgba(15, 21, 43, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(15, 21, 43, 0.35);
  }
`

const TokenChip = styled(Flex)`
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 8px;
  border-radius: 999px;
  background: rgba(15, 21, 43, 0.08);
  border: 1px solid rgba(118, 69, 217, 0.2);
  backdrop-filter: blur(6px);

  ${({ theme }) => theme.isDark &&
    `background: rgba(255, 255, 255, 0.08); border-color: rgba(118, 69, 217, 0.35);`}
`

const TokenLogo = styled.img`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 4px 10px rgba(15, 21, 43, 0.25);
`

const MoreToken = styled(Flex)`
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(118, 69, 217, 0.18);
  border: 1px solid rgba(118, 69, 217, 0.3);
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  min-width: 52px;

  ${({ theme }) => theme.isDark && 'color: rgba(255, 255, 255, 0.92);'}
`

const TokensHint = styled(Text)`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSubtle};
`

const SectionsGrid = styled.div`
  display: grid;
  gap: 20px;
  grid-template-columns: 1fr;
`

const ActionsRow = styled(Flex)`
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  flex-wrap: wrap;
`

const LinkLabel = styled(Text)`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textSubtle};
`

const renderPills = (items: string[]) => {
  const { targetRef: addNFTRef, tooltip: addNFTTooltip, tooltipVisible: addNFTTooltipVisible } = useTooltip('Add your NFT', {
    placement: 'top',
    trigger: 'hover',
  })
  
  return (
    <PillRow>
      {items.map((item) => (
        <Pill key={item}>{item}</Pill>
      ))}
      <div ref={addNFTRef}>
        <AddNFTBox 
          href="https://docs.coincollect.org/collaboration-pools-unlocking-rewards-and-opportunities" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          +
        </AddNFTBox>
        {addNFTTooltipVisible && addNFTTooltip}
      </div>
    </PillRow>
  )
}

const NFTImageRow = styled(Flex)`
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`

const NFTImageLink = styled.a`
  display: inline-block;
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
  }
`

const NFTImage = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(15, 21, 43, 0.25);
`

const AddNFTBox = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 2px dashed ${({ theme }) => theme.colors.primary};
  background: rgba(118, 69, 217, 0.08);
  color: ${({ theme }) => theme.colors.primary};
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  
  &:hover {
    transform: scale(1.1);
    background: rgba(118, 69, 217, 0.15);
    border-color: ${({ theme }) => theme.colors.primaryBright};
  }
  
  ${({ theme }) => theme.isDark &&
    `background: rgba(118, 69, 217, 0.12); border-color: rgba(118, 69, 217, 0.6);`}
`

const renderNFTImages = (nfts: NFTItem[]) => {
  const { targetRef: addNFTRef, tooltip: addNFTTooltip, tooltipVisible: addNFTTooltipVisible } = useTooltip('Add your NFT', {
    placement: 'top',
    trigger: 'hover',
  })
  
  return (
    <NFTImageRow>
      {nfts.map((nft) => {
        const { targetRef, tooltip, tooltipVisible } = useTooltip(nft.name, {
          placement: 'top',
          trigger: 'hover',
        })
        return (
          <div key={nft.name} ref={targetRef}>
            <NFTImageLink href={nft.link} target="_blank" rel="noopener noreferrer">
              <NFTImage src={nft.image} alt={nft.name} />
            </NFTImageLink>
            {tooltipVisible && tooltip}
          </div>
        )
      })}
      <div ref={addNFTRef}>
        <AddNFTBox 
          href="https://docs.coincollect.org/collaboration-pools-unlocking-rewards-and-opportunities" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          +
        </AddNFTBox>
        {addNFTTooltipVisible && addNFTTooltip}
      </div>
    </NFTImageRow>
  )
}

const GameCard: React.FC<GameCardProps> = ({
  name,
  description,
  bannerUrl,
  ctaLabel,
  ctaHref,
  projectLabel = 'Visit Project',
  projectHref,
  usableNfts,
  earnableRewards,
  earnableNfts,
  isComingSoon,
}) => {
  const hasRewards = earnableRewards.length > 0
  const hasEarnableNfts = earnableNfts.length > 0
  const hasUsableNfts = usableNfts.length > 0
  const previewTokens = hasRewards ? earnableRewards.slice(0, 3) : []
  const remainingTokens = hasRewards ? earnableRewards.length - previewTokens.length : 0

  const [onPresentTokensModal] = useModal(
    <EarnableTokensModal tokens={earnableRewards} nfts={earnableNfts} title={`${name} Rewards`} />,
  )

  return (
    <StyledCard $comingSoon={isComingSoon}>
      <Banner $image={bannerUrl}>
        {name === 'GhostAlien' ? (
          <OnlineBadge>Online</OnlineBadge>
        ) : (
          <OfflineBadge>Offline</OfflineBadge>
        )}
        <BannerContent>
          <StatusPill $soon={isComingSoon}>
             {isComingSoon ? (name === 'RainBow Tetris' ? 'Puzzle P2E' : 'Coming Soon') : name === 'GhostAlien' ? 'Space Shooter' : 'Live World'}
           </StatusPill>
          <BannerHeading scale="lg">{name}</BannerHeading>
        </BannerContent>
      </Banner>

      <StyledCardBody>
        <Text color="textSubtle" lineHeight="160%">
          {description}
        </Text>

        <SectionsGrid>
          <DetailSection>
            <DetailLabel>Earnable Rewards</DetailLabel>
            {hasRewards || hasEarnableNfts ? (
              <Flex flexDirection="column" style={{ gap: '8px' }}>
                <TokenRow onClick={onPresentTokensModal} role="button" aria-label="View earnable rewards">
                  {earnableRewards.slice(0, 4).map((token) => {
                    const { targetRef, tooltip, tooltipVisible } = useTooltip(token.label, {
                      placement: 'top',
                      trigger: 'hover',
                    })
                    return (
                      <div key={token.label} ref={targetRef}>
                        <TokenIcon src={token.logoSrc} alt={token.label} />
                        {tooltipVisible && tooltip}
                      </div>
                    )
                  })}
                  {earnableRewards.length > 4 && (
                    <MoreToken>+{earnableRewards.length - 4}</MoreToken>
                  )}
                </TokenRow>
              </Flex>
            ) : (
              <EmptyText>Reward structure will be revealed closer to launch.</EmptyText>
            )}
          </DetailSection>

          <DetailSection>
            <DetailLabel>Usable NFTs In-Game</DetailLabel>
            {hasEarnableNfts ? (
              renderNFTImages(earnableNfts)
            ) : hasUsableNfts ? (
              renderPills(usableNfts)
            ) : (
              (() => {
                const { targetRef: addNFTRef, tooltip: addNFTTooltip, tooltipVisible: addNFTTooltipVisible } = useTooltip('Add your NFT', {
                  placement: 'top',
                  trigger: 'hover',
                })
                
                return (
                  <Flex flexDirection="column" style={{ gap: '12px' }}>
                    <EmptyText>Connect your CoinCollect NFTs to unlock gameplay perks.</EmptyText>
                    <NFTImageRow>
                      <div ref={addNFTRef}>
                        <AddNFTBox 
                          href="https://docs.coincollect.org/collaboration-pools-unlocking-rewards-and-opportunities" 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          +
                        </AddNFTBox>
                        {addNFTTooltipVisible && addNFTTooltip}
                      </div>
                    </NFTImageRow>
                  </Flex>
                )
              })()
            )}
          </DetailSection>
        </SectionsGrid>

        <ActionsRow flexDirection={[ 'column', null, 'row' ]} alignItems={[ 'stretch', null, 'center' ]}>
          <Button
            as="a"
            href={ctaHref}
            target={isComingSoon ? '_self' : '_blank'}
            rel={isComingSoon ? undefined : 'noreferrer'}
            variant={isComingSoon ? 'secondary' : 'primary'}
            width={['100%', null, 'auto']}
          >
            {ctaLabel}
          </Button>

          {projectHref && (
            <Flex flexDirection="column" style={{ gap: '4px' }}>
              <LinkLabel>{projectLabel}</LinkLabel>
              <LinkExternal href={projectHref} color="primary" fontSize="14px">
                {projectHref.replace(/^https?:\/\//, '')}
              </LinkExternal>
            </Flex>
          )}
        </ActionsRow>
      </StyledCardBody>
    </StyledCard>
  )
}

export default GameCard
