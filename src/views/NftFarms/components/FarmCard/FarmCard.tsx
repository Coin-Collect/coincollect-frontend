import { useState } from 'react'
import type { ComponentType } from 'react'
import BigNumber from 'bignumber.js'
import styled, { css, keyframes } from 'styled-components'
import {
  Card,
  Flex,
  Text,
  Skeleton,
  CardRibbon,
  HomeIcon,
  NftIcon,
  SmartContractIcon,
  useTooltip,
  useMatchBreakpoints,
} from '@pancakeswap/uikit'
import type { SvgProps } from '@pancakeswap/uikit'
import { DeserializedNftFarm } from 'state/types'
import { getPolygonScanLink } from 'utils'
import { useTranslation } from 'contexts/Localization'
import ExpandableSectionButton from 'components/ExpandableSectionButton'
import { getAddress } from 'utils/addressHelpers'
import DetailsSection from './DetailsSection'
import CardHeadingWithBanner from './CardHeadingWithBanner'
import CardActionsContainer from './CardActionsContainer'
import ApyButton from './ApyButton'
import nftFarmsConfig from 'config/constants/nftFarms'
import tokens from 'config/constants/tokens'
import formatRewardAmount from 'utils/formatRewardAmount'
import { Token } from '@coincollect/sdk'

export interface NftFarmWithStakedValue extends DeserializedNftFarm {
  apr?: number
  lpRewardsApr?: number
  liquidity?: BigNumber
}

const StyledCard = styled(Card)<{ $variant: 'default' | 'expanded' }>`
  align-self: baseline;
  max-width: 100%;
  margin: ${({ $variant }) => ($variant === 'expanded' ? '0 0 32px' : '0 0 24px 0')};
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(0);
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.08);
    border-color: ${({ theme }) => theme.colors.primary};
  }
  
  ${({ theme, $variant }) =>
    $variant === 'default'
      ? css`
          ${theme.mediaQueries.sm} {
            max-width: 350px;
            margin: 0 12px 46px;
          }
        `
      : css`
          max-width: 350px;
          margin: 0 auto 32px;
          ${theme.mediaQueries.sm} {
            margin: 0 auto 32px;
          }
        `}
`

const FarmCardInnerContainer = styled(Flex)`
  flex-direction: column;
  justify-content: space-around;
  padding: 16px;
`

const ExpandingWrapper = styled.div`
  padding: 12px;
  border-top: 2px solid ${({ theme }) => theme.colors.cardBorder};
  overflow: hidden;
`

const FooterTopRow = styled(Flex)`
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const FooterLinks = styled(Flex)`
  gap: 12px;
`

const FooterIconWrapper = styled.span`
  display: inline-flex;
`

const FooterIconLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.background};
  transition: color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.secondary};
    border-color: ${({ theme }) => theme.colors.secondary};
    transform: translateY(-2px);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`

interface FooterIconWithTooltipProps {
  href: string
  label: string
  IconComponent: ComponentType<SvgProps>
}

const FooterIconWithTooltip: React.FC<FooterIconWithTooltipProps> = ({ href, label, IconComponent }) => {
  const { targetRef, tooltip, tooltipVisible } = useTooltip(label, { placement: 'top' })
  const { isXs, isSm, isMd } = useMatchBreakpoints()
  const isTouch =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore
      navigator.msMaxTouchPoints > 0)
  const disableTooltip = isXs || isSm || isMd || isTouch

  return (
    <>
      {!disableTooltip && tooltipVisible && tooltip}
      <FooterIconWrapper ref={!disableTooltip ? targetRef : undefined}>
        <FooterIconLink href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
          <IconComponent color="currentColor" />
        </FooterIconLink>
      </FooterIconWrapper>
    </>
  )
}

const MetricText = styled(Text)<{ metricType?: 'high' | 'medium' | 'low' | 'reward' }>`
  color: ${({ theme, metricType }) => {
    switch (metricType) {
      case 'high':
        return theme.colors.success;
      case 'medium':
        return theme.colors.warning;
      case 'low':
        return theme.colors.failure;
      case 'reward':
        return theme.colors.primary;
      default:
        return theme.colors.text;
    }
  }};
  font-weight: ${({ metricType }) => metricType ? '600' : 'inherit'};
`

const slideRewards = keyframes`
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
`

const rewardTitleGlow = keyframes`
  0% {
    transform: translateY(0) scale(1);
    filter: brightness(1);
    box-shadow: 0 4px 14px rgba(10, 14, 24, 0.32), 0 0 0 rgba(247, 215, 116, 0);
  }
  50% {
    transform: translateY(-1px) scale(1.05);
    filter: brightness(1.24);
    box-shadow: 0 6px 18px rgba(10, 14, 24, 0.38), 0 0 18px rgba(247, 215, 116, 0.45);
  }
  100% {
    transform: translateY(0) scale(1);
    filter: brightness(1);
    box-shadow: 0 4px 14px rgba(10, 14, 24, 0.32), 0 0 0 rgba(247, 215, 116, 0);
  }
`

const rewardTitleShimmer = keyframes`
  0% {
    transform: translateX(-130%) skewX(-18deg);
    opacity: 0;
  }
  25% {
    opacity: 0.75;
  }
  55% {
    transform: translateX(170%) skewX(-18deg);
    opacity: 0;
  }
  100% {
    transform: translateX(170%) skewX(-18deg);
    opacity: 0;
  }
`

const RewardTickerWrapper = styled(Flex)`
  flex-direction: column;
  align-items: stretch;
  gap: 7px;
  margin-top: 12px;
`

const RewardTickerHeader = styled(Flex)`
  justify-content: center;
  align-items: center;
  min-height: 24px;
`

const RewardTitleChip = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #f7d774;
  background: linear-gradient(135deg, #1f2432 0%, #121722 100%);
  border: 1px solid rgba(247, 215, 116, 0.45);
  box-shadow: 0 4px 14px rgba(10, 14, 24, 0.32);
  text-shadow: 0 0 8px rgba(247, 215, 116, 0.28);
  overflow: hidden;
  animation: ${rewardTitleGlow} 2.1s ease-in-out infinite;

  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -20%;
    width: 34%;
    height: 200%;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 243, 201, 0.72) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    animation: ${rewardTitleShimmer} 2.8s ease-in-out infinite;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;

    &::after {
      animation: none;
    }
  }
`

const rewardCountFloat = keyframes`
  0% {
    transform: translateY(0) scale(1);
    box-shadow: 0 4px 10px rgba(242, 201, 76, 0.22);
  }
  50% {
    transform: translateY(-2px) scale(1.06);
    box-shadow: 0 7px 14px rgba(242, 201, 76, 0.34);
  }
  100% {
    transform: translateY(0) scale(1);
    box-shadow: 0 4px 10px rgba(242, 201, 76, 0.22);
  }
`

const RewardTitleWrap = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`

const RewardCountBadge = styled.span`
  position: absolute;
  top: -8px;
  right: -3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  font-size: 16px;
  font-weight: 900;
  line-height: 1;
  color: #f2c94c;
  text-shadow: 0 0 10px rgba(242, 201, 76, 0.45), 0 2px 6px rgba(0, 0, 0, 0.4);
  animation: ${rewardCountFloat} 2.2s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const RewardTickerViewport = styled.div`
  position: relative;
  width: 100%;
  overflow: hidden;
  min-height: 42px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => `${theme.colors.primary}30`};
  background: ${({ theme }) => theme.colors.background};

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 20px;
    z-index: 2;
    pointer-events: none;
  }

  &::before {
    left: 0;
    background: linear-gradient(90deg, ${({ theme }) => theme.colors.background} 20%, transparent 100%);
  }

  &::after {
    right: 0;
    background: linear-gradient(270deg, ${({ theme }) => theme.colors.background} 20%, transparent 100%);
  }
`

const RewardTickerTrack = styled.div<{ $paused?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  width: max-content;
  padding: 7px 12px;
  animation: ${slideRewards} 18s linear infinite;
  animation-play-state: ${({ $paused }) => ($paused ? 'paused' : 'running')};
  will-change: transform;

  ${RewardTickerViewport}:hover & {
    animation-play-state: paused;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const RewardChip = styled.span<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  padding: 5px 11px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme, $primary }) => ($primary ? theme.colors.primary : theme.colors.secondary)};
  border: 1px solid ${({ theme, $primary }) => ($primary ? `${theme.colors.primary}40` : `${theme.colors.secondary}40`)};
  background: ${({ theme, $primary }) => ($primary ? `${theme.colors.primary}14` : `${theme.colors.secondary}14`)};
`

const RewardChipAmount = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
`

const RewardTokenImage = styled.img`
  width: 16px;
  height: 16px;
  min-width: 16px;
  min-height: 16px;
  border-radius: 50%;
  object-fit: cover;
`

const RewardTokenFallbackIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 5px;
  background: ${({ theme }) => `${theme.colors.textSubtle}22`};
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
`

const REWARD_SYMBOL_ICON_MAP: Record<string, string> = {
  SHIB: '/images/games/tokens/shib-min.png',
  ELON: '/images/games/tokens/elon-min.png',
  BONK: '/images/games/tokens/bonk.png',
  RADAR: '/images/tokens/0xdCb72AE4d5dc6Ae274461d57E65dB8D50d0a33AD.png',
}

interface RewardChipIconProps {
  token: string
  tokenMeta?: Token
}

const RewardChipIcon: React.FC<RewardChipIconProps> = ({ token, tokenMeta }) => {
  const tokenSymbol = String(token).toUpperCase()
  const tokenAddress = tokenMeta?.address
  const iconCandidates = [
    REWARD_SYMBOL_ICON_MAP[tokenSymbol],
    tokenAddress ? `/images/tokens/${tokenAddress}.svg` : '',
    tokenAddress ? `/images/tokens/${tokenAddress}.png` : '',
  ].filter(Boolean)
  const [iconIndex, setIconIndex] = useState(0)
  const iconSrc = iconCandidates[iconIndex]

  if (iconSrc) {
    return (
      <RewardTokenImage
        src={iconSrc}
        alt={`${token} icon`}
        onError={() => setIconIndex((prev) => prev + 1)}
      />
    )
  }

  return (
    <RewardTokenFallbackIcon>
      {String(token).slice(0, 1)}
    </RewardTokenFallbackIcon>
  )
}

interface FarmCardProps {
  farm: NftFarmWithStakedValue
  displayApr: string
  removed: boolean
  cakePrice?: BigNumber
  account?: string
  variant?: 'default' | 'expanded'
}

const FarmCard: React.FC<FarmCardProps> = ({ farm, displayApr, removed, cakePrice, account, variant = 'default' }) => {
  const { t } = useTranslation()
  const { isXs, isSm, isMd } = useMatchBreakpoints()

  const [showExpandableSection, setShowExpandableSection] = useState(false)

  const lpLabel = farm.lpSymbol && farm.lpSymbol.replace('CoinCollect', '')
  const earnLabel = farm.earningToken ? farm.earningToken.symbol: t('COLLECT')

  const nftAddress = getAddress(farm.nftAddresses)
  const apyModalLink = "/nfts/collections/mint/" + nftAddress
  const isPromotedFarm = false //farm.token.symbol === 'COLLECT' Caution: Fix
  const sideRewards = farm.sideRewards ? farm.sideRewards : []
  const farmConfig = nftFarmsConfig.filter((farmConfig) => farmConfig.pid == farm.pid)[0]
  const { stakedBalance } = farm.userData || {}
  const dailyRewardAmount = farm.apr !== undefined && farm.apr !== null ? new BigNumber(farm.apr) : new BigNumber(0)
  const dailyRewardDisplay = displayApr ?? formatRewardAmount(dailyRewardAmount)
  const tokenBySymbol = Object.values(tokens).reduce<Record<string, Token>>((acc, token) => {
    if (token?.symbol) {
      acc[String(token.symbol).toUpperCase()] = token as Token
    }
    return acc
  }, {})
  const rewardChips = [
    { token: earnLabel, amount: dailyRewardDisplay, primary: true, tokenMeta: farm.earningToken },
    ...sideRewards.map((reward) => ({
      token: reward.token,
      amount: formatRewardAmount(dailyRewardAmount.multipliedBy(reward.percentage).dividedBy(100)),
      primary: false,
      tokenMeta: tokenBySymbol[String(reward.token).toUpperCase()],
    })),
  ]
  const rewardTokenCount = rewardChips.length
  const rewardTooltipContent = (
    <Flex flexDirection="column">
      {rewardChips.map((chip) => (
        <Text key={`tooltip-${chip.token}`} fontSize="12px">
          {`${chip.token}: ${chip.amount}`}
        </Text>
      ))}
    </Flex>
  )
  const useMobileRewardDetails = isXs || isSm || isMd
  const {
    targetRef: rewardTitleTargetRef,
    tooltip: rewardTitleTooltip,
    tooltipVisible: rewardTitleTooltipVisible,
  } = useTooltip(rewardTooltipContent, {
    placement: 'top',
    trigger: useMobileRewardDetails ? 'click' : 'hover',
  })
  
  // Helper function to determine APR color based on value
  const getAprMetricType = (aprValue?: BigNumber | null) => {
    if (!aprValue) return undefined

    const numericApr = aprValue.toNumber()
    if (numericApr >= 100) return 'high'
    if (numericApr >= 50) return 'medium'
    if (numericApr > 0) return 'low'
    return undefined
  }

  const contractLink = getPolygonScanLink(farm.contractAddresses ? getAddress(farm.contractAddresses) : nftAddress, 'address')
  const mainLink = farmConfig?.projectLink?.mainLink
  const mintLink = farmConfig?.projectLink?.getNftLink ?? apyModalLink

  return (
    <StyledCard
      $variant={variant}
      ribbon={farm.isFinished && <CardRibbon variantColor="textDisabled" text={t('Finished')} />}
      isActive={isPromotedFarm}
    >
      <FarmCardInnerContainer>
        <CardHeadingWithBanner
          lpLabel={lpLabel}
          multiplier={farm.multiplier}
          isCommunity={farm.isCommunity}
          nftToken={nftAddress}
          pid={farm.pid}
          disabled={farm.isFinished}
        />

{(!removed && stakedBalance?.eq(0)) && (
  <>
    {sideRewards.length === 0 ? (
      <Flex justifyContent="space-between" alignItems="center">
        <Text>{t('Daily Reward')}:</Text>
        <MetricText bold metricType={displayApr !== null ? getAprMetricType(dailyRewardAmount) : undefined} style={{ display: 'flex', alignItems: 'center' }}>
          {displayApr !== null ? dailyRewardDisplay : <Skeleton height={24} width={80} />}
        </MetricText>
      </Flex>
    ) : (
      <RewardTickerWrapper>
        <RewardTickerHeader>
          {rewardTitleTooltipVisible && rewardTitleTooltip}
          <RewardTitleWrap ref={rewardTitleTargetRef}>
            <RewardTitleChip>{t('Daily Rewards')}</RewardTitleChip>
            <RewardCountBadge>{rewardTokenCount}</RewardCountBadge>
          </RewardTitleWrap>
        </RewardTickerHeader>
        {displayApr !== null ? (
          <RewardTickerViewport>
            <RewardTickerTrack>
              {[...rewardChips, ...rewardChips].map((chip, index) => (
                <RewardChip key={`${chip.token}-${index}`} $primary={chip.primary}>
                  <RewardChipIcon token={chip.token} tokenMeta={chip.tokenMeta} />
                  {chip.token}
                  <RewardChipAmount>{chip.amount}</RewardChipAmount>
                </RewardChip>
              ))}
            </RewardTickerTrack>
          </RewardTickerViewport>
        ) : (
          <Skeleton height={18} width={180} />
        )}
      </RewardTickerWrapper>
    )}
  </>
)}

{sideRewards.length === 0 && (
  <Flex justifyContent="space-between">
    <Text>{t('Earn')}:</Text>
    <Text bold>{earnLabel}</Text>
  </Flex>
)}


        <CardActionsContainer
          farm={farm}
          lpLabel={lpLabel}
          account={account}
          cakePrice={cakePrice}
          addLiquidityUrl={apyModalLink}
        />
      </FarmCardInnerContainer>

      <ExpandingWrapper>
        <FooterTopRow>
          <FooterLinks>
            {mainLink && (
              <FooterIconWithTooltip href={mainLink} label={t('Visit project website')} IconComponent={HomeIcon} />
            )}
            {mintLink && (
              <FooterIconWithTooltip href={mintLink} label={t('Open mint page')} IconComponent={NftIcon} />
            )}
            {contractLink && (
              <FooterIconWithTooltip href={contractLink} label={t('View contract on explorer')} IconComponent={SmartContractIcon} />
            )}
          </FooterLinks>
          <ExpandableSectionButton
            onClick={() => setShowExpandableSection(!showExpandableSection)}
            expanded={showExpandableSection}
          />
        </FooterTopRow>
        {showExpandableSection && (
          <DetailsSection
            removed={removed}
            bscScanAddress={contractLink}
            earningToken={farm.earningToken}
            totalStaked={farm.liquidity}
            startTimestamp={farm.startTimestamp}
            endTimestamp={farm.endTimestamp}
            stakingLimit={farm.stakingLimit}
            stakingLimitEndTimestamp={farm.stakingLimitEndTimestamp}
            lpLabel={lpLabel}
            addLiquidityUrl={apyModalLink}
            isFinished={farm.isFinished}
            projectLink={farmConfig.projectLink}
          />
        )}
      </ExpandingWrapper>
    </StyledCard>
  )
}

export default FarmCard
