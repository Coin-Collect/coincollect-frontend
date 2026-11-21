import styled, { keyframes } from 'styled-components'

interface SliceProps {
  length: number
  offset?: number
}

export const DrawAnimation = keyframes`
  from {
    stroke-dasharray: 0, 339.292
  }
  to {
    stroke-dasharray: var(--slice-length) 339.292;
  }
`

export const OffsetAnimation = keyframes`
  from {
    stroke-dashoffset: 0
  }
  to {
    stroke-dashoffset: var(--slice-offset);
  }
`

export const SVG = styled.svg`
  width: 128px;
  height: 128px;
  transform: rotate(-90deg);
`

const DefaultSlice = styled.circle<SliceProps>`
  --slice-length: ${({ length }) => length};
  --slice-offset: ${({ offset = 0 }) => -offset};
  fill: none;
  stroke-width: 16;
  stroke-dasharray: ${(props) => `${props.length} 339.292`};
`

export const LostSlice = styled(DefaultSlice)`
  stroke: #ed4b9e;
  animation: ${DrawAnimation} 1s ease;
`

export const WonSlice = styled(DefaultSlice)`
  stroke: #31d0aa;
  stroke-dashoffset: var(--slice-offset);
  animation: ${DrawAnimation} 1s ease, ${OffsetAnimation} 1s ease;
`

export const Wrapper = styled.div`
  position: relative;
  width: 128px;
  height: 128px;
`

export const Info = styled.div`
  width: 128px;
  height: 128px;
  border-radius: 50%;
  position: absolute;
  left: 0;
  top: 0;
  z-index: 2;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`
