import { useTranslation } from 'contexts/Localization'
import { Button, ChevronLeftIcon, ChevronRightIcon, Flex, Text } from '@pancakeswap/uikit'
import useTheme from 'hooks/useTheme'
import styled from 'styled-components'
import { useRef, useCallback } from 'react'
import { NextLinkFromReactRouter } from 'components/NextLink'

const articlesData = [
  {
    link: '/nftpools',
    imgUrl: '/images/home/collections/unicorns.jpg',
    from: 'Crypto Unicorns',
    title: 'Stake your Unicorn NFT and start earning rewards instantly',
  },
  {
    link: '/nftpools',
    imgUrl: '/images/home/collections/lens.jpg',
    from: 'Lens Protocol',
    title: 'Stake your Lens Handle NFT and start earning rewards instantly',
  },
  {
    link: '/nftpools',
    imgUrl: '/images/home/collections/sandbox.jpg',
    from: 'Sandbox Land',
    title: 'Stake your Sandbox Land and start earning rewards instantly',
  },
  {
    link: '/nftpools',
    imgUrl: '/images/home/collections/udomains.jpg',
    from: 'Unstoppable Domains',
    title: 'Stake your Unstoppable Domains and start earning rewards instantly',
  },
  {
    link: '/nftpools',
    imgUrl: '/images/home/collections/galxe.jpg',
    from: 'Galxe',
    title: 'Stake your Galxe OAT NFT and start earning rewards instantly',
  },
  {
    link: '/nftpools',
    imgUrl: '/images/home/collections/smartcat.jpg',
    from: 'Smart Cats',
    title: 'Stake your Smart Cats NFT and start earning rewards instantly',
  },
]

const NewsCard = styled.div`
  vertical-align: top;
  width: 280px;
  height: 387px;
  border-radius: 24px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  box-shadow: 0px 2px 0px 0px ${({ theme }) => theme.colors.cardBorder};
  display: inline-block;
  margin-right: 34px;
  cursor: pointer;
  scroll-snap-align: start;
  &:last-child {
    scroll-snap-align: end;
  }
`
const ImageBox = styled.div`
  height: 200px;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  img {
    flex-shrink: 0;
    min-width: 100%;
    min-height: 100%;
  }
`
const ContentBox = styled.div`
  height: 187px;
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-top: none;
  padding: 20px;
`

const DescriptionBox = styled.div`
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-wrap;
  font-size: 9px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%;
  margin-top: 16px;
  max-height: 56px;
`

const CardWrapper = styled.div`
  white-space: nowrap;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  border-radius: 24px;
  padding-bottom: 5px;
  &::-webkit-scrollbar {
    display: none;
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }
`
const ArrowButton = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  border: 2px solid ${({ theme }) => theme.colors.primary};
  svg path {
    fill: ${({ theme }) => theme.colors.primary};
  }
  cursor: pointer;
`

export const FeaturedSection: React.FC = () => {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const scrollWrapper = useRef<HTMLDivElement>(null)
  const onButtonClick = useCallback((scrollTo: 'next' | 'pre') => {
    const scrollTarget = scrollWrapper.current
    if (!scrollTarget) return
    if (scrollTo === 'next') {
      scrollTarget.scrollLeft += 280
      return
    }
    scrollTarget.scrollLeft -= 280
  }, [])
  return (
    <Flex flexDirection="column" style={{ gap: 36 }}>
      <Flex flexDirection="column">
        <Flex justifyContent="center" style={{ gap: 8 }}>
          <Text fontSize={["25px","30px","40px"]} fontWeight={600} textAlign="center">
            {t('Community')}
          </Text>
          <Text fontSize={["25px","30px","40px"]} fontWeight={600} color="secondary" textAlign="center">
            {t('Collections')}
          </Text>
        </Flex>

        <Text textAlign="center" color="textSubtle">
          {t('Stake Your NFTs and Start Earning!')}
        </Text>
      </Flex>
      <Flex>
        <Flex alignItems="center" mr="8px">
          <ArrowButton>
            <ChevronLeftIcon onClick={() => onButtonClick('pre')} color={theme.colors.textSubtle} />
          </ArrowButton>
        </Flex>
        <CardWrapper ref={scrollWrapper}>
          {
            articlesData?.map((d, index) => (
              
                <NewsCard key={index}>
                  <NextLinkFromReactRouter to="/nftpools">
                  <ImageBox>
                    <img src={d.imgUrl} alt="" />
                  </ImageBox>
                  <ContentBox>
                    <Flex justifyContent="space-between">
                      <Text bold fontSize={12} color={theme.colors.textSubtle} lineHeight="120%">
                        {d.from}
                      </Text>
                    </Flex>
                    <Text bold mt="16px" lineHeight="120%" minHeight="66px" style={{ whiteSpace: 'pre-wrap' }}>
                      {d.title}
                    </Text>
                    <Flex justifyContent="center">

                      <Button variant='primary'>{t('Stake Now')}</Button>

                    </Flex>
                  </ContentBox>
                  </NextLinkFromReactRouter>
                </NewsCard>
              
            ))}
        </CardWrapper>
        <Flex alignItems="center" ml="8px">
          <ArrowButton>
            <ChevronRightIcon onClick={() => onButtonClick('next')} color={theme.colors.textSubtle} />
          </ArrowButton>
        </Flex>
      </Flex>
    </Flex>
  )
}