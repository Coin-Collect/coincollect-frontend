import styled from 'styled-components'
import { Tag, Flex, Heading, Skeleton, TokenImage, ProfileAvatar, CardBody, Text } from '@pancakeswap/uikit'
import { Token } from '@coincollect/sdk'
import { FarmAuctionTag, CommunityTag, PartnerTag } from 'components/Tags'
import Image from 'next/image'
import { mintingConfig } from 'config/constants'
import nftFarmsConfig from 'config/constants/nftFarms'


export interface ExpandableSectionProps {
  lpLabel?: string
  multiplier?: string
  isCommunity?: boolean
  nftToken?: string
  pid?: number
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
  border-radius: 8px;
`

export const CollectionAvatar = styled(ProfileAvatar)`
  left: 0;
  position: absolute;
  top: 30px;
  border: 1px white solid;
  width: 25px;
  height: 25px;
  cursor: pointer !important;
`

const CardHeadingWithBanner: React.FC<ExpandableSectionProps> = ({ lpLabel, multiplier, isCommunity, nftToken, pid, disabled = false }) => {
  const collectionData = mintingConfig.find((collection) => collection.stake_pid === pid)
  const nftFarmData = nftFarmsConfig.find((nftFarm) => nftFarm.pid === pid)
  const banner = nftFarmData["banner"] ? nftFarmData["banner"] : collectionData?.banner.small
  //const avatar = nftFarmData["avatar"] ? nftFarmData["avatar"] : collectionData?.avatar

  // This expression is used to access the avatar and other information of the main NFT of the pool.
  // Todo: In the future, I plan to add the mainNftPid value to supportedNfts.
  const firstFarmOfMainNft = nftFarmsConfig.find((nftFarm) => nftFarm.nftAddresses?.[137] === nftFarmData.nftAddresses?.[137])
  const supportedCollectionPids = nftFarmData["supportedCollectionPids"] ? [firstFarmOfMainNft.pid, ...nftFarmData["supportedCollectionPids"]] : [firstFarmOfMainNft.pid]
  const supportedNftStakeFarms = nftFarmsConfig.filter(
    (farm) => supportedCollectionPids.includes(farm.pid)
  )


  let avatars = [];
  let collectBadgeAdded = false;
  for (let i = 0; i < supportedNftStakeFarms.length; i++) {
    let farm = supportedNftStakeFarms[i];
    const dataFromMinting = mintingConfig.find((collection) => collection.stake_pid === farm.pid)

    if (farm.pid <= 4) {
      if (!collectBadgeAdded) {
        avatars.push({ avatar: "/logo.png" });
        collectBadgeAdded = true;
      }
    } else {
      avatars.push({ avatar: farm["avatar"] ?? dataFromMinting?.avatar });
    }

    if (avatars.length > 4) {
      avatars.push({ avatar: "https://cdn-icons-png.flaticon.com/512/2550/2550282.png" });
      break;
    }

  }
  

  return (
    <CardBody p="0px">
      <Flex justifyContent="center">
        <StyledImage src={banner} height={125} width={375} />
      </Flex>
      <Flex
        position="relative"
        height="65px"
        justifyContent="center"
        alignItems="flex-end"
        py="8px"
        flexDirection="column"
      >


        {avatars.map((avatar, index) => (
          <CollectionAvatar
            key={index}
            src={avatar["avatar"]}
            width={50}
            height={50}
            style={{ left: `${index * 15}px` }}
          />
        ))}
        <Text color='gold' fontSize={14} style={{ position: 'absolute', left: '0px', top: '8px' }}>Allowed NFTs:</Text>


        <Heading color={disabled ? 'textDisabled' : 'body'} as="h3" mb={'8px'}>
          {lpLabel}
        </Heading>
        {isCommunity ? <CommunityTag variant='success' mb='2px' scale='sm' /> : <PartnerTag variant='textSubtle' mb='2px' scale='sm' />}
      </Flex>
    </CardBody>
  )
}

export default CardHeadingWithBanner
