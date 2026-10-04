import { PoolManagerAuthorityState } from './types'

export const PRIMARY_CREATE_POOL_HREF = '/admin/nft-pools/new'

export const ADMIN_NAVIGATION_LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/nft-pools', label: 'NFT Pools' },
  { href: '/admin/treasury', label: 'Treasury' },
  { href: '/admin/pools', label: 'Legacy ERC20' },
] as const

export interface AdminAuthorityPresentationInput {
  account?: string | null
  chainId?: number
  requiredChainId: number
  authorityState: PoolManagerAuthorityState
  ownerIsContract: boolean
  authorized: boolean
  loading: boolean
}

export function hasAdminWalletAccess(input: {
  account?: string | null
  checkedAccount?: string | null
  authorityState: PoolManagerAuthorityState
  authorized: boolean
  ownerIsContract: boolean
}): boolean {
  const sameCheckedAccount = Boolean(
    input.account &&
      input.checkedAccount &&
      input.account.toLowerCase() === input.checkedAccount.toLowerCase(),
  )

  return Boolean(
    sameCheckedAccount &&
      input.authorityState === 'AUTHORIZED' &&
      input.authorized &&
      !input.ownerIsContract,
  )
}

export interface AdminAuthorityNotice {
  title: string
  message: string
}

export function getAdminAuthorityPresentation(input: AdminAuthorityPresentationInput): {
  statusLabel: string
  writeEnabled: boolean
  notice?: AdminAuthorityNotice
} {
  if (input.loading) return { statusLabel: 'Checking access', writeEnabled: false }

  const writeEnabled = Boolean(
    input.account &&
      input.chainId === input.requiredChainId &&
      input.authorized &&
      !input.ownerIsContract &&
      input.authorityState === 'AUTHORIZED',
  )

  if (input.ownerIsContract || input.authorityState === 'CONTRACT_OWNER') {
    return {
      statusLabel: 'Read-only',
      writeEnabled: false,
      notice: {
        title: 'Contract-owned factory',
        message: 'Pool data is available in read-only mode. Writes require the configured governance flow.',
      },
    }
  }

  if (!input.account || input.authorityState === 'WALLET_REQUIRED') {
    return {
      statusLabel: 'Read-only',
      writeEnabled: false,
      notice: {
        title: 'Read-only mode',
        message: 'Connect the authorized operator wallet to perform pool actions.',
      },
    }
  }

  if (input.chainId !== input.requiredChainId) {
    return {
      statusLabel: 'Read-only',
      writeEnabled: false,
      notice: {
        title: 'Wrong network',
        message: `Switch your wallet to Polygon (chain ${input.requiredChainId}) to perform pool actions.`,
      },
    }
  }

  if (input.authorityState === 'WRONG_ACCOUNT') {
    return {
      statusLabel: 'Read-only',
      writeEnabled: false,
      notice: {
        title: 'Read-only mode',
        message: 'Connect the authorized operator wallet to perform pool actions.',
      },
    }
  }

  if (input.authorityState === 'UNAVAILABLE') {
    return {
      statusLabel: 'Read-only',
      writeEnabled: false,
      notice: {
        title: 'Access could not be verified',
        message: 'Pool data remains available. Writes stay disabled until factory access can be confirmed.',
      },
    }
  }

  return { statusLabel: 'Write access', writeEnabled }
}
