import styled from 'styled-components'
import { Box, Flex, BunnyPlaceholderIcon, ProfileAvatar, Skeleton, Text } from '@pancakeswap/uikit'
import truncateHash from 'utils/truncateHash'
import { useProfileForAddress } from 'state/profile/hooks'
import { NextLinkFromReactRouter } from 'components/NextLink'
import { nftsBaseUrl } from '../constants'

const StyledFlex = styled(Flex)`
  align-items: center;
  transition: opacity 200ms ease-in;

  &:hover {
    opacity: 0.5;
  }
`

const ProfileCell: React.FC<{ accountAddress: string }> = ({ accountAddress }) => {
  const { profile, isFetching } = useProfileForAddress(accountAddress)
  const profileName = profile?.username || '-'

  let sellerProfilePicComponent = <Skeleton width="32px" height="32px" mr={['4px', null, '12px']} />
  if (!isFetching) {
    if (profile?.nft?.image?.thumbnail) {
      sellerProfilePicComponent = (
        <ProfileAvatar
          src={profile.nft.image.thumbnail}
          width={32}
          height={32}
          mr={['4px', null, '12px']}
          alt="Profile avatar"
        />
      )
    } else {
      sellerProfilePicComponent = <BunnyPlaceholderIcon width="32px" height="32px" mr={['4px', null, '12px']} />
    }
  }

  return (
    <NextLinkFromReactRouter to={`${nftsBaseUrl}/profile/${accountAddress}`}>
      <StyledFlex>
        {sellerProfilePicComponent}
        <Box display="inline">
          <Text lineHeight="1.25">{truncateHash(accountAddress)}</Text>
          {isFetching ? <Skeleton /> : <Text lineHeight="1.25">{profileName}</Text>}
        </Box>
      </StyledFlex>
    </NextLinkFromReactRouter>
  )
}

export default ProfileCell
