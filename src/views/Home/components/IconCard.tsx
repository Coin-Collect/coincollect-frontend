import { ReactNode } from 'react'
import styled from 'styled-components'
import { Card, CardBody, Box, CardProps } from '@pancakeswap/uikit'

const StyledCard = styled(Card)<{ background?: string; rotation?: string; $hasVideo?: boolean }>`
  height: fit-content;
  padding: 1px 1px 4px 1px;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;

  ${({ theme }) => theme.mediaQueries.md} {
    ${({ rotation }) => (rotation ? `transform: rotate(${rotation});` : '')}
  }
`

const VideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
  opacity: 0.7;
`

const CardBodyWithVideo = styled(CardBody)`
  position: relative;
  z-index: 1;
`

const IconWrapper = styled(Box)<{ rotation?: string }>`
  position: absolute;
  top: 24px;
  right: 24px;

  ${({ theme }) => theme.mediaQueries.md} {
    ${({ rotation }) => (rotation ? `transform: rotate(${rotation});` : '')}
  }
`

interface IconCardProps extends IconCardData, CardProps {
  children: ReactNode
}

export interface IconCardData {
  icon: ReactNode
  background?: string
  borderColor?: string
  rotation?: string
  videoSrc?: string
}

const IconCard: React.FC<IconCardProps> = ({ icon, background, borderColor, rotation, videoSrc, children, ...props }) => {
  return (
    <StyledCard background={background} borderBackground={borderColor} rotation={rotation} $hasVideo={!!videoSrc} {...props}>
      {videoSrc && (
        <VideoBackground
          autoPlay
          loop
          muted
          playsInline
          src={videoSrc}
        />
      )}
      <CardBodyWithVideo>
        <IconWrapper rotation={rotation}>{icon}</IconWrapper>
        {children}
      </CardBodyWithVideo>
    </StyledCard>
  )
}

export default IconCard
