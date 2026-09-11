import Link from 'next/link'
import { useRouter } from 'next/router'
import ConnectWalletButton from 'components/ConnectWalletButton'
import useWeb3React from 'hooks/useWeb3React'
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
  children,
}: {
  title: string
  subtitle: string
  authorityScope?: 'erc20' | 'nft'
  children: React.ReactNode
}) {
  const router = useRouter()
  const { account, chainId } = useWeb3React()
  const factoryAddress =
    authorityScope === 'nft'
      ? getNftSmartChefFactoryAddress(POOL_MANAGER_CHAIN_ID)
      : getSmartChefFactoryAddress(POOL_MANAGER_CHAIN_ID)
  const authority = usePoolManagerAuthority(factoryAddress)
  const activePath = router.asPath.split('?')[0]

  if (!account) {
    return <AccessGate title="Admin panel" text="Connect your wallet to continue." action />
  }

  if (authority.loading) {
    return <AccessGate title="Admin panel" text="Checking access…" />
  }

  if (chainId !== POOL_MANAGER_CHAIN_ID || !authority.authorized) {
    return <AccessGate title="Admin access required" text="This wallet does not have admin access." />
  }

  return (
    <AdminPage>
      <AdminHeader>
        <div>
          <AdminTitle>{title}</AdminTitle>
          <AdminSubtitle>{subtitle}</AdminSubtitle>
        </div>
        {account ? (
          <Muted>
            {account.slice(0, 6)}…{account.slice(-4)}
          </Muted>
        ) : (
          <ConnectWalletButton />
        )}
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

function AccessGate({ title, text, action = false }: { title: string; text: string; action?: boolean }) {
  return (
    <AccessPage>
      <AccessCard>
        <AccessMark aria-hidden="true">◈</AccessMark>
        <AccessTitle>{title}</AccessTitle>
        <AccessText>{text}</AccessText>
        {action ? <ConnectWalletButton /> : null}
      </AccessCard>
    </AccessPage>
  )
}

function NoticeLine({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 18, color: '#B45309', fontSize: 13 }}>{children}</div>
}

export { LinkText }
