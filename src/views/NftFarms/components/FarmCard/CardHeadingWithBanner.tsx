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
  
  &:hover {
    transform: scale(1.02);
  }
`

const StyledImage = styled(Image)`
  border-radius: 12px;
  transition: transform 0.3s ease;
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
  const banner = nftFarmData?.["banner"] ? nftFarmData["banner"] : collectionData?.banner.small
  //const avatar = nftFarmData["avatar"] ? nftFarmData["avatar"] : collectionData?.avatar

  // This expression is used to access the avatar and other information of the main NFT of the pool.
  // Todo: In the future, I plan to add the mainNftPid value to supportedNfts.
  const firstFarmOfMainNft = nftFarmsConfig.find((nftFarm) => nftFarm.nftAddresses?.[137] === nftFarmData?.nftAddresses?.[137])
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
    const dataFromMinting = mintingConfig.find((collection) => collection.stake_pid === farm.pid)
    avatar = null;

    if (farm.pid <= 4) {
      if (!collectBadgeAdded) {
        avatar = { avatar: "/logo.png" };
        collectBadgeAdded = true;
      }
    } else {
      avatar = { avatar: farm["avatar"] ?? dataFromMinting?.avatar };
    }
    largeAvatars.push({ title: farm.lpSymbol.replace("CoinCollect",""), power: collectionPowers?.[i], avatar: farm["avatar"] ?? dataFromMinting?.avatar, link: farm?.projectLink?.getNftLink ?? farm?.projectLink?.mainLink ?? "/nfts/collections" });

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
          <StyledImage src={banner} alt={`${lpLabel} banner`} height={125} width={375} />
          <BannerOverlay />
          <StatusBadge status={disabled ? 'finished' : 'active'}>
            {disabled ? 'Finished' : 'Active'}
          </StatusBadge>
        </BannerContainer>
      </Flex>
      <Flex
        position="relative"
        height="65px"
        justifyContent="center"
        alignItems="flex-end"
        py="8px"
        flexDirection="column"
      >


        {(smallAvatars as any[]).map((avatar: any, index: number) => (
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
