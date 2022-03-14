import { Box } from '@pancakeswap/uikit'
import styled from 'styled-components'

const MintingLayout = styled(Box)`
  > div:not(.sticky-header) {
    margin-bottom: 32px;
  }
`
export const MintingLayoutWrapper = styled(MintingLayout)`
  column-gap: 32px;

  > div {
    margin: 0 auto;
    align-items: flex-start;
  }
`

export default MintingLayout
