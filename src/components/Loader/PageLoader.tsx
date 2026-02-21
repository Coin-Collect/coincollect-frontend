import { useState } from 'react'
import styled from 'styled-components'
import { Spinner } from '@pancakeswap/uikit'

const floatMotion = `
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`

const Wrapper = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  transform: translateY(-28vh);
  z-index: 9999;
  pointer-events: none;

  @media (max-width: 767px) {
    transform: translateY(-58vh);
  }
`

const LoaderVideo = styled.video`
  width: 220px;
  height: 220px;
  object-fit: contain;
  animation: float 2.2s ease-in-out infinite;

  @keyframes float {
    ${floatMotion}
  }
`

const PageLoader: React.FC = () => {
  const [videoError, setVideoError] = useState(false)

  return (
    <Wrapper>
      {videoError ? (
        <Spinner />
      ) : (
        <LoaderVideo autoPlay loop muted playsInline onError={() => setVideoError(true)}>
          <source src="/loader.webm" type="video/webm" />
        </LoaderVideo>
      )}
    </Wrapper>
  )
}

export default PageLoader
