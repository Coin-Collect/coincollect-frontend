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

const BannerContainer = styled.div`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
  width: 550px;
  height: 220px;
  
  &:hover {
    transform: scale(1.02);
  }
`

const StyledImage = styled(Image)`
  border-radius: 12px;
  transition: transform 0.3s ease;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
`

const BannerOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.1) 0%,
    rgba(0, 0, 0, 0.05) 50%,
    rgba(0, 0, 0, 0.3) 100%
  );
  pointer-events: none;
`

const StatusBadge = styled.div<{ status?: 'active' | 'finished' }>`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ theme, status }) => 
    status === 'finished' 
      ? `${theme.colors.failure}E6`
      : `${theme.colors.success}E6`
  };
  color: white;
  backdrop-filter: blur(4px);
`

const CollectionAvatar = styled(ProfileAvatar)`
  position: absolute;
  z-index: 3;
  border: 2px white solid;
  width: 30px;
  height: 30px;
  cursor: pointer !important;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.5);
`

const TextWithCursor = styled(Text)`
  cursor: pointer !important;
`

const CardHeadingWithBanner: React.FC<ExpandableSectionProps> = ({ lpLabel, multiplier, isCommunity, nftToken, pid, disabled = false }) => {
  const nftFarmData = nftFarmsConfig.find((nftFarm) => nftFarm.pid === pid)
  // Prefer explicit banner on farm; otherwise look up by stake_pid; finally try by collection address
  const collectionDataByPid = mintingConfig.find((collection) => collection.stake_pid === pid)
  const farmAddr137 = nftFarmData?.nftAddresses?.[137]?.toLowerCase()
  const collectionDataByAddress = farmAddr137
    ? mintingConfig.find((collection) => collection.address?.toLowerCase() === farmAddr137)
    : undefined
  const banner =
    nftFarmData?.["banner"] ||
    collectionDataByPid?.banner?.small ||
    collectionDataByAddress?.banner?.small
  //const avatar = nftFarmData["avatar"] ? nftFarmData["avatar"] : collectionData?.avatar

  // This expression is used to access the avatar and other information of the main NFT of the pool.
  // Todo: In the future, I plan to add the mainNftPid value to supportedNfts.
  const firstFarmOfMainNft = (
    farmAddr137
      ? nftFarmsConfig.find(
          (nftFarm) => nftFarm.nftAddresses?.[137]?.toLowerCase() === farmAddr137,
        )
      : undefined
  ) ?? nftFarmData
  const supportedCollectionPids = nftFarmData?.["supportedCollectionPids"] ? [firstFarmOfMainNft?.pid, ...nftFarmData["supportedCollectionPids"]].filter(Boolean) : [firstFarmOfMainNft?.pid].filter(Boolean)

  const supportedNftStakeFarms = supportedCollectionPids
  .map(pid => nftFarmsConfig.find(farm => farm.pid === pid))
  .filter(farm => farm !== undefined) as any[];

  // Todo: Duplicate with CollectionSelectModal, solve in hook level
  const collectionPowers = nftFarmData?.["collectionPowers"] ?? supportedNftStakeFarms.map((collection) => {
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

  let smallAvatars: any[] = [];
  let largeAvatars: any[] = [];
  let collectBadgeAdded = false;
  let avatar: any;
  for (let i = 0; i < supportedNftStakeFarms.length; i++) {
    let farm = supportedNftStakeFarms[i];
    const dataFromMintingByPid = mintingConfig.find((collection) => collection.stake_pid === farm.pid)
    const farmAddr = farm?.nftAddresses?.[137]?.toLowerCase()
    const dataFromMintingByAddress = farmAddr
      ? mintingConfig.find((collection) => collection.address?.toLowerCase() === farmAddr)
      : undefined
    avatar = null;

    if (farm.pid <= 4) {
      if (!collectBadgeAdded) {
        avatar = { avatar: "/logo.png" };
        collectBadgeAdded = true;
      }
    } else {
      // Prefer explicit farm avatar, else use minting avatar by pid, else by address
      avatar = { avatar: farm["avatar"] ?? dataFromMintingByPid?.avatar ?? dataFromMintingByAddress?.avatar };
    }
    largeAvatars.push({ title: farm.lpSymbol.replace("CoinCollect",""), power: collectionPowers?.[i], avatar: farm["avatar"] ?? dataFromMintingByPid?.avatar ?? dataFromMintingByAddress?.avatar, link: farm?.projectLink?.getNftLink ?? farm?.projectLink?.mainLink ?? "/nfts/collections" });

    if (smallAvatars.length <= 4 && avatar) {
      smallAvatars.push(avatar);
    }

  }

  
    smallAvatars.reverse();
    if (smallAvatars.length > 4) {
      smallAvatars.push({ avatar: "https://coincollect.org/assets/images/logos/3dots.gif" });
    }

  const [onPresentAllowedNftsModal] = useModal(
    <AllowedNftsModal
      nfts={largeAvatars}
    />,
  )
  

  return (
    <CardBody p="0px">
      <Flex justifyContent="center">
        <BannerContainer>
          <StyledImage src={banner} alt={`${lpLabel} banner`} height={220} width={550} />
          <BannerOverlay />
          <StatusBadge status={disabled ? 'finished' : 'active'}>
            {disabled ? 'Finished' : 'Active'}
          </StatusBadge>
          
          {/* Collection Avatars Overlay */}
          {(smallAvatars as any[]).map((avatar: any, index: number) => (
            <CollectionAvatar
              key={index}
              src={avatar["avatar"]}
              width={50}
              height={50}
              style={{ left: `${8 + index * 15}px`, top: '8px' }}
              onClick={onPresentAllowedNftsModal}
            />
          ))}
          
          {/* Title and Tag Overlay */}
          <Flex
            position="absolute"
            bottom="8px"
            left="8px"
            right="8px"
            flexDirection="column"
            alignItems="flex-start"
          >
            <Heading color="white" as="h3" mb={'4px'} style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              {lpLabel}
            </Heading>
            {isCommunity ? <CommunityTag variant='success' scale='sm' /> : <PartnerTag variant='textSubtle' scale='sm' />}
          </Flex>
        </BannerContainer>
      </Flex>
    </CardBody>
  )
}

export default CardHeadingWithBanner
