import { useTranslation } from 'contexts/Localization'
import { Box, ChevronRightIcon, Flex, Text, useMatchBreakpoints, Image, Button } from '@pancakeswap/uikit'
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

export const StyledButton = styled(Button)`
  margin-left: 12px;
  margin-right: 12px;
  margin-bottom: 24px;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border-radius: 16px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease-in-out;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primaryBright};
    transform: translateY(-2px);
  }
`

export const SecondaryButton = styled(Button)`
  margin-left: 12px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`

export const ButtonContainer = styled(Flex)`
  margin-left: 12px;
  margin-bottom: 24px;
  gap: 0px;
`


const useNftGameBlockData = () => {
  const { t } = useTranslation()
  return useMemo(() => {
    return [
      {
        title: t('Unlock Your Journey'),
        description: t('Mint your KEY to enter the metaverse'),
        ctaTitle: t('Mint Now'),
        image: `/images/home/key/1s.png`,
        defaultImage: `/images/home/key/1.png`,
        path: 'https://opensea.io/collection/key2web3/overview',
      },
      {
        title: t('Reap Your Rewards'),
        description: t('Claim rewards and enhance your experience'),
        ctaTitle: t('Claim Rewards'),
        image: `/images/home/key/2s.png`,
        defaultImage: `/images/home/key/2.png`,
        path: '/claim',
      },
      {
        title: t('Stake for Growth'),
        description: t('Stake your KEY to earn and grow'),
        ctaTitle: t('Stake Now'),
        image: `/images/home/key/3s.png`,
        defaultImage: `/images/home/key/3.png`,
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
      <CardWrapper>
        <Flex
          style={{ gap: 32 }}
          flexDirection={isMobile || isMd ? 'column' : 'row'}
          alignItems={isMobile || isMd ? undefined : 'center'}
        >
          <Image
            style={{ marginLeft: isMobile ? 0 : -72, alignSelf: 'center' }}
            src={`/images/home/key/KEYleft.png`}
            alt="KEYnft"
            width={344}
            height={360}
          />
          <Flex flexDirection="column">
            <Title style={{marginBottom:'2px'}}>{t('Key 2 Web 3')}</Title>
            <Text mb={24} pl={12} fontSize="20px" lineHeight="120%" fontWeight={800} color={theme.colors.text}>
              Mint, Stake & Earn Rewards
            </Text>
            <Text mb={24} pl={12} fontSize="14px" lineHeight="120%" fontWeight={800} color={theme.colors.text}>
            Your gateway to web3 and the metaverse. Mint, stake, and earn rewards in the decentralized realm.
            </Text>
            <ButtonContainer>
              <StyledButton
                onClick={() => window.open('https://ghostalien.questgalaxy.com/', '_blank', 'noopener noreferrer')}
              >
                Play Game
              </StyledButton>
              <SecondaryButton
              variant="secondary"
              onClick={() => window.open('https://key2web3.com/', '_blank', 'noopener,noreferrer')}
            >
              Visit Website
            </SecondaryButton>
            </ButtonContainer>
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
                  onClick={item.path.startsWith("http") ? () => { window.open(item.path, '_blank', 'noopener noreferrer') } : undefined}
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