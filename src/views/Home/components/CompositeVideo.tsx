import styled, { keyframes } from 'styled-components'
import { Box } from '@pancakeswap/uikit'

const floatingAnim = (x: string, y: string) => keyframes`
  from {
    transform: translate(0,  0px);
  }
  50% {
    transform: translate(${x}, ${y});
  }
  to {
    transform: translate(0, 0px);
  }
`

const Wrapper = styled(Box)<{ maxHeight: string }>`
  position: relative;
  max-height: ${({ maxHeight }) => maxHeight};

  & :nth-child(2) {
    animation: ${floatingAnim('3px', '115px')} 3s ease-in-out infinite;
    animation-delay: 1s;
  }

  & :nth-child(3) {
    animation: ${floatingAnim('5px', '50px')} 3s ease-in-out infinite;
    animation-delay: 0.66s;
  }

  & :nth-child(4) {
    animation: ${floatingAnim('6px', '50px')} 3s ease-in-out infinite;
    animation-delay: 0.33s;
  }

  & :nth-child(5) {
    animation: ${floatingAnim('4px', '92px')} 3s ease-in-out infinite;
    animation-delay: 0s;
  }
`

const DummyVideo = styled.video<{ maxHeight: string }>`
  max-height: ${({ maxHeight }) => maxHeight};
  visibility: hidden;
`

const VideoWrapper = styled(Box)<{ index: number }>`
  height: 60%;
  width: 60%;
  position: absolute;
  opacity: 0.8;

  ${({ index }) => {
    switch (index) {
      case 0:
        return `
          top: 10%;
          left: 10%;
        `
      case 1:
        return `
          top: 10%;
          right: 10%;
        `
      case 2:
        return `
          bottom: 10%;
          left: 50%;
          transform: translateX(-50%);
        `
      default:
        return `
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        `
    }
  }}

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }
`

interface VideoAttributes {
  src: string
  alt: string
}

export interface CompositeVideoProps {
  path: string
  attributes: VideoAttributes[]
}

interface ComponentProps extends CompositeVideoProps {
  animate?: boolean
  maxHeight?: string
}

export const getVideoUrl = (base: string, videoSrc: string): string => `${base}${videoSrc}.webm`

const CompositeVideo: React.FC<ComponentProps> = ({ path, attributes, maxHeight = '512px' }) => {
  return (
    <Wrapper maxHeight={maxHeight}>
      <DummyVideo 
        src={getVideoUrl(path, attributes[0].src)} 
        maxHeight={maxHeight} 
        muted 
        playsInline 
      />
      {attributes.map((video, index) => (
        <VideoWrapper key={video.src} index={index}>
          <video 
            src={getVideoUrl(path, video.src)} 
            autoPlay 
            loop 
            muted 
            playsInline
            style={{ objectFit: 'cover' }}
          />
        </VideoWrapper>
      ))}
    </Wrapper>
  )
}

export default CompositeVideo