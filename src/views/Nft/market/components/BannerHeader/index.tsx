import { ReactNode, useMemo } from 'react'
import { Flex, Box, FlexProps } from '@pancakeswap/uikit'
import Image from 'next/image'
import StyledBannerImageWrapper from './BannerImage'

interface BannerHeaderProps extends FlexProps {
  bannerImage: string
  bannerAlt?: string
  avatar?: ReactNode
  topLeftOverlay?: ReactNode
  topRightOverlay?: ReactNode
  bottomRightOverlay?: ReactNode
}

const BannerHeader: React.FC<BannerHeaderProps> = ({
  bannerImage,
  bannerAlt,
  avatar,
  topLeftOverlay,
  topRightOverlay,
  bottomRightOverlay,
  children,
  ...props
}) => {
  const isVideo = useMemo(() => {
    if (!bannerImage) {
      return false
    }
    return /\.(webm|mp4)$/i.test(bannerImage)
  }, [bannerImage])

  return (
    <Flex flexDirection="column" mb="24px" {...props}>
      <Box position="relative" pb="56px">
        <StyledBannerImageWrapper>
          {isVideo ? (
            <video
              src={bannerImage}
              aria-label={bannerAlt}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <Image src={bannerImage} alt={bannerAlt || ''} layout="fill" objectFit="cover" priority />
          )}
        </StyledBannerImageWrapper>
        {topLeftOverlay && (
          <Box position="absolute" top="16px" left="16px" zIndex={1}>
            {topLeftOverlay}
          </Box>
        )}
        {topRightOverlay && (
          <Box position="absolute" top="16px" right="16px" zIndex={1}>
            {topRightOverlay}
          </Box>
        )}
        {bottomRightOverlay && (
          <Box
            position="absolute"
            right={['12px', '16px', '24px']}
            bottom={['12px', '16px', '20px']}
            style={{ pointerEvents: 'none' }}
            zIndex={1}
            maxWidth={['calc(100% - 24px)', 'calc(100% - 32px)', '360px']}
          >
            <Flex justifyContent="flex-end">{bottomRightOverlay}</Flex>
          </Box>
        )}
        <Box position="absolute" bottom={0} left={-4}>
          <Flex alignItems="flex-end">
            {avatar}
            {children}
          </Flex>
        </Box>
      </Box>
    </Flex>
  )
}

export default BannerHeader
