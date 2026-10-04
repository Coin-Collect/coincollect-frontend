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
import { usePoolManagerAuthority } from 'features/poolManager/hooks'
import { hasAdminWalletAccess } from 'features/poolManager/adminNavigation'
import { POOL_MANAGER_CHAIN_ID } from 'features/poolManager/constants'
import { getNftSmartChefFactoryAddress } from 'utils/addressHelpers'
import UserMenu from './UserMenu'
import GlobalSettings from './GlobalSettings'
import FooterControls from './FooterControls'
import { getActiveMenuItem, getActiveSubMenuItem } from './utils'
import { footerLinks } from './config/footerConfig'
import { getNavConfig } from './config/navConfig'
import { getDrawerLinks, getSubLinks, getTopLinks } from './config/navMappers'
import { isLocalForkMode } from 'config/localFork'

const LocalForkNotice = () => (
  <div
    role="status"
    style={{
      position: 'relative',
      zIndex: 1100,
      padding: '8px 16px',
      background: '#5b1a2b',
      color: '#fff',
      textAlign: 'center',
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: '0.06em',
    }}
  >
    LOCAL FORK · Chain 31337 · Transactions stay on this computer; no Polygon mainnet writes
  </div>
)

const Menu = (props) => {
  const { isDark, toggleTheme } = useTheme()
  const cakePriceUsd = usePriceCakeBusd()
  const { currentLanguage, setLanguage, t } = useTranslation()
  const { asPath } = useRouter()
  const [showPhishingWarningBanner] = usePhishingBannerManager()
  const { account } = useWeb3React()
  const nftFactoryAddress = getNftSmartChefFactoryAddress(POOL_MANAGER_CHAIN_ID)
  const authority = usePoolManagerAuthority(nftFactoryAddress)
  const adminHref = hasAdminWalletAccess({
    account,
    checkedAccount: authority.account,
    authorityState: authority.state,
    authorized: authority.authorized,
    ownerIsContract: authority.ownerIsContract,
  })
    ? '/admin'
    : undefined

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
    <>
      {isLocalForkMode ? <LocalForkNotice /> : null}
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
    </>
  )
}

export default Menu
