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
import UserMenu from './UserMenu'
import GlobalSettings from './GlobalSettings'
import FooterControls from './FooterControls'
import { getActiveMenuItem, getActiveSubMenuItem } from './utils'
import { footerLinks } from './config/footerConfig'
import { getNavConfig } from './config/navConfig'
import { getDrawerLinks, getSubLinks, getTopLinks } from './config/navMappers'
import { getSmartChefFactoryAddress, getNftSmartChefFactoryAddress } from 'utils/addressHelpers'
import { POOL_MANAGER_CHAIN_ID } from 'features/poolManager/constants'
import { usePoolManagerAuthority } from 'features/poolManager/hooks'

const Menu = (props) => {
  const { isDark, toggleTheme } = useTheme()
  const cakePriceUsd = usePriceCakeBusd()
  const { currentLanguage, setLanguage, t } = useTranslation()
  const { asPath } = useRouter()
  const [showPhishingWarningBanner] = usePhishingBannerManager()
  const { account } = useWeb3React()
  const erc20Authority = usePoolManagerAuthority(getSmartChefFactoryAddress(POOL_MANAGER_CHAIN_ID))
  const nftAuthority = usePoolManagerAuthority(getNftSmartChefFactoryAddress(POOL_MANAGER_CHAIN_ID))

  const accountMatches = (authority: typeof erc20Authority) =>
    Boolean(account && authority.account && authority.account.toLowerCase() === account.toLowerCase())
  const erc20Admin = accountMatches(erc20Authority) && !erc20Authority.loading && erc20Authority.authorized
  const nftAdmin = accountMatches(nftAuthority) && !nftAuthority.loading && nftAuthority.authorized
  const adminHref = erc20Admin ? '/admin' : nftAdmin ? '/admin/nft-pools' : undefined

  const navItems = useMemo(() => getNavConfig(t, account, adminHref), [account, adminHref, t])
  const drawerLinks = useMemo(() => getDrawerLinks(navItems), [navItems])
  const topLinks = useMemo(() => getTopLinks(navItems), [navItems])

  const activeMenuItem = getActiveMenuItem({ menuConfig: navItems, currentPath: asPath })
  const activeSubMenuItem = getActiveSubMenuItem({ menuItem: activeMenuItem, currentPath: asPath })
  const subLinks = activeMenuItem
    ? activeMenuItem.hideSubNav
      ? []
      : activeMenuItem.children && activeMenuItem.children.length > 0
      ? getSubLinks(activeMenuItem.children)
      : undefined
    : undefined

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
      links={topLinks}
      drawerLinks={drawerLinks}
      subLinks={subLinks}
      footerLinks={footerLinks(t)}
      activeItem={activeMenuItem?.href}
      activeSubItem={activeSubMenuItem?.href}
      homeHref="/"
      buyCakeLabel={t('Buy COLLECT')}
      panelFooterActions={<FooterControls />}
      {...props}
    />
  )
}

export default Menu
