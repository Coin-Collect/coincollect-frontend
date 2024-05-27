import styled from 'styled-components'
import { Tag, Flex, Heading, Skeleton, TokenImage, ProfileAvatar, CardBody, Text, useModal } from '@pancakeswap/uikit'
import { Token } from '@coincollect/sdk'
import { FarmAuctionTag, CommunityTag, PartnerTag } from 'components/Tags'
import Image from 'next/image'
import { mintingConfig } from 'config/constants'
import nftFarmsConfig from 'config/constants/nftFarms'
import AllowedNftsModal from 'components/AllowedNftsModal/AllowedNftsModal'


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

const CollectionAvatar = styled(ProfileAvatar)`
  left: 0;
  position: absolute;
  top: 30px;
  border: 1px white solid;
  width: 30px;
  height: 30px;
  cursor: pointer !important;
`

const TextWithCursor = styled(Text)`
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

  // Todo: Duplicate with CollectionSelectModal, solve in hook level
  const collectionPowers = nftFarmData["collectionPowers"] ?? supportedNftStakeFarms.map((collection) => {
    switch (collection.pid) {
      case 1:
        return 1;
      case 2:
        return 3;
      case 3:
        return 6;
      case 4:
        return 12;
      default:
        return 15;
    }
  })

  let smallAvatars = [];
  let largeAvatars = [];
  let collectBadgeAdded = false;
  for (let i = 0; i < supportedNftStakeFarms.length; i++) {
    let farm = supportedNftStakeFarms[i];
    const dataFromMinting = mintingConfig.find((collection) => collection.stake_pid === farm.pid)

    if (farm.pid <= 4) {
      if (!collectBadgeAdded) {
        smallAvatars.push({ avatar: "/logo.png" });
        collectBadgeAdded = true;
      }
    } else {
      smallAvatars.push({ avatar: farm["avatar"] ?? dataFromMinting?.avatar });
    }
    largeAvatars.push({ title: farm.lpSymbol.replace("CoinCollect",""), power: collectionPowers?.[i], avatar: farm["avatar"] ?? dataFromMinting?.avatar });

    if (smallAvatars.length > 4) {
      smallAvatars.push({ avatar: "https://cdn-icons-png.flaticon.com/512/2550/2550282.png" });
      break;
    }

  }

  const [onPresentAllowedNftsModal] = useModal(
    <AllowedNftsModal
      nfts={largeAvatars}
    />,
  )
  

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


        {smallAvatars.map((avatar, index) => (
          <CollectionAvatar
            key={index}
            src={avatar["avatar"]}
            width={50}
            height={50}
            style={{ left: `${index * 15}px` }}
            onClick={onPresentAllowedNftsModal}
          />
        ))}
        <TextWithCursor onClick={onPresentAllowedNftsModal} color='gold' fontSize={14} style={{ position: 'absolute', left: '0px', top: '8px' }}>Allowed NFTs ▿</TextWithCursor>


        <Heading color={disabled ? 'textDisabled' : 'body'} as="h3" mb={'8px'}>
          {lpLabel}
        </Heading>
        {isCommunity ? <CommunityTag variant='success' mb='2px' scale='sm' /> : <PartnerTag variant='textSubtle' mb='2px' scale='sm' />}
      </Flex>
    </CardBody>
  )
}

export default CardHeadingWithBanner
