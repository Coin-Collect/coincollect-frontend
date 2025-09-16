import styled, { css, keyframes } from 'styled-components'
import { DEFAULT_ANIMATION_DURATION_MS } from 'hooks/useAnimatedRewardValue'

const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  20% {
    transform: scale(1.18);
  }
  60% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`

export const AnimatedValue = styled.span<{ $animate?: boolean }>`
  display: inline-block;
  font-variant-numeric: tabular-nums;
  transition: transform 0.2s ease;
  ${({ $animate }) =>
    $animate &&
    css`
      animation: ${pulse} ${DEFAULT_ANIMATION_DURATION_MS}ms ease;
    `}
`

export default AnimatedValue
