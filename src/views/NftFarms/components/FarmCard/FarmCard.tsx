import { useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
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
import type { ExpandableSectionProps } from './DetailsSection'
import CardHeadingWithBanner from './CardHeadingWithBanner'
import CardActionsContainer, { Action } from './CardActionsContainer'
import ApyButton from './ApyButton'
import nftFarmsConfig from 'config/constants/nftFarms'
import tokens from 'config/constants/tokens'
import formatRewardAmount from 'utils/formatRewardAmount'
import { Token } from '@coincollect/sdk'
import { BigNumber as EthersBigNumber } from '@ethersproject/bignumber'
import type { PublicV2Pool } from 'features/nftPoolManager/publication'
import { formatBaseUnits } from 'features/nftPoolManager/economics'
import { getPolygonRuntimeChainId } from 'config/localFork'
import { calculateRewardSharePreview } from 'features/nftPoolManager/studio/economicsPreview'
import useWeb3React from 'hooks/useWeb3React'
import { usePublishedV2UserPosition } from 'features/nftPoolManager/user/hooks'
import V2PoolControls from 'features/nftPoolManager/user/components/V2PoolControls'

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

const finishedRibbonShine = keyframes`
  0% {
    opacity: 0;
    transform: translateX(-180%) skewX(-18deg);
  }

  22% {
    opacity: 0;
  }

  38% {
    opacity: 0.72;
  }

  62%,
  100% {
    opacity: 0;
    transform: translateX(320%) skewX(-18deg);
  }
`

const finishedRibbonFlow = keyframes`
  from {
    background-position: 0 0;
  }

  to {
    background-position: 40px 40px;
  }
`

const FinishedRibbon = styled(CardRibbon)`
  ${({ theme }) => {
    const contrastStripe = theme.isDark ? '#ffffff' : '#141414'
    const ribbonText = theme.isDark ? theme.colors.invertedContrast : '#ffffff'

    return css`
      background-color: ${contrastStripe};
      background-image: linear-gradient(rgba(16, 16, 16, 0.14), rgba(16, 16, 16, 0.14)),
        repeating-linear-gradient(120deg, ${contrastStripe} 0 10px, ${theme.colors.primary} 10px 20px);
      color: ${ribbonText};
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);

      &:before,
      &:after {
        background-color: ${contrastStripe};
        background-image: inherit;
        background-size: inherit;
        animation: inherit;
      }

      & > div {
        color: ${ribbonText};
        text-shadow: ${theme.isDark ? '0 1px 2px rgba(255, 255, 255, 0.16)' : '0 1px 2px rgba(0, 0, 0, 0.8)'};
      }
    `
  }}
  background-size: 40px 40px;
  animation: ${finishedRibbonFlow} 4.2s linear infinite;

  & > div {
    position: relative;
    overflow: hidden;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;

    &:after {
      position: absolute;
      top: -40%;
      bottom: -40%;
      left: 0;
      width: 24%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.78), transparent);
      content: '';
      pointer-events: none;
      transform: translateX(-180%) skewX(-18deg);
      animation: ${finishedRibbonShine} 4s ease-in-out infinite;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;

    &:before,
    &:after {
      animation: none;
    }

    & > div:after {
      animation: none;
    }
  }
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
        return theme.colors.success
      case 'medium':
        return theme.colors.warning
      case 'low':
        return theme.colors.failure
      case 'reward':
        return theme.colors.primary
      default:
        return theme.colors.text
    }
  }};
  font-weight: ${({ metricType }) => (metricType ? '600' : 'inherit')};
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
  tokenMeta?: Pick<Token, 'address' | 'symbol'>
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
    return <RewardTokenImage src={iconSrc} alt={`${token} icon`} onError={() => setIconIndex((prev) => prev + 1)} />
  }

  return <RewardTokenFallbackIcon>{String(token).slice(0, 1)}</RewardTokenFallbackIcon>
}

interface FarmCardProps {
  farm: NftFarmWithStakedValue
  displayApr: string
  removed: boolean
  cakePrice?: BigNumber
  account?: string
  variant?: 'default' | 'expanded'
}

// One reward presentation for both legacy and address-native pools.
function DailyRewards({
  chips,
  loading = false,
  note,
}: {
  chips: Array<{ token: string; amount: string; primary: boolean; tokenMeta?: Pick<Token, 'address' | 'symbol'> }>
  loading?: boolean
  note?: string
}) {
  const { t } = useTranslation()
  const { isXs, isSm, isMd } = useMatchBreakpoints()
  const { targetRef, tooltip, tooltipVisible } = useTooltip(
    <Flex flexDirection="column">
      {chips.map((chip) => (
        <Text key={chip.token} fontSize="12px">
          {chip.token}: {chip.amount}
        </Text>
      ))}
      {note && <Text fontSize="12px">{note}</Text>}
    </Flex>,
    { placement: 'top', trigger: isXs || isSm || isMd ? 'click' : 'hover' },
  )
  if (chips.length === 1) {
    const amount = new BigNumber(chips[0].amount)
    const metricType = amount.gte(100) ? 'high' : amount.gte(50) ? 'medium' : amount.gt(0) ? 'low' : undefined
    return (
      <Flex justifyContent="space-between" alignItems="center">
        <Text>{t('Daily Reward')}:</Text>
        <MetricText bold metricType={metricType} ref={targetRef} style={{ display: 'flex', alignItems: 'center' }}>
          {loading ? <Skeleton height={24} width={80} /> : chips[0].amount}
        </MetricText>
        {tooltipVisible && tooltip}
      </Flex>
    )
  }
  return (
    <RewardTickerWrapper>
      <RewardTickerHeader>
        {tooltipVisible && tooltip}
        <RewardTitleWrap ref={targetRef}>
          <RewardTitleChip>{t('Daily Rewards')}</RewardTitleChip>
          <RewardCountBadge>{chips.length}</RewardCountBadge>
        </RewardTitleWrap>
      </RewardTickerHeader>
      {loading ? (
        <Skeleton height={18} width={180} />
      ) : (
        <RewardTickerViewport>
          <RewardTickerTrack>
            {[...chips, ...chips].map((chip, index) => (
              <RewardChip key={`${chip.token}-${index}`} $primary={chip.primary}>
                <RewardChipIcon token={chip.token} tokenMeta={chip.tokenMeta} />
                {chip.token}
                <RewardChipAmount>{chip.amount}</RewardChipAmount>
              </RewardChip>
            ))}
          </RewardTickerTrack>
        </RewardTickerViewport>
      )}
    </RewardTickerWrapper>
  )
}

function NftFarmCardLayout({
  children,
  heading,
  variant = 'default',
  finished,
  isActive = false,
  mainLink,
  mintLink,
  contractLink,
  details,
  poolAddress,
}: {
  children: ReactNode
  heading: ReactNode | ((openDetails: () => void) => ReactNode)
  variant?: 'default' | 'expanded'
  finished?: boolean
  isActive?: boolean
  mainLink?: string
  mintLink?: string
  contractLink?: string
  details: ExpandableSectionProps
  poolAddress?: string
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  return (
    <StyledCard
      $variant={variant}
      ribbon={finished && <FinishedRibbon text={t('Finished')} />}
      isActive={isActive}
      data-testid={poolAddress ? 'published-nft-pool' : undefined}
      data-pool-address={poolAddress}
    >
      <FarmCardInnerContainer>
        {typeof heading === 'function' ? heading(() => setExpanded(true)) : heading}
        {children}
      </FarmCardInnerContainer>
      <ExpandingWrapper>
        <FooterTopRow>
          <FooterLinks>
            {mainLink && (
              <FooterIconWithTooltip href={mainLink} label={t('Visit project website')} IconComponent={HomeIcon} />
            )}
            {mintLink && <FooterIconWithTooltip href={mintLink} label={t('Open mint page')} IconComponent={NftIcon} />}
            {contractLink && (
              <FooterIconWithTooltip
                href={contractLink}
                label={t('View contract on explorer')}
                IconComponent={SmartContractIcon}
              />
            )}
          </FooterLinks>
          <ExpandableSectionButton onClick={() => setExpanded((value) => !value)} expanded={expanded} />
        </FooterTopRow>
        {expanded && <DetailsSection {...details} />}
      </ExpandingWrapper>
    </StyledCard>
  )
}

const FarmCard: React.FC<FarmCardProps> = ({ farm, displayApr, removed, cakePrice, account, variant = 'default' }) => {
  const { t } = useTranslation()

  const lpLabel = farm.lpSymbol && farm.lpSymbol.replace('CoinCollect', '')
  const earnLabel = farm.earningToken ? farm.earningToken.symbol : t('COLLECT')

  const nftAddress = getAddress(farm.nftAddresses)
  const apyModalLink = '/nfts/collections/mint/' + nftAddress
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

  const contractLink = getPolygonScanLink(
    farm.contractAddresses ? getAddress(farm.contractAddresses) : nftAddress,
    'address',
  )
  const mainLink = farmConfig?.projectLink?.mainLink
  const mintLink = farmConfig?.projectLink?.getNftLink ?? apyModalLink

  return (
    <NftFarmCardLayout
      variant={variant}
      finished={farm.isFinished}
      isActive={isPromotedFarm}
      mainLink={mainLink}
      mintLink={mintLink}
      contractLink={contractLink}
      details={{
        removed,
        bscScanAddress: contractLink,
        earningToken: farm.earningToken,
        totalStaked: farm.liquidity,
        startTimestamp: farm.startTimestamp,
        endTimestamp: farm.endTimestamp,
        stakingLimit: farm.stakingLimit,
        stakingLimitEndTimestamp: farm.stakingLimitEndTimestamp,
        lpLabel,
        addLiquidityUrl: apyModalLink,
        isFinished: farm.isFinished,
        projectLink: farmConfig?.projectLink,
      }}
      heading={
        <CardHeadingWithBanner
          lpLabel={lpLabel}
          multiplier={farm.multiplier}
          isCommunity={farm.isCommunity}
          nftToken={nftAddress}
          pid={farm.pid}
          disabled={farm.isFinished}
        />
      }
    >
      {!removed && stakedBalance?.eq(0) && <DailyRewards chips={rewardChips} loading={displayApr === null} />}

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
    </NftFarmCardLayout>
  )
}

function formatPublicPoolAmount(value: string | undefined, decimals: number | undefined, precision = 6): string {
  if (value === undefined || decimals === undefined) return 'Unavailable'
  try {
    return formatBaseUnits(EthersBigNumber.from(value), decimals, precision)
  } catch {
    return 'Unavailable'
  }
}

export function PublishedNftPoolFarmCard({ pool, error }: { pool: PublicV2Pool; error?: string }) {
  const { t } = useTranslation()
  const { account, chainId, library } = useWeb3React()
  const userPosition = usePublishedV2UserPosition(pool, account, chainId, library)
  const { metadata, snapshot } = pool
  const displayStatus = userPosition.position?.status || snapshot.status
  const primaryReward = snapshot.rewards[0]
  const mainLink = metadata.projectUrl
  const mintLink =
    metadata.getNftUrl ||
    (snapshot.collections[0]?.address ? `/nfts/collections/${snapshot.collections[0].address}` : undefined)
  const explorerLink = getPolygonRuntimeChainId() === 137 ? getPolygonScanLink(pool.address, 'address') : undefined
  const highestWeight = snapshot.collections.reduce((max, collection) => {
    const weight = EthersBigNumber.from(collection.weight)
    return weight.gt(max) ? weight : max
  }, EthersBigNumber.from(1))
  const currentShares = EthersBigNumber.from(snapshot.totalShares || '0')
  const preview = calculateRewardSharePreview({
    rewardPerBlock: EthersBigNumber.from(snapshot.rewardPerBlock),
    participantWeight: highestWeight,
    totalShares: currentShares.gt(highestWeight) ? currentShares : highestWeight,
    participantThreshold: EthersBigNumber.from(snapshot.threshold),
    secondsPerBlock: snapshot.secondsPerBlock || 2.2,
  })
  const rewardChips = snapshot.rewards.map((reward, index) => ({
    token: reward.symbol,
    amount:
      !snapshot.secondsPerBlock || reward.decimals === undefined || (index > 0 && reward.percentage === undefined)
        ? 'Unavailable'
        : formatRewardAmount(
            new BigNumber(
              formatPublicPoolAmount(
                index === 0
                  ? preview.dailyReward.toString()
                  : preview.dailyReward
                      .mul(reward.percentage || '0')
                      .div(100)
                      .toString(),
                reward.decimals,
                18,
              ),
            ),
          ),
    primary: index === 0,
    tokenMeta: reward,
  }))
  const positionRewardChips = userPosition.position?.rewards.map((reward, index) => ({
    token: reward.symbol,
    amount: formatRewardAmount(new BigNumber(formatPublicPoolAmount(reward.amount, reward.decimals, 18))),
    primary: index === 0,
    tokenMeta: reward,
  }))
  const hasUserPosition = Boolean(userPosition.position && new BigNumber(userPosition.position.nftCount).gt(0))

  return (
    <NftFarmCardLayout
      finished={displayStatus === 'FINISHED'}
      poolAddress={pool.address}
      mainLink={mainLink}
      mintLink={mintLink}
      contractLink={explorerLink}
      details={{
        publishedPool: pool,
        removed: displayStatus === 'FINISHED',
        isFinished: displayStatus === 'FINISHED',
        bscScanAddress: explorerLink,
        earningToken: primaryReward,
        totalStaked: snapshot.stakedBalance !== undefined ? new BigNumber(snapshot.stakedBalance) : undefined,
        lpLabel: metadata.name,
        addLiquidityUrl: mintLink,
        projectLink: { mainLink, getNftLink: mintLink },
      }}
      heading={(openDetails) => (
        <CardHeadingWithBanner
          lpLabel={metadata.name}
          onOpenDetails={openDetails}
          isCommunity={metadata.isCommunity}
          disabled={displayStatus === 'FINISHED'}
          publishedPool={{
            banner: metadata.banner,
            status: displayStatus,
            collections: snapshot.collections.map((collection) => ({
              address: collection.address,
              name: collection.name,
              image: collection.image,
              weight: collection.weight,
            })),
          }}
        />
      )}
    >
      {hasUserPosition && positionRewardChips ? (
        <DailyRewards
          chips={positionRewardChips}
          note="Primary pending is read from this pool. Side reward amounts are estimates using the contract payout rounding."
        />
      ) : displayStatus !== 'FINISHED' ? (
        <DailyRewards
          chips={rewardChips}
          note={`Estimated daily rewards for one ${highestWeight.toString()}x NFT; shared by pool power. Block timing is an estimate.`}
        />
      ) : null}
      {snapshot.rewards.length === 1 && (
        <Flex justifyContent="space-between">
          <Text>{t('Earn')}:</Text>
          <Text bold>{primaryReward?.symbol}</Text>
        </Flex>
      )}
      <Action>
        <V2PoolControls
          pool={pool}
          position={userPosition.position}
          loading={userPosition.loading}
          refreshing={userPosition.refreshing}
          error={userPosition.error}
          refresh={userPosition.refresh}
        />
      </Action>
      {error ? (
        <Text small role="status">
          Chain refresh unavailable; showing the last verified snapshot.
        </Text>
      ) : null}
    </NftFarmCardLayout>
  )
}

export default FarmCard
