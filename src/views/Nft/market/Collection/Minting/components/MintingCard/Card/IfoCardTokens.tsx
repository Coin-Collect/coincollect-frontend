import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Text, Box, Message, MessageText, Link } from '@pancakeswap/uikit'
import styled from 'styled-components'
import useWeb3React from 'hooks/useWeb3React'
import { Minting, PoolIds } from 'config/constants/types'
import { PublicIfoData, WalletIfoData } from 'views/Nft/market/Collection/Minting/types'
import { useTranslation } from 'contexts/Localization'
import { EnableStatus } from '../types'
import { SkeletonCardTokens } from './Skeletons'
import NFTMedia from 'views/Nft/market/components/NFTMedia'
import PreviewImage from 'views/Nft/market/components/CollectibleCard/PreviewImage'

const useAnimatedNumber = (value: number, duration = 1200): [string, boolean] => {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)
  const startValueRef = useRef(value)
  const animationRef = useRef<number>()
  const formatterRef = useRef<Intl.NumberFormat>()

  if (!formatterRef.current) {
    formatterRef.current = new Intl.NumberFormat()
  }

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const startValue = startValueRef.current
    if (startValue === value) {
      setDisplayValue(value)
      startValueRef.current = value
      setIsAnimating(false)
      return
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    setIsAnimating(true)
    const startTime = performance.now()

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(startValue + (value - startValue) * eased)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step)
      } else {
        startValueRef.current = value
        setIsAnimating(false)
      }
    }

    animationRef.current = requestAnimationFrame(step)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, duration])

  useEffect(() => {
    startValueRef.current = value
    setDisplayValue(value)
  }, [])

  const formatted = useMemo(
    () => formatterRef.current!.format(Math.max(0, Math.round(displayValue))),
    [displayValue],
  )

  return [formatted, isAnimating]
}

interface IfoCardTokensProps {
  poolId: PoolIds
  ifo: Minting
  publicIfoData: PublicIfoData
  walletIfoData: WalletIfoData
  hasProfile: boolean
  isLoading: boolean
  onApprove: () => Promise<any>
  enableStatus: EnableStatus
  criterias?: any
  isEligible?: boolean
  actionsSlot?: ReactNode
}

const MediaWrapper = styled(Box)`
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  box-shadow: 0 24px 60px rgba(12, 13, 15, 0.55);
`

const MediaGradient = styled(Box)`
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 11, 14, 0) 55%, rgba(10, 11, 14, 0.85) 100%);
  pointer-events: none;
`

const SlideshowContainer = styled(Box)`
  position: relative;
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
  aspect-ratio: 1;
  overflow: hidden;

  &::before {
    content: '';
    display: block;
    padding-bottom: 100%;
  }
`

const SlideFrame = styled(Box)<{ $active: boolean }>`
  position: absolute;
  inset: 0;
  opacity: ${({ $active }) => ($active ? 1 : 0)};
  transform: ${({ $active }) => ($active ? 'scale(1)' : 'scale(1.05)')};
  transition: opacity 600ms ease, transform 600ms ease;
  will-change: opacity, transform;
  display: flex;
  align-items: center;
  justify-content: center;
`

const SpeedFigure = styled(Text)`
  font-size: 34px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.04em;
  color: inherit;
  text-shadow: inherit;
  font-variant-numeric: tabular-nums;
  transition: transform 0.4s ease, text-shadow 0.4s ease;
  will-change: transform;

  ${({ theme }) => theme.mediaQueries.md} {
    font-size: 40px;
  }
`

const SpeedCounter = styled(Box)<{ $isAnimating: boolean }>`
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  color: #ffffff;
  text-shadow: 0 10px 22px rgba(10, 11, 14, 0.8);
  animation: pulse-glow 2.4s ease-in-out infinite;

  @keyframes pulse-glow {
    0%,
    100% {
      opacity: 0.95;
      transform: translateY(0);
    }
    50% {
      opacity: 1;
      transform: translateY(-2px);
    }
  }

  ${({ theme }) => theme.mediaQueries.sm} {
    top: 20px;
   left: 20px;
  }

  ${SpeedFigure} {
    transform: ${({ $isAnimating }) => ($isAnimating ? 'translateY(-4px)' : 'translateY(0)')};
    text-shadow: ${({ $isAnimating }) =>
      $isAnimating
        ? '0 16px 28px rgba(10, 11, 14, 0.9)'
        : '0 10px 22px rgba(10, 11, 14, 0.8)'};
  }
`

const SpeedLabel = styled(Text)`
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: inherit;
  text-shadow: inherit;
`

const SpeedHeader = styled(Box)`
  display: flex;
  align-items: flex-end;
  gap: 12px;
`

const SpeedSecondary = styled(Text)`
  margin-top: 6px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: inherit;
  text-shadow: inherit;
`

const ButtonOverlay = styled(Box)`
  position: absolute;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  display: flex;
  justify-content: center;
  pointer-events: none;

  > * {
    pointer-events: auto;
    flex: 1;
    max-width: 280px;
  }

  ${({ theme }) => theme.mediaQueries.md} {
    width: calc(100% - 48px);

    > * {
      max-width: 320px;
    }
  }
`

const MessageTextLink = styled(Link)`
  display: inline;
  text-decoration: underline;
  font-weight: bold;
  font-size: 14px;
  white-space: nowrap;
`

const IfoCardTokens: React.FC<IfoCardTokensProps> = ({ poolId, ifo, publicIfoData, walletIfoData, isLoading, actionsSlot }) => {
  const { account } = useWeb3React()
  const { t } = useTranslation()

  const { isHolder, discountAmount } = walletIfoData
  const { holderDiscountPercentage } = publicIfoData
  const { totalSupply, partialMaxSupply, cost, isLastPrice, nextPrice, lastPrice } = publicIfoData

  const { version } = ifo

  let { showCase, sampleNftImage, address, name } = ifo
  const baseShowcaseItems = useMemo(() => {
    const items: any[] = []

    if (sampleNftImage) {
      items.push({
        tokenId: sampleNftImage.tokenId,
        collectionAddress: address,
        name: `#${sampleNftImage.tokenId}`,
        collectionName: name,
        image: { thumbnail: sampleNftImage.image },
      })
    }

    if (showCase?.length) {
      showCase.forEach((item) => {
        items.push({
          tokenId: item.tokenId,
          collectionAddress: address,
          name: `#${item.tokenId}`,
          collectionName: name,
          image: { thumbnail: item.image },
        })
      })
    }

    if (!items.length) {
      return items
    }

    const deduped: typeof items = []
    const seen = new Set<string>()
    items.forEach((item) => {
      const key = `${item.collectionAddress}-${item.tokenId}-${item.image?.thumbnail}`
      if (!seen.has(key)) {
        seen.add(key)
        deduped.push(item)
      }
    })
    return deduped
  }, [sampleNftImage, showCase, address, name])

  const slideshowItems = baseShowcaseItems.length
    ? baseShowcaseItems
    : [
        {
          tokenId: 0,
          collectionAddress: address,
          name,
          collectionName: name,
          image: { thumbnail: showCase?.[0]?.image ?? sampleNftImage?.image },
        },
      ].filter((item) => item.image?.thumbnail)

  const [slideIndex, setSlideIndex] = useState(0)

  useEffect(() => {
    setSlideIndex(0)
  }, [slideshowItems])

  useEffect(() => {
    if (slideshowItems.length <= 1) {
      return undefined
    }
    const timer = window.setInterval(() => {
      setSlideIndex((prev) => {
        const next = prev + 1
        return next >= slideshowItems.length ? 0 : next
      })
    }, 4500)
    return () => window.clearInterval(timer)
  }, [slideshowItems])

  const mintedCount = typeof totalSupply === 'number' ? totalSupply : 0
  const discountCap = typeof partialMaxSupply === 'number' ? partialMaxSupply : 0
  const discountLeft = Math.max(discountCap - mintedCount, 0)
  const referencePrice = !isLastPrice ? lastPrice ?? nextPrice : undefined
  const discountPercentage =
    referencePrice && referencePrice > 0
      ? Math.max(Math.round(((referencePrice - (cost ?? 0)) / referencePrice) * 100), 0)
      : 0
  const [animatedDiscountLeft, isDiscountAnimating] = useAnimatedNumber(discountLeft)
  const [animatedMinted, isMintedAnimating] = useAnimatedNumber(mintedCount)
  const hasActiveDiscount = Boolean(discountCap > 0 && discountLeft > 0 && discountPercentage > 0)
  const primaryValue = hasActiveDiscount ? animatedDiscountLeft : animatedMinted
  const primaryLabel = hasActiveDiscount
    ? t('LEFT @ %discount%% OFF', { discount: discountPercentage })
    : t('MINTED')
  const secondaryLabel = hasActiveDiscount ? t('%count% minted', { count: animatedMinted }) : null
  const isPrimaryAnimating = hasActiveDiscount ? isDiscountAnimating : isMintedAnimating

  const renderTokenSection = () => {
    if (isLoading) {
      return <SkeletonCardTokens />
    }

    return (
      <>
        <MediaWrapper mb="18px">
          {slideshowItems.length > 0 && (
            <SlideshowContainer>
              {slideshowItems.map((item, index) => (
                <SlideFrame key={`${item.collectionAddress}-${item.tokenId}-${index}`} $active={index === slideIndex}>
                  <NFTMedia
                    style={{ backgroundPosition: 'center', width: '100%', height: '100%' }}
                    as={PreviewImage}
                    nft={item}
                    height={360}
                    width={360}
                    maxWidth="100%"
                    borderRadius="24px"
                  />
                </SlideFrame>
              ))}
            </SlideshowContainer>
          )}
          <MediaGradient />

          <SpeedCounter $isAnimating={isPrimaryAnimating}>
            <SpeedHeader>
            <SpeedFigure>{primaryValue}</SpeedFigure>
            <SpeedLabel>{primaryLabel}</SpeedLabel>
            </SpeedHeader>
            {secondaryLabel && <SpeedSecondary>{secondaryLabel}</SpeedSecondary>}
          </SpeedCounter>

          {actionsSlot && <ButtonOverlay>{actionsSlot}</ButtonOverlay>}
        </MediaWrapper>

        {(account && !isHolder && version === 3.1) && (
          <Message my="20px" p="10px" variant="warning">
            <Box>
              <MessageText display="inline" fontSize="14px">
                {t(
                  `You don't have any CoinCollect NFT, NFT holders get %${holderDiscountPercentage} discount and doesn't have to wait for the countdown.`,
                )}
              </MessageText>{' '}
              <MessageTextLink
                display="inline"
                fontWeight={700}
                href="https://market.coincollect.org/"
                target="_blank"
                color="failure"
              >
                {t('Not too late')} »
              </MessageTextLink>
            </Box>
          </Message>
        )}

        {(account && isHolder && version === 3.1) && (
          <Message mt="20px" p="10px" variant="success">
            <MessageText small display="inline">
              {t(`Wow! You are holder. You save ${discountAmount} POL and no need to wait for the countdown.`)}
            </MessageText>
          </Message>
        )}
      </>
    )
  }
  return (
    <Box>{renderTokenSection()}</Box>
  )
}

export default IfoCardTokens
