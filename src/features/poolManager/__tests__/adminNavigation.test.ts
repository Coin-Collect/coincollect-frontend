import { ADMIN_NAVIGATION_LINKS, getAdminAuthorityPresentation, PRIMARY_CREATE_POOL_HREF } from '../adminNavigation'

describe('admin navigation', () => {
  it('keeps NFT Pools canonical and Legacy ERC20 secondary', () => {
    expect(ADMIN_NAVIGATION_LINKS.map(({ label }) => label)).toEqual([
      'Overview',
      'NFT Pools',
      'Treasury',
      'Legacy ERC20',
    ])
    expect(PRIMARY_CREATE_POOL_HREF).toBe('/admin/nft-pools/new')
    expect(ADMIN_NAVIGATION_LINKS.some(({ href }) => (href as string) === '/admin/pools/new')).toBe(false)
  })
})

describe('admin authority presentation', () => {
  const baseInput = {
    account: '0xoperator',
    chainId: 137,
    requiredChainId: 137,
    authorityState: 'AUTHORIZED' as const,
    ownerIsContract: false,
    authorized: true,
    loading: false,
  }

  it('shows normal read access when the factory is contract-owned', () => {
    expect(
      getAdminAuthorityPresentation({
        ...baseInput,
        authorityState: 'CONTRACT_OWNER',
        ownerIsContract: true,
        authorized: false,
      }),
    ).toMatchObject({
      statusLabel: 'Read-only',
      writeEnabled: false,
      notice: { title: 'Contract-owned factory' },
    })
  })

  it('keeps data visible for the wrong wallet while describing the write requirement', () => {
    expect(
      getAdminAuthorityPresentation({ ...baseInput, authorityState: 'WRONG_ACCOUNT', authorized: false }),
    ).toMatchObject({
      statusLabel: 'Read-only',
      writeEnabled: false,
      notice: { message: 'Connect the authorized operator wallet to perform pool actions.' },
    })
  })

  it('enables writes only for an authorized wallet on the required chain', () => {
    expect(getAdminAuthorityPresentation(baseInput)).toMatchObject({
      statusLabel: 'Write access',
      writeEnabled: true,
    })
    expect(getAdminAuthorityPresentation({ ...baseInput, chainId: 1 })).toMatchObject({
      statusLabel: 'Read-only',
      writeEnabled: false,
      notice: { title: 'Wrong network' },
    })
  })
})
