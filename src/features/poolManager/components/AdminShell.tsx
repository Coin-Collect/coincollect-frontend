import Link from 'next/link'
import { useRouter } from 'next/router'
import ConnectWalletButton from 'components/ConnectWalletButton'
import useWeb3React from 'hooks/useWeb3React'
import { useSwitchChain } from 'wagmi'
import { getNftSmartChefFactoryAddress, getSmartChefFactoryAddress } from 'utils/addressHelpers'
import { POOL_MANAGER_CHAIN_ID } from '../constants'
import { usePoolManagerAuthority } from '../hooks'
import {
  AccessCard,
  AccessMark,
  AccessPage,
  AccessText,
  AccessTitle,
  AdminHeader,
  AdminNav,
  AdminPage,
  AdminSubtitle,
  AdminTitle,
  LinkText,
  Muted,
  NavLink,
  ActionButton,
} from './styles'

const links = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/nft-pools', label: 'NFT pools' },
  { href: '/admin/pools', label: 'ERC20 pools' },
  { href: '/admin/treasury', label: 'Treasury' },
]

export default function AdminShell({
  title,
  subtitle,
  authorityScope = 'erc20',
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

  if (!account) {
    return <AccessGate title="Admin panel" text="Connect Wallet" action />
  }

  if (chainId !== POOL_MANAGER_CHAIN_ID) {
    return (
      <AccessGate
        title="Wrong network"
        text="Switch to Polygon"
        action={
          <ActionButton onClick={() => switchChain({ chainId: POOL_MANAGER_CHAIN_ID })} disabled={switchingNetwork}>
            {switchingNetwork ? 'Switching…' : 'Switch to Polygon'}
          </ActionButton>
        }
      />
    )
  }

  if (authority.loading) {
    return <AccessGate title="Admin panel" text="Checking admin access" />
  }

  if (authority.state === 'UNAVAILABLE') {
    return (
      <AccessGate
        title="Admin access unavailable"
        text="Could not check this wallet's access."
        action={<ActionButton onClick={() => void authority.refresh()}>Retry</ActionButton>}
      />
    )
  }

  if (!authority.authorized) {
    return <AccessGate title="Admin access required" text="This wallet is not authorized" />
  }

  return (
    <AdminPage>
      <AdminHeader>
        <div>
          <AdminTitle>{title}</AdminTitle>
          <AdminSubtitle>{subtitle}</AdminSubtitle>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {headerAction}
          {account ? (
            <Muted>
              {account.slice(0, 6)}…{account.slice(-4)}
            </Muted>
          ) : (
            <ConnectWalletButton />
          )}
        </div>
      </AdminHeader>
      <AdminNav aria-label="Pool Manager navigation">
        {links.map((link) => (
          <Link href={link.href} passHref key={link.href} legacyBehavior>
            <NavLink $active={activePath === link.href || (link.href !== '/admin' && activePath.startsWith(link.href))}>
              {link.label}
            </NavLink>
          </Link>
        ))}
      </AdminNav>
      {chainId && chainId !== POOL_MANAGER_CHAIN_ID ? (
        <NoticeLine>Switch wallet to Polygon (chain {POOL_MANAGER_CHAIN_ID}) for admin actions.</NoticeLine>
      ) : null}
      {!factoryAddress ? (
        <NoticeLine>
          {authorityScope === 'nft' ? 'NFT SmartChefFactory' : 'SmartChefFactory'} is not configured for this network.
        </NoticeLine>
      ) : null}
      {children}
    </AdminPage>
  )
}

function AccessGate({
  title,
  text,
  action = false,
}: {
  title: string
  text: string
  action?: boolean | React.ReactNode
}) {
  return (
    <AccessPage>
      <AccessCard>
        <AccessMark aria-hidden="true">◈</AccessMark>
        <AccessTitle>{title}</AccessTitle>
        <AccessText>{text}</AccessText>
        {action === true ? <ConnectWalletButton /> : action || null}
      </AccessCard>
    </AccessPage>
  )
}

function NoticeLine({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 18, color: '#B45309', fontSize: 13 }}>{children}</div>
}

export { LinkText }
