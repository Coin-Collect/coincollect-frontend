import { useMemo } from 'react'
import { useRouter } from 'next/router'
import { NextLinkFromReactRouter } from 'components/NextLink'
import { Menu as UikitMenu } from '@pancakeswap/uikit'
import { languageList } from 'config/localization/languages'
import { useTranslation } from 'contexts/Localization'
import PhishingWarningBanner from 'components/PhishingWarningBanner'
import useTheme from 'hooks/useTheme'
import { usePriceCakeBusd } from 'state/farms/hooks'
import { usePhishingBannerManager } from 'state/user/hooks'
import useWeb3React from 'hooks/useWeb3React'
import config from './config/config'
import UserMenu from './UserMenu'
import GlobalSettings from './GlobalSettings'
import { getActiveMenuItem, getActiveSubMenuItem } from './utils'
import { footerLinks } from './config/footerConfig'
import drawerLinks from "./config/drawerConfig"
import { nftsBaseUrl } from 'views/Nft/market/constants'

const Menu = (props) => {
  const { isDark, toggleTheme } = useTheme()
  const cakePriceUsd = usePriceCakeBusd()
  const { currentLanguage, setLanguage, t } = useTranslation()
  const { pathname } = useRouter()
  const [showPhishingWarningBanner] = usePhishingBannerManager()
  const { account } = useWeb3React()

  const dynamicDrawerLinks = useMemo(() => {
    const baseLinks = [...drawerLinks]

    if (account) {
      const dashboardHref = `${nftsBaseUrl}/profile/${account.toLowerCase()}`
      const dashboardLink = {
        label: t('Dashboard'),
        icon: 'HomeIcon',
        href: dashboardHref,
      }

      return [dashboardLink, ...baseLinks]
    }

    return baseLinks
  }, [account, t])

  const activeMenuItem = getActiveMenuItem({ menuConfig: dynamicDrawerLinks, pathname })
  const activeSubMenuItem = getActiveSubMenuItem({ menuItem: activeMenuItem, pathname })

  return (
    <UikitMenu
      linkComponent={(linkProps) => {
        return <NextLinkFromReactRouter to={linkProps.href} {...linkProps} prefetch={false} />
      }}
      userMenu={<UserMenu />}
      globalMenu={<GlobalSettings />}
      banner={false}
      isDark={isDark}
      showPhishingWarningBanner={false}
      toggleTheme={toggleTheme}
      currentLang={currentLanguage.code}
      langs={languageList}
      setLang={setLanguage}
      cakePriceUsd={cakePriceUsd.toNumber()}
      links={config(t)}
      drawerLinks={dynamicDrawerLinks}
      subLinks={activeMenuItem?.hideSubNav ? [] : activeMenuItem?.items}
      footerLinks={footerLinks(t)}
      activeItem={activeMenuItem?.href}
      activeSubItem={activeSubMenuItem?.href}
      buyCakeLabel={t('Buy COLLECT')}
      {...props}
    />
  )
}

export default Menu
