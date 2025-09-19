import { FC, memo, useMemo } from 'react'
import styled from 'styled-components'
import { useNftFallbackSource } from 'utils/nftFallback'

interface AvatarImageProps {
  src?: string
  borderColor?: string
  alt?: string
  className?: string
}

const AvatarContainer = styled.div<{ borderColor?: string }>`
  border-radius: 50%;
  position: relative;
  width: 96px;
  height: 96px;
  border: 4px ${({ borderColor }) => borderColor || '#f2ecf2'} solid;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
`

const MediaElement = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const ImageElement = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const AvatarImageComponent: FC<AvatarImageProps> = ({ src, borderColor, alt, className }) => {
  const { currentSrc: mediaSrc, handleError } = useNftFallbackSource(src)

  const isVideo = useMemo(() => mediaSrc && /\.(webm|mp4)$/i.test(mediaSrc), [mediaSrc])

  return (
    <AvatarContainer borderColor={borderColor} className={className}>
      {isVideo ? (
        <MediaElement src={mediaSrc} aria-label={alt} autoPlay loop muted playsInline onError={handleError} />
      ) : (
        <ImageElement src={mediaSrc} alt={alt} onError={handleError} />
      )}
    </AvatarContainer>
  )
}

const AvatarImage = memo(AvatarImageComponent)

export default AvatarImage
