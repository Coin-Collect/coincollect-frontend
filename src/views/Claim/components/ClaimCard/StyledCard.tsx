import styled from 'styled-components'
import { Card } from '@pancakeswap/uikit'

export const StyledCard = styled(Card)<{ isFinished?: boolean }>`
  max-width: 352px;
  margin: 0 8px 24px;
  width: 100%;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  align-self: baseline;
  position: relative;
  color: ${({ isFinished, theme }) => theme.colors[isFinished ? 'textDisabled' : 'secondary']};

  ${({ theme }) => theme.mediaQueries.sm} {
    margin: 0 12px 46px;
  }

  img {
    transition: transform 0.3s ease, filter 0.3s ease;
    transform-origin: center center;
    will-change: transform;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover img {
      transform: scale(1.03);
      filter: saturate(1.03);
    }
  }
`

export default StyledCard
