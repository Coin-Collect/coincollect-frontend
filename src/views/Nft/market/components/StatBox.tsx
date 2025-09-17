import { ReactNode } from 'react'
import styled from 'styled-components'
import { Box, BoxProps, Flex, Skeleton, Text } from '@pancakeswap/uikit'

export interface StatBoxItemProps extends BoxProps {
  title: string
  stat?: ReactNode | null
}

export const StatBoxItem: React.FC<StatBoxItemProps> = ({ title, stat, ...props }) => (
  <Box flex="1 1 120px" minWidth="120px" {...props}>
    <Text fontSize="12px" color="textSubtle" textAlign="center">
      {title}
    </Text>
    {stat === null || stat === undefined ? (
      <Skeleton height="24px" width="50%" mx="auto" />
    ) : (
      <Text fontWeight="600" textAlign="center">
        {stat}
      </Text>
    )}
  </Box>
)

const StatBox = styled(Flex)`
  align-items: stretch;
  background: ${({ theme }) => theme.colors.invertedContrast};
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: ${({ theme }) => theme.radii.card};
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  padding: 16px;
  width: 100%;

  ${({ theme }) => theme.mediaQueries.md} {
    gap: 24px;
    justify-content: space-between;
  }
`

export default StatBox
