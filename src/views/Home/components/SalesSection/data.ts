import { TranslateFunction } from 'contexts/Localization/types'
import { SalesSectionProps } from '.'
import { getRandomSuperheroVideos } from 'utils/getRandomSuperheroVideo'

export const swapSectionData = (t: TranslateFunction): SalesSectionProps => ({
  headingText: t('Trade anything. No registration, no hassle.'),
  bodyText: t('Trade any token on BNB Smart Chain in seconds, just by connecting your wallet.'),
  reverse: false,
  primaryButton: {
    to: '/claim',
    text: t('Trade Now'),
    external: false,
  },
  secondaryButton: {
    to: 'https://docs.coincollect.org/',
    text: t('Learn'),
    external: true,
  },
  video: {
    src: '/sheepCollect.webm',
    maxHeight: '400px',
  },
})

export const earnSectionData = (t: TranslateFunction): SalesSectionProps => {
  const randomVideos = getRandomSuperheroVideos(3)
  
  return {
    headingText: t('Earn passive income with crypto.'),
    bodyText: t('PancakeSwap makes it easy to make your crypto work for you.'),
    reverse: true,
    primaryButton: {
      to: '/pools',
      text: t('Stake'),
      external: false,
    },
    secondaryButton: {
      to: 'https://docs.coincollect.org/',
      text: t('Learn'),
      external: true,
    },
    videos: {
      path: '/images/superheroes/',
      attributes: randomVideos.map((videoPath, index) => ({
        src: videoPath.replace('/images/superheroes/', '').replace('.webm', ''),
        alt: t(`Superhero video ${index + 1}`),
      })),
    },
  }
}

export const cakeSectionData = (t: TranslateFunction): SalesSectionProps => ({
  headingText: t('CAKE makes our world go round.'),
  bodyText: t(
    'CAKE token is at the heart of the PancakeSwap ecosystem. Buy it, win it, farm it, spend it, stake it... heck, you can even vote with it!',
  ),
  reverse: false,
  primaryButton: {
    to: '/swap?outputCurrency=0x56633733fc8BAf9f730AD2b6b9956Ae22c6d4148',
    text: t('Buy COLLECT'),
    external: false,
  },
  secondaryButton: {
    to: 'https://docs.coincollect.org/',
    text: t('Learn'),
    external: true,
  },

  images: {
    path: '/images/home/cake/',
    attributes: [
      { src: 'bottom-right', alt: t('COLLECT angry birds') },
      { src: 'top-right', alt: t('COLLECT Simpsons') },
      { src: 'coin', alt: t('COLLECT Vader') },
      { src: 'top-left', alt: t('COLLECT minions') },
    ],
  },
})
