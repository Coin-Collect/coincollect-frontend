import styled from 'styled-components'
import { Tag, Flex, Heading, Skeleton, TokenImage, ProfileAvatar, CardBody } from '@pancakeswap/uikit'
import { Token } from '@coincollect/sdk'
import { FarmAuctionTag, CoreTag } from 'components/Tags'
import Image from 'next/image'


export interface ExpandableSectionProps {
  lpLabel?: string
  multiplier?: string
  nftToken?: string
  disabled?: boolean
}

const Wrapper = styled(Flex)`
  svg {
    margin-right: 4px;
  }
`

const MultiplierTag = styled(Tag)`
  margin-left: 4px;
`

const StyledImage = styled(Image)`
  border-radius: 4px;
`

export const CollectionAvatar = styled(ProfileAvatar)`
  left: 0;
  position: absolute;
  top: -32px;
  border: 4px white solid;
`

const CardHeading: React.FC<ExpandableSectionProps> = ({ lpLabel, multiplier, nftToken, disabled= false }) => {
  return (
    <CardBody p="0px">
      <StyledImage src={"https://coincollect.org/assets/images/clone/banners/bannerBronzeSm.png"} height={125} width={375} />
      <Flex
        position="relative"
        height="65px"
        justifyContent="center"
        alignItems="flex-end"
        py="8px"
        flexDirection="column"
      >
        <CollectionAvatar src={"https://coincollect.org/assets/images/clone/nft350.png"} width={96} height={96} />
        <Heading color={disabled ? 'textDisabled' : 'body'} as="h3" mb={'8px'}>
          {/*lpLabel.split(' ')[0]*/ "CoinCollect Starter NFT"}
        </Heading>
      </Flex>
    </CardBody>
  )
}

export default CardHeading
