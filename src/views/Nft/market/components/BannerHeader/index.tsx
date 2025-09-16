import { ReactNode } from 'react'
import { Flex, Box, FlexProps } from '@pancakeswap/uikit'
import Image from 'next/image'
import StyledBannerImageWrapper from './BannerImage'

interface BannerHeaderProps extends FlexProps {
  bannerImage: string
  bannerAlt?: string
  avatar?: ReactNode
  topLeftOverlay?: ReactNode
  topRightOverlay?: ReactNode
}

const BannerHeader: React.FC<BannerHeaderProps> = ({
  bannerImage,
  bannerAlt,
  avatar,
  topLeftOverlay,
  topRightOverlay,
  children,
  ...props
}) => {
  return (
    <Flex flexDirection="column" mb="24px" {...props}>
      <Box position="relative" pb="56px">
        <StyledBannerImageWrapper>
          <Image src={bannerImage} alt={bannerAlt} layout="fill" objectFit="cover" priority />
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
