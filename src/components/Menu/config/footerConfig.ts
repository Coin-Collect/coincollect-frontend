import { FooterLinkType } from '@pancakeswap/uikit'
import { ContextApi } from 'contexts/Localization/types'

export const footerLinks: (t: ContextApi['t']) => FooterLinkType[] = (t) => [
  {
    label: t('About'),
    items: [
      {
        label: t('Contact'),
        href: 'https://docs.pancakeswap.finance/contact-us',
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
        href: 'https://discord.com/invite/trs9VqC9gq',
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
        href: 'https://docs.coincollect.org/product/for-support',
      },
      {
        label: t('Troubleshooting'),
        href: 'https://docs.coincollect.org/',
      },
      {
        label: t('Guides'),
        href: 'https://docs.coincollect.org/getting-started',
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
        href: 'https://docs.pancakeswap.finance/help/faq#is-pancakeswap-safe-has-pancakeswap-been-audited',
      },
      {
        label: t('Careers'),
        href: '/',
      },
    ],
  },
]
