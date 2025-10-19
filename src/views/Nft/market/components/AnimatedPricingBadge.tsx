import React, { useState, useEffect, useMemo } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { Box, Text } from '@pancakeswap/uikit'
import useTranslation from 'contexts/Localization/useTranslation'

// Heartbeat animation for the badge
const heartbeat = keyframes`
  0% {
    transform: scale(1) translateY(0);
    box-shadow: 0 22px 46px rgba(32, 10, 78, 0.38);
  }
  14% {
    transform: scale(1.1) translateY(-2px);
    box-shadow: 0 28px 58px rgba(32, 10, 78, 0.52);
  }
  28% {
    transform: scale(1) translateY(0);
    box-shadow: 0 22px 46px rgba(32, 10, 78, 0.38);
  }
  42% {
    transform: scale(1.05) translateY(-1px);
    box-shadow: 0 25px 52px rgba(32, 10, 78, 0.45);
  }
  70% {
    transform: scale(1) translateY(0);
    box-shadow: 0 22px 46px rgba(32, 10, 78, 0.38);
  }
`

// Splash effect for price transitions
const splash = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`

// Pulse effect for countdown
const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 107, 107, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 107, 107, 0);
  }
`

// Glow effect for discount reveal
const glow = keyframes`
  0% {
    box-shadow: 0 22px 46px rgba(32, 10, 78, 0.38);
  }
  50% {
    box-shadow: 
      0 22px 46px rgba(32, 10, 78, 0.38),
      0 0 20px rgba(4, 22, 4, 0.6),
      inset 0 0 20px rgba(76, 175, 80, 0.1);
  }
  100% {
    box-shadow: 0 22px 46px rgba(32, 10, 78, 0.38);
  }
`

interface AnimatedBadgeProps {
  isCountingDown: boolean
  isDiscountRevealed: boolean
  size: 'normal' | 'large'
}

const AnimatedBadge = styled(Box)<AnimatedBadgeProps>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: ${({ size }) => size === 'large' ? '20px 28px' : '14px 20px'};
  border-radius: 28px;
  background: rgba(0, 0, 0, 0.5);
  color: #ffffff;
  text-align: right;
  overflow: hidden;
  isolation: isolate;
  min-width: 0;
  max-width: 320px;
  width: max-content;
  pointer-events: none;
  transform-origin: center;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);

  ${({ isCountingDown, isDiscountRevealed, size }) => {
    if (isCountingDown) {
      return css`
        animation: ${pulse} 1s infinite, ${heartbeat} 2s ease-in-out infinite;
        transform: scale(${size === 'large' ? 1.15 : 1.05});
      `
    }
    if (isDiscountRevealed) {
      return css`
        animation: ${glow} 3s ease-in-out infinite, ${heartbeat} 4s ease-in-out infinite;
      `
    }
    return css`
      animation: ${heartbeat} 6s ease-in-out infinite;
    `
  }}
`

const PriceValue = styled(Text)<{ isAnimating: boolean; size: 'normal' | 'large' }>`
  margin-top: 4px;
  font-size: ${({ size }) => size === 'large' ? '52px' : '36px'};
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1.1;
  text-shadow:
    0 26px 52px rgba(2, 2, 8, 0.65),
    0 0 24px rgba(0, 0, 0, 0.45),
    0 0 2px rgba(0, 0, 0, 0.8);
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.65);
  paint-order: stroke fill;
  transition: all 0.3s ease;

  ${({ isAnimating }) => isAnimating && css`
    animation: ${splash} 0.6s ease-out;
  `}

  ${({ theme }) => theme.mediaQueries.md} {
    font-size: ${({ size }) => size === 'large' ? '64px' : '48px'};
  }
`

const SubText = styled(Text)<{ size: 'normal' | 'large' }>`
  margin-top: 6px;
  font-size: ${({ size }) => size === 'large' ? '17px' : '15px'};
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-shadow:
    0 14px 32px rgba(2, 2, 8, 0.55),
    0 0 16px rgba(0, 0, 0, 0.35),
    0 0 1px rgba(0, 0, 0, 0.8);
  -webkit-text-stroke: 0.75px rgba(0, 0, 0, 0.6);
  paint-order: stroke fill;
  transition: all 0.3s ease;
`

const CountdownText = styled(Text)`
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.9;
  margin-bottom: 2px;
`

interface AnimatedPricingBadgeProps {
  originalPrice: number
  discountedPrice: number
  discountPercent: number
  leftDisplay?: string
  countdownDuration?: number // in seconds
}

const AnimatedPricingBadge: React.FC<AnimatedPricingBadgeProps> = ({
  originalPrice,
  discountedPrice,
  discountPercent,
  leftDisplay,
  countdownDuration = 5
}) => {
  const { t } = useTranslation()
  const [currentPrice, setCurrentPrice] = useState(originalPrice)
  const [isCountingDown, setIsCountingDown] = useState(true)
  const [isDiscountRevealed, setIsDiscountRevealed] = useState(false)
  const [countdown, setCountdown] = useState(countdownDuration)
  const [isAnimating, setIsAnimating] = useState(false)

  // Calculate size based on countdown state
  const badgeSize = useMemo(() => {
    return isCountingDown ? 'large' : 'normal'
  }, [isCountingDown])

  useEffect(() => {
    if (!isCountingDown) return

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Countdown finished, reveal discount
          setIsCountingDown(false)
          setIsDiscountRevealed(true)
          setIsAnimating(true)
          
          // Animate price change
          setTimeout(() => {
            setCurrentPrice(discountedPrice)
            setTimeout(() => setIsAnimating(false), 600)
          }, 100)
          
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isCountingDown, discountedPrice])

  // Format price for display
  const formatPrice = (price: number) => {
    return price.toFixed(2)
  }

  return (
    <AnimatedBadge
      isCountingDown={isCountingDown}
      isDiscountRevealed={isDiscountRevealed}
      size={badgeSize}
    >
      {isCountingDown && (
        <CountdownText>
          {t('DISCOUNT IN %seconds%s', { seconds: countdown })}
        </CountdownText>
      )}
      
      <PriceValue 
        isAnimating={isAnimating}
        size={badgeSize}
      >
        {isDiscountRevealed 
          ? t('%percent%% OFF', { percent: discountPercent })
          : `$${formatPrice(currentPrice)}`
        }
      </PriceValue>
      
      {isDiscountRevealed && leftDisplay && (
        <SubText size={badgeSize}>
          {t('%count% left at this price', { count: leftDisplay })}
        </SubText>
      )}
      
      {isCountingDown && (
        <SubText size={badgeSize}>
          {t('Regular Price')}
        </SubText>
      )}
    </AnimatedBadge>
  )
}

export default AnimatedPricingBadge