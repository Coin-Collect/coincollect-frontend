import { FooterLinkType } from '@pancakeswap/uikit'
import { ContextApi } from 'contexts/Localization/types'

export const footerLinks: (t: ContextApi['t']) => FooterLinkType[] = (t) => [
  {
    label: t('About'),
    items: [
      {
        label: t('Contact'),
        href: 'https://docs.coincollect.org/extras/contact-us',
      },
      {
        label: t('What is Collect?'),
        href: 'https://docs.coincollect.org/usdcollect-token/what-is-usdcollect',
      },
      {
        label: t('Tokenomics'),
        href: 'https://docs.coincollect.org/usdcollect-token/tokenomics',
      },
      {
        label: t('Community'),
        href: 'https://docs.coincollect.org/extras/offical-accounts',
      },
      /*
      {
        label: '—',
      },
      {
        label: t('Online Store'),
        href: 'https://pancakeswap.creator-spring.com/',
        isHighlighted: true,
      },
      */
    ],
  },
  {
    label: t('Help'),
    items: [
      {
        label: t('Customer Support'),
        href: 'https://docs.coincollect.org/extras/offical-accounts',
      },
      {
        label: t('Troubleshooting'),
        href: 'https://docs.coincollect.org/',
      },
      {
        label: t('Guides'),
        href: 'https://docs.coincollect.org',
      },
    ],
  },
  {
    label: t('Developers'),
    items: [
      {
        label: 'Github',
        href: 'https://github.com/coin-collect',
      },
      {
        label: t('Documentation'),
        href: 'https://docs.coincollect.org/',
      },
      /*
      {
        label: t('Bug Bounty'),
        href: 'https://docs.pancakeswap.finance/code/bug-bounty',
      },
      */
      {
        label: t('Audits'),
        href: 'https://docs.coincollect.org',
      },
      {
        label: t('Careers'),
        href: 'https://docs.coincollect.org/extras/offical-accounts',
      },
    ],
  },
]
