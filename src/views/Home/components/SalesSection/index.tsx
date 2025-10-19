import { Flex, Text, Button, Link } from '@pancakeswap/uikit'
import { NextLinkFromReactRouter as RouterLink } from 'components/NextLink'
import CompositeImage, { CompositeImageProps } from '../CompositeImage'
import VideoComponent from '../VideoComponent'
import ColoredWordHeading from '../ColoredWordHeading'

interface SalesSectionButton {
  to: string
  text: string
  external: boolean
}

interface VideoProps {
  src: string
  maxHeight?: string
}

export interface SalesSectionProps {
  headingText: string
  bodyText: string
  reverse: boolean
  primaryButton: SalesSectionButton
  secondaryButton: SalesSectionButton
  images?: CompositeImageProps
  video?: VideoProps
}

const SalesSection: React.FC<SalesSectionProps> = (props) => {
  const { headingText, bodyText, reverse, primaryButton, secondaryButton, images, video } = props

  return (
    <Flex flexDirection="column">
      <Flex
        flexDirection={['column-reverse', null, null, reverse ? 'row-reverse' : 'row']}
        alignItems={['center', null, null, 'center']}
        justifyContent="center"
      >
        <Flex
          flexDirection="column"
          flex="1"
          ml={[null, null, null, reverse ? '64px' : null]}
          mr={[null, null, null, !reverse ? '64px' : null]}
          alignSelf={['flex-start', null, null, 'center']}
        >
          <ColoredWordHeading text={headingText} />
          <Text color="textSubtle" mb="24px">
            {bodyText}
          </Text>
          <Flex>
            <Button mr="16px">
              {primaryButton.external ? (
                <Link external href={primaryButton.to}>
                  <Text color="card" bold fontSize="16px">
                    {primaryButton.text}
                  </Text>
                </Link>
              ) : (
                <RouterLink to={primaryButton.to}>
                  <Text color="card" bold fontSize="16px">
                    {primaryButton.text}
                  </Text>
                </RouterLink>
              )}
            </Button>
            {secondaryButton.external ? (
              <Link external href={secondaryButton.to}>
                {secondaryButton.text}
              </Link>
            ) : (
              <RouterLink to={secondaryButton.to}>{secondaryButton.text}</RouterLink>
            )}
          </Flex>
        </Flex>
        <Flex
          height={['320px', '400px', null, '100%']}
          width={['100%', '100%', null, '100%']}
          flex={[null, null, null, '1']}
          mb={['0px', '0px', null, '0']}
        >
          {video ? (
            <VideoComponent src={video.src} maxHeight={video.maxHeight || '512px'} />
          ) : images ? (
            <CompositeImage {...images} />
          ) : null}
        </Flex>
      </Flex>
    </Flex>
  )
}

export default SalesSection
