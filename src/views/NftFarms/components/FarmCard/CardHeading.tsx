import styled from 'styled-components'
import { Tag, Flex, Heading, Skeleton, TokenImage } from '@pancakeswap/uikit'
import { Token } from '@coincollect/sdk'
import { FarmAuctionTag, CoreTag } from 'components/Tags'


export interface ExpandableSectionProps {
  lpLabel?: string
  multiplier?: string
  nftToken?: string
}

const Wrapper = styled(Flex)`
  svg {
    margin-right: 4px;
  }
`

const MultiplierTag = styled(Tag)`
  margin-left: 4px;
`


const CardHeading: React.FC<ExpandableSectionProps> = ({ lpLabel, multiplier, nftToken }) => {
  return (
    <Wrapper justifyContent="space-between" alignItems="center" mb="12px">
      <TokenImage src={`/images/tokens/${nftToken}.svg`} width={64} height={64} />
      <Flex flexDirection="column" alignItems="flex-end">
        <Heading mb="4px">{lpLabel.split(' ')[0]}</Heading>
        {/*
        <Flex justifyContent="center">
          {multiplier ? (
            <MultiplierTag variant="secondary">{multiplier}</MultiplierTag>
          ) : (
            <Skeleton ml="4px" width={42} height={28} />
          )}
        </Flex>
       */}
      </Flex>
    </Wrapper>
  )
}

export default CardHeading
