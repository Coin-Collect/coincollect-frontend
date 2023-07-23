import styled from 'styled-components'
import { Tag, Flex, Heading, Skeleton, TokenImage, ProfileAvatar } from '@pancakeswap/uikit'
import { Token } from '@coincollect/sdk'
import { FarmAuctionTag, CoreTag } from 'components/Tags'
import { mintingConfig } from 'config/constants'


export interface ExpandableSectionProps {
  lpLabel?: string
  multiplier?: string
  nftToken?: string
  pid?:number
}

const Wrapper = styled(Flex)`
  svg {
    margin-right: 4px;
  }
`

const MultiplierTag = styled(Tag)`
  margin-left: 4px;
`

const CardHeading: React.FC<ExpandableSectionProps> = ({ lpLabel, multiplier, nftToken, pid }) => {
  const collectionData = mintingConfig.find((collection) => collection.stake_pid == pid)
  return (
    <Wrapper justifyContent="space-between" alignItems="center" mb="12px">
      <ProfileAvatar src={collectionData ? collectionData.avatar : ""} width={64} height={64} />
      <Flex flexDirection="column" alignItems="flex-end">
        <Heading mb="4px">{lpLabel}</Heading>
      </Flex>
    </Wrapper>
  )
}

export default CardHeading