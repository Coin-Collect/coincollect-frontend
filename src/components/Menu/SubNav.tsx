import styled from 'styled-components'
import { ButtonMenu, ButtonMenuItem } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import { useRouter } from 'next/router'
import Link from 'next/link'

const StyledNav = styled.nav`
  margin-bottom: 40px;
`

const getActiveIndex = (pathname: string): number => {
  if (
    pathname.includes('/pool') ||
    pathname.includes('/create') ||
    pathname.includes('/add') ||
    pathname.includes('/remove') ||
    pathname.includes('/find') ||
    pathname.includes('/liquidity')
  ) {
    return 1
  }
  return 0
}

const Nav = () => {
  const { pathname } = useRouter()
  const { t } = useTranslation()
  return (
    <StyledNav>
      <ButtonMenu activeIndex={getActiveIndex(pathname)} scale="sm" variant="subtle">
        <ButtonMenuItem as={Link} href="/swap" id="swap-nav-link">
          {t('Swap')}
        </ButtonMenuItem>
        <ButtonMenuItem as={Link} href="/pool" id="pool-nav-link">
          {t('Liquidity')}
        </ButtonMenuItem>
      </ButtonMenu>
    </StyledNav>
  )
}

export default Nav
