import { SyntheticEvent, useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { NextLinkFromReactRouter } from 'components/NextLink'
import { Box, Flex, Grid, Image } from '@pancakeswap/uikit'
import { getRandomNftFallbackSrc } from 'utils/nftFallback'

type ImageComponentProps = React.ComponentProps<typeof Image>

const useNftFallback = (
  src?: string,
  onError?: (event: SyntheticEvent<HTMLImageElement, Event>) => void,
) => {
  const [currentSrc, setCurrentSrc] = useState<string>(() => (src ? src : getRandomNftFallbackSrc()))

  useEffect(() => {
    if (src) {
      setCurrentSrc(src)
      return
    }

    setCurrentSrc((previous) => getRandomNftFallbackSrc(previous))
  }, [src])

  const handleError = useCallback(
    (event: SyntheticEvent<HTMLImageElement, Event>) => {
      setCurrentSrc((previous) => getRandomNftFallbackSrc(previous))
      if (onError) {
        onError(event)
      }
    },
    [onError],
  )

  return { currentSrc, handleError }
}

export const TwoColumnsContainer = styled(Flex)`
  gap: 22px;
  align-items: flex-start;
  & > div:first-child {
    flex: 1;
    gap: 20px;
  }
  & > div:last-child {
    flex: 2;
  }
`

const StyledRoundedImage = styled(Image)`
  height: max-content;
  border-radius: ${({ theme }) => theme.radii.default};
  overflow: hidden;
  & > img {
    object-fit: contain;
  }
`

export const RoundedImage = ({ src, onError, ...props }: ImageComponentProps) => {
  const { currentSrc, handleError } = useNftFallback(src, onError)

  return <StyledRoundedImage src={currentSrc} onError={handleError} {...props} />
}

const StyledSmallRoundedImage = styled(Image)`
  & > img {
    border-radius: ${({ theme }) => theme.radii.default};
  }
`

export const SmallRoundedImage = ({ src, onError, ...props }: ImageComponentProps) => {
  const { currentSrc, handleError } = useNftFallback(src, onError)

  return <StyledSmallRoundedImage src={currentSrc} onError={handleError} {...props} />
}

export const Container = styled(Flex)`
  gap: 24px;
`

export const CollectionLink = styled(NextLinkFromReactRouter)`
  color: ${({ theme }) => theme.colors.primary};
  display: block;
  font-weight: 600;
  margin-top: 16px;

  ${({ theme }) => theme.mediaQueries.lg} {
    margin-top: 50px;
  }
`

export const CollectibleRowContainer = styled(Grid)`
  &:hover {
    opacity: 0.5;
    cursor: pointer;
  }
`

export const StyledSortButton = styled.button`
  border: none;
  cursor: pointer;
  background: none;
  color: ${({ theme }) => theme.colors.secondary};
  font-weight: bold;
`

export const ButtonContainer = styled(Box)`
  text-align: right;
  padding-right: 24px;
`

export const TableHeading = styled(Grid)`
  border-bottom: ${({ theme }) => `1px solid ${theme.colors.cardBorder}`};
`
