import styled from 'styled-components'
import { Box } from '@pancakeswap/uikit'

const VideoWrapper = styled(Box)<{ maxHeight: string }>`
  position: relative;
  max-height: ${({ maxHeight }) => maxHeight};
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`

const StyledVideo = styled.video<{ maxHeight: string }>`
  max-height: ${({ maxHeight }) => maxHeight};
  width: auto;
  height: auto;
  max-width: 100%;
  border-radius: 16px;
  object-fit: cover;

  ${({ theme }) => theme.mediaQueries.xs} {
    width: 100%;
    height: 300px;
    max-width: none;
    object-fit: cover;
  }

  ${({ theme }) => theme.mediaQueries.sm} {
    width: 100%;
    height: 380px;
    max-width: none;
    object-fit: cover;
  }

  ${({ theme }) => theme.mediaQueries.md} {
    width: auto;
    height: auto;
    max-width: 100%;
    object-fit: cover;
  }
`

interface VideoComponentProps {
  src: string
  maxHeight?: string
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  controls?: boolean
}

const VideoComponent: React.FC<VideoComponentProps> = ({ 
  src, 
  maxHeight = '512px', 
  autoPlay = true, 
  loop = true, 
  muted = true, 
  controls = false 
}) => {
  return (
    <VideoWrapper maxHeight={maxHeight}>
      <StyledVideo
        src={src}
        maxHeight={maxHeight}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        controls={controls}
        playsInline
      />
    </VideoWrapper>
  )
}

export default VideoComponent