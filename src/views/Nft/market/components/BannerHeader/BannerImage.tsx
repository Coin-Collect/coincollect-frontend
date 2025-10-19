import { Box } from '@pancakeswap/uikit';
import styled from 'styled-components'

const StyledBannerImageWrapper = styled(Box)`
  background-color: ${({ theme }) => theme.colors.background};
  width: 100%;
  height: 180px;
  max-height: 300px;
  border-radius: 0;
  overflow: hidden;
  position: relative;
  flex: none;
  position: relative;
  width: 100%;
  border-radius: 0;
  height: 223px;
  overflow: hidden;
  max-height: 300px;

  ${({ theme }) => theme.mediaQueries.sm} {
    height: 192px;
  }

  ${({ theme }) => theme.mediaQueries.md} {
    height: 256px;
  }

  ${({ theme }) => theme.mediaQueries.lg} {
    height: 300px;
  }
`

export default StyledBannerImageWrapper
