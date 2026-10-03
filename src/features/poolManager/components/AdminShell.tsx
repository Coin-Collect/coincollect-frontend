import Link from 'next/link'
import { useRouter } from 'next/router'
import ConnectWalletButton from 'components/ConnectWalletButton'
import useWeb3React from 'hooks/useWeb3React'
import { useSwitchChain } from 'wagmi'
import { getNftSmartChefFactoryAddress, getSmartChefFactoryAddress } from 'utils/addressHelpers'
import { POOL_MANAGER_CHAIN_ID } from '../constants'
import { ADMIN_NAVIGATION_LINKS, getAdminAuthorityPresentation, PRIMARY_CREATE_POOL_HREF } from '../adminNavigation'
import { usePoolManagerAuthority } from '../hooks'
import {
  ActionButton,
  AdminCreateLink,
  AdminHeader,
  AdminModeNotice,
  AdminModePill,
  AdminNav,
  AdminPage,
  AdminSubtitle,
  AdminTitle,
  Muted,
  NavLink,
} from './styles'

export default function AdminShell({
  title,
  subtitle,
  authorityScope = 'nft',
  headerAction,
  children,
}: {
  title: string
  subtitle: string
  authorityScope?: 'erc20' | 'nft'
  headerAction?: React.ReactNode
  children: React.ReactNode
}) {
  const router = useRouter()
  const { account, chainId } = useWeb3React()
  const { switchChain, isPending: switchingNetwork } = useSwitchChain()
  const factoryAddress =
    authorityScope === 'nft'
      ? getNftSmartChefFactoryAddress(POOL_MANAGER_CHAIN_ID)
      : getSmartChefFactoryAddress(POOL_MANAGER_CHAIN_ID)
  const authority = usePoolManagerAuthority(factoryAddress)
  const activePath = router.asPath.split('?')[0]
  const access = getAdminAuthorityPresentation({
    account,
    chainId,
    requiredChainId: POOL_MANAGER_CHAIN_ID,
    authorityState: authority.state,
    ownerIsContract: authority.ownerIsContract,
    authorized: authority.authorized,
    loading: authority.loading,
  })
  const createActionHidden =
    activePath === PRIMARY_CREATE_POOL_HREF || activePath.startsWith('/admin/nft-pools/launch/')
  const resolvedHeaderAction =
    headerAction ||
    (!createActionHidden ? (
      <Link href={PRIMARY_CREATE_POOL_HREF} passHref legacyBehavior>
        <AdminCreateLink>+ Create Pool</AdminCreateLink>
      </Link>
    ) : null)

  return (
    <AdminPage>
      <AdminHeader>
        <div>
          <AdminTitle>{title}</AdminTitle>
          <AdminSubtitle>{subtitle}</AdminSubtitle>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          {resolvedHeaderAction}
          <AdminModePill $ready={access.writeEnabled}>{access.statusLabel}</AdminModePill>
          {chainId ? (
            <AdminModePill>{chainId === POOL_MANAGER_CHAIN_ID ? 'Polygon' : `Chain ${chainId}`}</AdminModePill>
          ) : null}
          {account ? (
            <Muted>
              {account.slice(0, 6)}…{account.slice(-4)}
            </Muted>
          ) : (
            <ConnectWalletButton />
          )}
        </div>
      </AdminHeader>

      {access.notice ? (
        <AdminModeNotice role="status">
          <div>
            <strong>{access.notice.title}</strong>
            {access.notice.message}
            {authority.state === 'UNAVAILABLE' && authority.error ? (
              <details>
                <summary>Read details</summary>
                <code>{authority.error}</code>
              </details>
            ) : null}
          </div>
          {chainId && chainId !== POOL_MANAGER_CHAIN_ID ? (
            <ActionButton onClick={() => switchChain({ chainId: POOL_MANAGER_CHAIN_ID })} disabled={switchingNetwork}>
              {switchingNetwork ? 'Switching…' : 'Switch to Polygon'}
            </ActionButton>
          ) : authority.state === 'UNAVAILABLE' ? (
            <ActionButton $secondary onClick={() => void authority.refresh()}>
              Retry access check
            </ActionButton>
          ) : null}
        </AdminModeNotice>
      ) : null}

      {!factoryAddress ? (
        <AdminModeNotice role="status">
          <div>
            <strong>Factory not configured</strong>
            Pool data remains available where possible, but factory-specific access cannot be checked.
          </div>
        </AdminModeNotice>
      ) : null}

      <AdminNav aria-label="Pool Manager navigation">
        {ADMIN_NAVIGATION_LINKS.map((link) => (
          <Link href={link.href} passHref key={link.href} legacyBehavior>
            <NavLink $active={activePath === link.href || (link.href !== '/admin' && activePath.startsWith(link.href))}>
              {link.label}
            </NavLink>
          </Link>
        ))}
      </AdminNav>

      {children}
    </AdminPage>
  )
}
