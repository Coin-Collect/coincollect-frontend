import { ReactNode } from 'react'
import { Box, Grid, GridProps, Heading, Flex, Link } from '@pancakeswap/uikit'
import { BscScanIcon } from '@pancakeswap/uikit'
import { getPolygonScanLink } from 'utils'
import useWeb3React from 'hooks/useWeb3React'

interface MarketPageTitleProps extends GridProps {
  title: string
  description?: ReactNode
  accountPath?: string | null
}

const MarketPageTitle: React.FC<MarketPageTitleProps> = ({ title, description, children, accountPath, ...props }) => {
  const scanLink = accountPath ? getPolygonScanLink(accountPath, 'address') : undefined

  return (
    <Grid gridGap="16px" alignItems="center" gridTemplateColumns={['1fr', null, null, null, 'repeat(2, 1fr)']} {...props}>
      <Box>
        {accountPath && scanLink ? (
          <Link href={scanLink} external>
            <Flex alignItems="center" mb="16px">
              <BscScanIcon width="20px" mr="8px" />
              <Heading as="h2" scale="xl" color="secondary">
                {title}
              </Heading>
            </Flex>
          </Link>
        ) : (
          <Heading as="h1" scale="xl" color="secondary" mb="16px">
            {title}
          </Heading>
        )}
        {description}
      </Box>
      <Box>{children}</Box>
    </Grid>
  )
}

export default MarketPageTitle
