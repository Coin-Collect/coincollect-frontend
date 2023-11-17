import { Language } from "../LangSelector/types";
import { FooterLinkType, SocialLinkType } from "./types";

export const footerLinks: FooterLinkType[] = [
  {
    label: "About",
    items: [
      {
        label: "Contact",
        href: "https://docs.coincollect.org",
      },
      {
        label: "Blog",
        href: "https://docs.coincollect.org",
      },
      {
        label: "Community",
        href: "https://docs.pancakeswap.finance/contact-us/telegram",
      },
      {
        label: "CAKE",
        href: "https://docs.pancakeswap.finance/tokenomics/cake",
      },
      {
        label: "—",
      },
      {
        label: "Online Store",
        href: "https://pancakeswap.creator-spring.com/",
        isHighlighted: true,
      },
    ],
  },
  {
    label: "Help",
    items: [
      {
        label: "Customer",
        href: "Support https://docs.pancakeswap.finance/contact-us/customer-support",
      },
      {
        label: "Troubleshooting",
        href: "https://docs.pancakeswap.finance/help/troubleshooting",
      },
      {
        label: "Guides",
        href: "https://docs.pancakeswap.finance/get-started",
      },
    ],
  },
  {
    label: "Developers",
    items: [
      {
        label: "Github",
        href: "https://github.com/pancakeswap",
      },
      {
        label: "Documentation",
        href: "https://docs.pancakeswap.finance",
      },
      {
        label: "Bug Bounty",
        href: "https://app.gitbook.com/@pancakeswap-1/s/pancakeswap/code/bug-bounty",
      },
      {
        label: "Audits",
        href: "https://docs.pancakeswap.finance/help/faq#is-pancakeswap-safe-has-pancakeswap-been-audited",
      },
      {
        label: "Careers",
        href: "https://docs.pancakeswap.finance/hiring/become-a-chef",
      },
    ],
  },
];

export const socials: SocialLinkType[] = [
  {
    label: "Twitter",
    icon: "Twitter",
    href: "https://twitter.com/CoinCollectOrg",
  },
  {
    label: "Telegram",
    icon: "Telegram",
    href: "https://t.me/CoinCollectOrg",
  },
  /*
  {
    label: "Reddit",
    icon: "Reddit",
    href: "https://reddit.com/r/pancakeswap",
  },
  */
  {
    label: "Instagram",
    icon: "Instagram",
    href: "https://www.instagram.com/coincollectorg/",
  },
  {
    label: "Github",
    icon: "Github",
    href: "https://github.com/coin-collect",
  },
  {
    label: "Discord",
    icon: "Discord",
    href: "https://discord.gg/FW9dnRFZk9",
  },
  {
    label: "Youtube",
    icon: "Youtube",
    href: "https://www.youtube.com/@CoinCollectApp",
  },
  {
    label: "Medium",
    icon: "Medium",
    href: "https://medium.com/@coincollect",
  },
];

export const langs: Language[] = [...Array(20)].map((_, i) => ({
  code: `en${i}`,
  language: `English${i}`,
  locale: `Locale${i}`,
}));
