import styled from 'styled-components'
import { Tag, Flex, Heading, Skeleton, TokenImage, ProfileAvatar, CardBody, useModal, OpenNewIcon } from '@pancakeswap/uikit'
import { Token } from '@coincollect/sdk'
import { FarmAuctionTag, CommunityTag, PartnerTag } from 'components/Tags'
import Image from 'next/image'
import { mintingConfig } from 'config/constants'
import nftFarmsConfig from 'config/constants/nftFarms'
import AllowedNftsModal from 'components/AllowedNftsModal/AllowedNftsModal'
import { NextLinkFromReactRouter } from 'components/NextLink'

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

const StatusContainer = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const StatusBadge = styled.div<{ status?: 'active' | 'finished' }>`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ theme, status }) =>
    status === 'finished' ? `${theme.colors.failure}E6` : `${theme.colors.success}E6`};
  color: white;
  backdrop-filter: blur(4px);
`

const PoolPageIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  transition: transform 0.2s ease, background 0.2s ease;

  &:hover {
    transform: translateY(-1px) scale(1.03);
    background: rgba(0, 0, 0, 0.7);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

const CollectionAvatar = styled(ProfileAvatar)`
  position: absolute;
  z-index: 3;
  border: 2px white solid;
  width: 30px;
  height: 30px;
  cursor: pointer !important;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
`

const CardHeadingWithBanner: React.FC<ExpandableSectionProps> = ({
  lpLabel,
  multiplier,
  isCommunity,
  nftToken,
  pid,
  disabled = false,
}) => {
  const nftFarmData = nftFarmsConfig.find((nftFarm) => nftFarm.pid === pid)
  const collectionDataByPid = mintingConfig.find((collection) => collection.stake_pid === pid)
  const farmAddr137 = nftFarmData?.nftAddresses?.[137]?.toLowerCase()
  const collectionDataByAddress = farmAddr137
    ? mintingConfig.find((collection) => collection.address?.toLowerCase() === farmAddr137)
    : undefined
  const banner =
    nftFarmData?.banner || collectionDataByPid?.banner?.small || collectionDataByAddress?.banner?.small

  const firstFarmOfMainNft =
    (farmAddr137
      ? nftFarmsConfig.find((nftFarm) => nftFarm.nftAddresses?.[137]?.toLowerCase() === farmAddr137)
      : undefined) ?? nftFarmData
  const supportedCollectionPids = nftFarmData?.supportedCollectionPids
    ? [firstFarmOfMainNft?.pid, ...nftFarmData.supportedCollectionPids].filter(Boolean)
    : [firstFarmOfMainNft?.pid].filter(Boolean)

  const supportedNftStakeFarms = supportedCollectionPids
    .map((collectionPid) => nftFarmsConfig.find((farm) => farm.pid === collectionPid))
    .filter((farm): farm is typeof nftFarmsConfig[number] => Boolean(farm))

  const collectionPowers =
    nftFarmData?.collectionPowers ??
    supportedNftStakeFarms.map((collection) => {
      switch (collection.pid) {
        case 1:
          return 1
        case 2:
          return 3
        case 3:
          return 6
        case 4:
          return 12
        default:
          return 15
      }
    })

  const smallAvatars: Array<{ avatar: string }> = []
  const largeAvatars: Array<{ title: string; power: number; avatar: string; link: string }> = []
  let collectBadgeAdded = false

  supportedNftStakeFarms.forEach((farm, index) => {
    const dataFromMintingByPid = mintingConfig.find((collection) => collection.stake_pid === farm.pid)
    const farmAddr = farm?.nftAddresses?.[137]?.toLowerCase()
    const dataFromMintingByAddress = farmAddr
      ? mintingConfig.find((collection) => collection.address?.toLowerCase() === farmAddr)
      : undefined

    let avatar: { avatar: string } | null = null
    if (farm.pid <= 4) {
      if (!collectBadgeAdded) {
        avatar = { avatar: '/logo.png' }
        collectBadgeAdded = true
      }
    } else {
      avatar = {
        avatar: farm.avatar ?? dataFromMintingByPid?.avatar ?? dataFromMintingByAddress?.avatar,
      }
    }

    largeAvatars.push({
      title: farm.lpSymbol.replace('CoinCollect', ''),
      power: collectionPowers?.[index],
      avatar: farm.avatar ?? dataFromMintingByPid?.avatar ?? dataFromMintingByAddress?.avatar,
      link: farm?.projectLink?.getNftLink ?? farm?.projectLink?.mainLink ?? '/nfts/collections',
    })

    if (smallAvatars.length <= 4 && avatar) {
      smallAvatars.push(avatar)
    }
  })

  smallAvatars.reverse()
  if (smallAvatars.length > 4) {
    smallAvatars.push({ avatar: 'https://coincollect.org/assets/images/logos/3dots.gif' })
  }

  const [onPresentAllowedNftsModal] = useModal(<AllowedNftsModal nfts={largeAvatars} />)

  return (
    <CardBody p="0px">
      <Flex justifyContent="center">
        <BannerContainer>
          <StyledImage src={banner} alt={`${lpLabel} banner`} height={220} width={550} />
          <BannerOverlay />
          <StatusContainer>
            <StatusBadge status={disabled ? 'finished' : 'active'}>
              {disabled ? 'Finished' : 'Active'}
            </StatusBadge>
            {pid !== undefined && (
              <NextLinkFromReactRouter
                to={`/nftpools/${pid}`}
                aria-label="Open pool page"
                style={{ display: 'inline-flex' }}
              >
                <PoolPageIcon>
                  <OpenNewIcon color="currentColor" />
                </PoolPageIcon>
              </NextLinkFromReactRouter>
            )}
          </StatusContainer>

          {(smallAvatars as any[]).map((avatar: any, index: number) => (
            <CollectionAvatar
              key={index}
              src={avatar.avatar}
              width={50}
              height={50}
              style={{ left: `${8 + index * 15}px`, top: '8px' }}
              onClick={onPresentAllowedNftsModal}
            />
          ))}

          <Flex
            position="absolute"
            bottom="8px"
            left="8px"
            right="8px"
            flexDirection="column"
            alignItems="flex-start"
          >
            <Heading
              color="white"
              as="h3"
              mb="4px"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
            >
              {lpLabel}
            </Heading>
            {isCommunity ? (
              <CommunityTag variant="success" scale="sm" />
            ) : (
              <PartnerTag variant="textSubtle" scale="sm" />
            )}
          </Flex>
        </BannerContainer>
      </Flex>
    </CardBody>
  )
}

export default CardHeadingWithBanner
