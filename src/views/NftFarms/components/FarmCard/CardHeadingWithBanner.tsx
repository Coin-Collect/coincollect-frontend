import styled from 'styled-components'
import type { ReactNode } from 'react'
import {
  Tag,
  Flex,
  Heading,
  Skeleton,
  TokenImage,
  ProfileAvatar,
  CardBody,
  useModal,
  OpenNewIcon,
  AddIcon,
  PencilIcon,
} from '@pancakeswap/uikit'
import { Token } from '@coincollect/sdk'
import { FarmAuctionTag, CommunityTag, PartnerTag } from 'components/Tags'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useTranslation } from 'contexts/Localization'
import { mintingConfig } from 'config/constants'
import nftFarmsConfig from 'config/constants/nftFarms'
import AllowedNftsModal from 'components/AllowedNftsModal/AllowedNftsModal'
import { NextLinkFromReactRouter } from 'components/NextLink'
import { isRemoteNftImageSource, useNftFallbackSource } from 'utils/nftFallback'

export interface ExpandableSectionProps {
  lpLabel?: string
  multiplier?: string
  isCommunity?: boolean
  nftToken?: string
  pid?: number
  disabled?: boolean
  onOpenDetails?: () => void
  poolPageUrl?: string
  headingLevel?: 'h1' | 'h3'
  onEditPoolType?: () => void
  editor?: {
    title: ReactNode
    onArtwork: () => void
    onCollections: () => void
    onSchedule: () => void
  }
  publishedPool?: {
    banner?: string
    status: 'UPCOMING' | 'ACTIVE' | 'FINISHED' | 'UNKNOWN'
    collections: Array<{ address?: string; name: string; image?: string; weight: string; link?: string }>
  }
}

const COLLECTION_AVATAR_FALLBACK_BY_PID: Record<number, string> = {
  26: '/images/coincollect-assets/partners/cyberpunk/logo300-min.png',
}

const Wrapper = styled(Flex)`
  svg {
    margin-right: 4px;
  }
`

const MultiplierTag = styled(Tag)`
  margin-left: 4px;
`

const BannerContainer = styled.div<{ $clickable?: boolean }>`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
  width: 550px;
  height: 220px;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};

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
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.05) 50%, rgba(0, 0, 0, 0.3) 100%);
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

const StatusBadge = styled.div<{ status?: 'active' | 'finished' | 'upcoming' | 'unknown' }>`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ theme, status }) =>
    status === 'finished'
      ? `${theme.colors.failure}E6`
      : status === 'upcoming'
      ? `${theme.colors.warning}E6`
      : status === 'unknown'
      ? `${theme.colors.textSubtle}E6`
      : `${theme.colors.success}E6`};
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

const BannerFooter = styled(Flex)`
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
`

const EditTypeButton = styled.button`
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  min-height: 48px;
  margin-block: -12px;
  padding: 0;
  border: 0;
  border-radius: 16px;
  background: transparent;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: -3px;
  }

  @media (hover: hover) {
    &:hover > span {
      box-shadow: 0 0 0 2px white;
    }
  }
`

const ArtworkButton = styled.button`
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: -4px;
  }
`

const ArtworkLabel = styled.span`
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 7px 12px;
  border-radius: 8px;
  color: white;
  background: rgb(0 0 0 / 72%);
  font-size: 12px;
  font-weight: 700;
`

const CollectionEditButton = styled(PoolPageIcon)`
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 3;
  border: 1px solid rgb(255 255 255 / 65%);
  cursor: pointer;
`

const CardHeadingWithBanner: React.FC<ExpandableSectionProps> = ({
  lpLabel,
  multiplier,
  isCommunity,
  nftToken,
  pid,
  disabled = false,
  onOpenDetails,
  poolPageUrl,
  headingLevel = 'h3',
  onEditPoolType,
  publishedPool,
  editor,
}) => {
  const { t } = useTranslation()
  const PoolTag = isCommunity ? CommunityTag : PartnerTag
  const poolTagVariant = isCommunity ? 'success' : 'textSubtle'
  const router = useRouter()
  const nftFarmData = nftFarmsConfig.find((nftFarm) => nftFarm.pid === pid)
  const collectionDataByPid = mintingConfig.find((collection) => collection.stake_pid === pid)
  const farmAddr137 = nftFarmData?.nftAddresses?.[137]?.toLowerCase()
  const collectionDataByAddress = farmAddr137
    ? mintingConfig.find((collection) => collection.address?.toLowerCase() === farmAddr137)
    : undefined
  const banner =
    publishedPool?.banner ||
    nftFarmData?.banner ||
    collectionDataByPid?.banner?.small ||
    collectionDataByAddress?.banner?.small
  const { currentSrc: bannerSrc, handleError: handleBannerError } = useNftFallbackSource(banner)

  const firstFarmOfMainNft =
    (farmAddr137
      ? nftFarmsConfig.find((nftFarm) => nftFarm.nftAddresses?.[137]?.toLowerCase() === farmAddr137)
      : undefined) ?? nftFarmData
  const supportedCollectionPids = nftFarmData?.supportedCollectionPids
    ? [firstFarmOfMainNft?.pid, ...nftFarmData.supportedCollectionPids].filter(Boolean)
    : [firstFarmOfMainNft?.pid].filter(Boolean)

  const supportedNftStakeFarms = supportedCollectionPids
    .map((collectionPid) => nftFarmsConfig.find((farm) => farm.pid === collectionPid))
    .filter((farm): farm is (typeof nftFarmsConfig)[number] => Boolean(farm))

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

    const defaultAvatar = farm.pid <= 4 ? '/logo.png' : '/images/nfts/no-profile-md.png'
    const resolvedAvatar =
      COLLECTION_AVATAR_FALLBACK_BY_PID[farm.pid] ??
      dataFromMintingByPid?.avatar ??
      dataFromMintingByAddress?.avatar ??
      farm.avatar ??
      farm.staticNftImage ??
      defaultAvatar

    let avatar: { avatar: string } | null = null
    if (farm.pid <= 4) {
      if (!collectBadgeAdded) {
        avatar = { avatar: '/logo.png' }
        collectBadgeAdded = true
      }
    } else {
      avatar = {
        avatar: resolvedAvatar,
      }
    }

    largeAvatars.push({
      title: farm.lpSymbol.replace('CoinCollect', ''),
      power: collectionPowers?.[index],
      avatar: resolvedAvatar,
      link: farm?.projectLink?.getNftLink ?? farm?.projectLink?.mainLink ?? '/nfts/collections',
    })

    if (smallAvatars.length <= 4 && avatar) {
      smallAvatars.push(avatar)
    }
  })

  const displayAvatars = publishedPool
    ? publishedPool.collections.slice(0, 4).map(({ image }) => ({ avatar: image || '/images/nfts/no-profile-md.png' }))
    : [...smallAvatars].reverse()
  if ((publishedPool?.collections.length || smallAvatars.length) > 4) {
    displayAvatars.push({ avatar: 'https://coincollect.org/assets/images/logos/3dots.gif' })
  }

  const modalCollections = publishedPool
    ? publishedPool.collections.map((collection) => ({
        title: collection.name,
        power: Number(collection.weight),
        avatar: collection.image || '/images/nfts/no-profile-md.png',
        link: collection.link || (collection.address ? `/nfts/collections/${collection.address}` : '/nfts/collections'),
      }))
    : largeAvatars
  const [onPresentAllowedNftsModal] = useModal(
    <AllowedNftsModal nfts={modalCollections} weightedShares={Boolean(publishedPool)} />,
  )
  const handleOpenPoolPage = () => {
    if (poolPageUrl) {
      router.push(poolPageUrl)
    } else if (pid !== undefined) {
      router.push(`/nftpools/${pid}`)
    } else {
      onOpenDetails?.()
    }
  }

  const publishedStatus = publishedPool?.status
  const status = publishedStatus
    ? (publishedStatus.toLowerCase() as 'active' | 'finished' | 'upcoming' | 'unknown')
    : disabled
    ? 'finished'
    : 'active'
  const statusLabel = publishedStatus
    ? publishedStatus === 'UNKNOWN'
      ? 'Status unavailable'
      : publishedStatus.charAt(0) + publishedStatus.slice(1).toLowerCase()
    : disabled
    ? 'Finished'
    : 'Active'

  return (
    <CardBody p="0px">
      <Flex justifyContent="center">
        <BannerContainer
          $clickable={pid !== undefined || Boolean(poolPageUrl || onOpenDetails)}
          onClick={editor ? undefined : handleOpenPoolPage}
        >
          <StyledImage
            src={bannerSrc}
            alt={`${lpLabel} banner`}
            height={220}
            width={550}
            unoptimized={isRemoteNftImageSource(bannerSrc)}
            onError={handleBannerError}
          />
          <BannerOverlay />
          {editor && (
            <ArtworkButton type="button" aria-label="Edit pool artwork" onClick={editor.onArtwork}>
              <ArtworkLabel>Edit artwork</ArtworkLabel>
            </ArtworkButton>
          )}
          <StatusContainer style={editor ? { zIndex: 2 } : undefined}>
            {editor ? (
              <StatusBadge
                as="button"
                type="button"
                status={status}
                aria-label="Edit reward schedule"
                onClick={editor.onSchedule}
                style={{ border: 0, cursor: 'pointer' }}
              >
                {statusLabel}
              </StatusBadge>
            ) : (
              <StatusBadge status={status}>{statusLabel}</StatusBadge>
            )}
            {(pid !== undefined || poolPageUrl) && (
              <NextLinkFromReactRouter
                to={poolPageUrl || `/nftpools/${pid}`}
                aria-label="Open pool page"
                style={{ display: 'inline-flex' }}
                onClick={(event) => event.stopPropagation()}
              >
                <PoolPageIcon>
                  <OpenNewIcon color="currentColor" />
                </PoolPageIcon>
              </NextLinkFromReactRouter>
            )}
            {pid === undefined && !poolPageUrl && onOpenDetails && (
              <PoolPageIcon
                as="button"
                type="button"
                aria-label="Open pool details"
                style={{ border: 0, padding: 0 }}
                onClick={(event) => {
                  event.stopPropagation()
                  onOpenDetails()
                }}
              >
                <OpenNewIcon color="currentColor" />
              </PoolPageIcon>
            )}
          </StatusContainer>

          {editor && displayAvatars.length === 0 && (
            <CollectionEditButton
              as="button"
              type="button"
              aria-label="Edit NFT collections"
              onClick={editor.onCollections}
            >
              <AddIcon color="currentColor" />
            </CollectionEditButton>
          )}
          {displayAvatars.map((avatar, index) => (
            <CollectionAvatar
              key={index}
              src={avatar.avatar}
              width={50}
              height={50}
              style={{ left: `${8 + index * 15}px`, top: '8px', cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              aria-label={editor ? 'Edit NFT collections' : 'View allowed NFTs'}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  if (editor) editor.onCollections()
                  else onPresentAllowedNftsModal()
                }
              }}
              onClick={
                editor || modalCollections.length > 0
                  ? (event) => {
                      event.stopPropagation()
                      if (editor) editor.onCollections()
                      else onPresentAllowedNftsModal()
                    }
                  : undefined
              }
            />
          ))}

          <BannerFooter style={editor ? { zIndex: 2 } : undefined}>
            <Heading
              color="white"
              as={headingLevel}
              scale="lg"
              mb="0"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
            >
              {editor?.title ?? lpLabel}
            </Heading>
            {onEditPoolType ? (
              <EditTypeButton
                type="button"
                aria-haspopup="dialog"
                aria-label={`${t('Edit pool type')} · ${t(isCommunity ? 'Community' : 'Partner')}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onEditPoolType()
                }}
              >
                <PoolTag
                  as="span"
                  variant={poolTagVariant}
                  scale="sm"
                  endIcon={<PencilIcon width="12px" color="currentColor" aria-hidden="true" />}
                />
              </EditTypeButton>
            ) : (
              <PoolTag variant={poolTagVariant} scale="sm" />
            )}
          </BannerFooter>
        </BannerContainer>
      </Flex>
    </CardBody>
  )
}

export default CardHeadingWithBanner
