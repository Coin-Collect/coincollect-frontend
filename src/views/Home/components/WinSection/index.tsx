import { useTranslation } from 'contexts/Localization'
import { Box, ChevronRightIcon, Flex, Text, useMatchBreakpoints, Image } from '@pancakeswap/uikit'
import useTheme from 'hooks/useTheme'
import  StaticImageData  from 'next/image'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import  styled  from 'styled-components'

export const CardWrapper = styled.div`
  border-radius: 24px;
  background: ${({ theme }) => (theme.isDark ? theme.colors.gradients.bubblegum : theme.colors.backgroundAlt)};
  width: 100%;
  box-sizing: border-box;
  padding: 48px 24px 24px 24px;
  min-height: 360px;
  margin-top: 48px;
  ${({ theme }) => theme.mediaQueries.lg} {
    width: 100%;
  }
  ${({ theme }) => theme.mediaQueries.xxl} {
    width: 1152px;
  }
`
export const ImageBox = styled.div`
  position: relative;
  transition: filter 0.25s linear;
  .default {
    display: none;
  }
  ${({ theme }) => theme.mediaQueries.lg} {
    .default {
      display: block;
      position: relative;
      z-index: 1;
    }
    .hover {
      transition: opacity 0.25s ease-in-out;
      position: absolute;
      top: 0;
      left: 0;
      opacity: 0;
      z-index: 2;
    }
    // filter: invert(38%) sepia(97%) saturate(433%) hue-rotate(215deg) brightness(83%) contrast(86%);
  }
`

export const ItemWrapper = styled(Flex)<{ $flexBasis: number }>`
  align-items: left;
  justify-content: space-between;
  flex-direction: column;
  flex-grow: 1;
  gap: 12px;
  cursor: pointer;
  .cta > * {
    transition: color 0.25s ease-in-out;
    path {
      transition: fill 0.25s ease-in-out;
    }
  }
  padding: 4px;
  &:hover {
    .cta > * {
      color: ${({ theme }) => theme.colors.primary};
      path {
        fill: ${({ theme }) => theme.colors.primary};
      }
    }
    ${ImageBox} {
      .hover {
        opacity: 1;
      }
      // filter: invert(0%) sepia(0%) saturate(100%) hue-rotate(0deg) brightness(100%) contrast(100%);
    }
  }
  flex-basis: calc(50% - 24px);

  &.type-a {
    height: 246px;
    &.adjust-height {
      margin-top: 20px;
      height: 220px;
    }
    ${({ theme }) => theme.mediaQueries.sm} {
      &.adjust-height {
        margin-top: 0px;
        height: 246px;
      }
      flex-basis: calc(33.3% - 48px);
    }
    ${({ theme }) => theme.mediaQueries.xl} {
      height: 286px;
      &.adjust-height {
        margin-top: 0px;
        height: 286px;
      }
      &.higher {
        height: 292px;
        &.adjust-height {
          margin-top: 0px;
          height: 292px;
        }
      }
    }
    ${({ theme }) => theme.mediaQueries.xxl} {
      flex-basis: ${({ $flexBasis }) => $flexBasis}%;
    }
  }
  &.type-b {
    height: 263px;
    ${({ theme }) => theme.mediaQueries.lg} {
      flex-basis: ${({ $flexBasis }) => $flexBasis}%;
    }
    ${({ theme }) => theme.mediaQueries.lg} {
      height: 286px;
    }
    ${({ theme }) => theme.mediaQueries.xl} {
      height: 256px;
    }
  }
  ${({ theme }) => theme.mediaQueries.sm} {
    padding: 12px;
  }
  ${({ theme }) => theme.mediaQueries.xxl} {
    flex-wrap: nowrap;
  }
`

export const FeatureBoxesWrapper = styled(Flex)`
  flex-wrap: wrap;
  gap: 24px;
  ${({ theme }) => theme.mediaQueries.xxl} {
    flex-wrap: nowrap;
  }
`

export const Title = styled.div`
  font-size: 32px;
  margin-bottom: 24px;
  font-weight: 600;
  line-height: 110%;
  padding-left: 12px;
  color: ${({ theme }) => theme.colors.secondary};
`


const useNftGameBlockData = () => {
  const { t } = useTranslation()
  return useMemo(() => {
    return [
      {
        title: t('Unlock Your Journey'),
        description: t('Mint your KEY to open the door to the metaverse and web3 wonders'),
        ctaTitle: t('Mint Now'),
        image: `/images/home/key/1s.jpg`,
        defaultImage: `/images/home/key/1.jpg`,
        path: 'https://opensea.io/collection/key2web3/overview',
      },
      {
        title: t('Reap Your Rewards'),
        description: t('Use your KEY to claim exciting rewards and enhance your digital experience'),
        ctaTitle: t('Claim Rewards'),
        image: `/images/home/key/2s.jpg`,
        defaultImage: `/images/home/key/2.jpg`,
        path: '/claim',
      },
      {
        title: t('Stake for Growth'),
        description: t('Stake your KEY to earn and grow in the decentralized digital realm'),
        ctaTitle: t('Stake Now'),
        image: `/images/home/key/3s.jpg`,
        defaultImage: `/images/home/key/3.jpg`,
        path: '/nftpools',
        className: 'adjust-height',
      },
    ]
  }, [t])
}

const FeatureBox: React.FC<{
  title: string
  description: string
  image: string
  defaultImage: string
  width: number
  ctaTitle: string
  className?: string
  path?: string
  onClick?: () => void
}> = ({ title, description, image, defaultImage, ctaTitle, width, className, path, onClick }) => {
  const { theme } = useTheme()
  const { push } = useRouter()
  return (
    <ItemWrapper
      className={className}
      $flexBasis={width}
      onClick={onClick ? () => onClick() : () => path && push(path)}
    >
      <ImageBox>
        <Image className="default" src={defaultImage} width={108} height={108} alt={title} />
        <Image className="hover" src={image} width={108} height={108} alt={title} />
      </ImageBox>
      <Box>
        <Text fontSize="20px" mb="8px" lineHeight="110%" fontWeight={600} color={theme.colors.text}>
          {title}
        </Text>
        <Text fontSize="14px" lineHeight="120%" color={theme.colors.text}>
          {description}
        </Text>
      </Box>
      <Flex className="cta">
        <Text fontSize="16px" fontWeight={600} color={theme.colors.textSubtle}>
          {ctaTitle}
        </Text>
        <ChevronRightIcon color={theme.colors.textSubtle} />
      </Flex>
    </ItemWrapper>
  )
}

const EcoSystemSection: React.FC = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const nftGameBlockData = useNftGameBlockData()
  const { isMobile, isMd } = useMatchBreakpoints()

  return (
    <Flex justifyContent="center" alignItems="center" flexDirection="column">
      <Text textAlign="center" p="0px 20px">
        <Text
          fontSize={['32px', null, null, '40px']}
          lineHeight="110%"
          display="inline-block"
          bold
          color={theme.colors.text}
        >
          {t('Key 2')}
        </Text>
        <Text
          fontSize={['32px', null, null, '40px']}
          ml="8px"
          display="inline-block"
          bold
          lineHeight="110%"
          color={theme.colors.secondary}
        >
          {t('WEB 3')}
        </Text>
      </Text>
      <CardWrapper>
        <Flex
          style={{ gap: 32 }}
          flexDirection={isMobile || isMd ? 'column' : 'row'}
          alignItems={isMobile || isMd ? undefined : 'center'}
        >
          <Image
            style={{ marginLeft: isMobile ? -32 : -72 }}
            src={`/images/home/key/KEYleft.png`}
            alt="KEYnft"
            width={344}
            height={360}
          />
          <Flex flexDirection="column">
            <Title>{t('Mint & Stake & Earn')}</Title>
            <FeatureBoxesWrapper>
              {nftGameBlockData.map((item) => (
                <FeatureBox
                  className={`type-a higher${item?.className ? ` ${item?.className}` : ''}`}
                  key={`${item.title}Block`}
                  title={item.title}
                  description={item.description}
                  defaultImage={item.defaultImage}
                  image={item.image}
                  width={100 / 5}
                  ctaTitle={item.ctaTitle}
                  path={item.path}
                  onClick={item.path.startsWith("http") ? () => window.open(item.path, '_blank', 'noopener noreferrer') : null}
                />
              ))}
            </FeatureBoxesWrapper>
          </Flex>
        </Flex>
      </CardWrapper>
    </Flex>
  )
}

export default EcoSystemSection