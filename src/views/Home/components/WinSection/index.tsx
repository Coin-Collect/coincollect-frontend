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
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: filter 0.25s linear;
  .default {
    display: block;
    position: relative;
    z-index: 1;
  }
  .hover {
    display: none;
  }
  ${({ theme }) => theme.mediaQueries.lg} {
    width: 72px;
    height: 72px;
    .hover {
      display: block;
      transition: opacity 0.25s ease-in-out;
      position: absolute;
      top: 0;
      left: 0;
      opacity: 0;
      z-index: 2;
    }
  }
`

export const ItemWrapper = styled(Flex)`
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  width: 100%;
  max-width: 100%;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  background: ${({ theme }) => (theme.isDark ? 'rgba(24, 15, 45, 0.92)' : 'rgba(255, 255, 255, 0.95)')};
  box-shadow: 0 12px 32px rgba(31, 47, 86, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  .cta > * {
    transition: color 0.25s ease-in-out;
    path {
      transition: fill 0.25s ease-in-out;
    }
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 18px 36px rgba(31, 47, 86, 0.16);

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
    }
  }

  ${({ theme }) => theme.mediaQueries.sm} {
    flex: 0 1 230px;
    max-width: 260px;
    padding: 20px;
  }

  ${({ theme }) => theme.mediaQueries.lg} {
    flex: 0 1 240px;
    max-width: 280px;
  }

  ${({ theme }) => theme.mediaQueries.xxl} {
    flex: 0 1 260px;
  }
`

export const FeatureBoxesWrapper = styled(Flex)`
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  width: 100%;

  ${({ theme }) => theme.mediaQueries.md} {
    justify-content: flex-start;
  }

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

export const StepBadge = styled(Text)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 4px 12px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => (theme.isDark ? 'rgba(118, 69, 217, 0.18)' : 'rgba(118, 69, 217, 0.12)')};
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
  ctaTitle: string
  className?: string
  path?: string
  onClick?: () => void
  step: number
}> = ({ title, description, image, defaultImage, ctaTitle, className, path, onClick, step }) => {
  const { theme } = useTheme()
  const { push } = useRouter()
  return (
    <ItemWrapper className={className} onClick={onClick ? () => onClick() : () => path && push(path)}>
      <StepBadge>Step {step}</StepBadge>
      <Flex alignItems="center" width="100%" style={{ gap: 12 }}>
        <ImageBox>
          <Image className="default" src={defaultImage} width={72} height={72} alt={title} />
          <Image className="hover" src={image} width={72} height={72} alt={title} />
        </ImageBox>
        <Box flex="1">
          <Text fontSize="18px" mb="8px" lineHeight="120%" fontWeight={600} color={theme.colors.text}>
            {title}
          </Text>
          <Text fontSize="13px" lineHeight="140%" color={theme.colors.textSubtle}>
            {description}
          </Text>
        </Box>
      </Flex>
      <Flex className="cta" alignItems="center" justifyContent="space-between" width="100%">
        <Text fontSize="14px" fontWeight={600} color={theme.colors.textSubtle}>
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
              {nftGameBlockData.map((item, index) => (
                <FeatureBox
                  className={`type-a higher${item?.className ? ` ${item?.className}` : ''}`}
                  key={`${item.title}Block`}
                  title={item.title}
                  description={item.description}
                  defaultImage={item.defaultImage}
                  image={item.image}
                  ctaTitle={item.ctaTitle}
                  path={item.path}
                  onClick={item.path.startsWith("http") ? () => { window.open(item.path, '_blank', 'noopener noreferrer') } : undefined}
                  step={index + 1}
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
