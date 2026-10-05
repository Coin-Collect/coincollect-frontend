/** @jest-environment jsdom */
import { getAddress } from '@ethersproject/address'
import {
  clearNftPoolPresentationCache,
  createNftPoolPresentationExport,
  loadNftPoolPresentations,
  NFT_POOL_PRESENTATION_URL,
  validateNftPoolPresentationDocument,
} from '../presentationMetadata'

const address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'

it('validates canonical pool identity and sanitizes presentational URLs and bounded fields', () => {
  const result = validateNftPoolPresentationDocument({
    schemaVersion: 1,
    updatedAt: '2026-10-05T00:00:00Z',
    pools: [
      {
        id: `137:${address}`,
        name: '  Partner pool  ',
        banner: 'javascript:alert(1)',
        avatar: 'https://example.org/pool.png',
        projectUrl: 'https://example.org',
        getNftUrl: '//evil.example/nft',
        description: '  Presentation only  ',
        category: 'PARTNER',
      },
    ],
  })

  expect(result.pools[0]).toMatchObject({
    id: `137:${address}`,
    name: 'Partner pool',
    avatar: 'https://example.org/pool.png',
    projectUrl: 'https://example.org/',
    description: 'Presentation only',
    category: 'PARTNER',
  })
  expect(result.pools[0].banner).toBeUndefined()
  expect(result.pools[0].getNftUrl).toBeUndefined()
})

it('rejects unsupported schema, invalid canonical IDs, duplicate records, and oversized record counts', () => {
  expect(() => validateNftPoolPresentationDocument({ schemaVersion: 2, pools: [] })).toThrow('unsupported schema')
  expect(() =>
    validateNftPoolPresentationDocument({
      schemaVersion: 1,
      updatedAt: '2026-10-05T00:00:00Z',
      pools: [{ id: '137:0x1234' }],
    }),
  ).toThrow('invalid canonical ID')
  expect(() =>
    validateNftPoolPresentationDocument({
      schemaVersion: 1,
      updatedAt: '2026-10-05T00:00:00Z',
      pools: [{ id: `137:${address}` }, { id: `137:${getAddress(address)}` }],
    }),
  ).toThrow('duplicate ID')
  expect(() =>
    validateNftPoolPresentationDocument({
      schemaVersion: 1,
      updatedAt: '2026-10-05T00:00:00Z',
      pools: new Array(2_001).fill({ id: `137:${address}` }),
    }),
  ).toThrow('unsupported schema or size')
})

it('exports exactly one canonical presentation-only record in the shared repository schema', () => {
  const document = createNftPoolPresentationExport(
    address,
    {
      name: 'Example Pool',
      banner: 'https://metadata.coincollect.org/assets/pools/example/banner.webp',
      avatar: 'https://metadata.coincollect.org/assets/pools/example/avatar.webp',
      projectUrl: 'https://example.org',
      getNftUrl: 'https://example.org/mint',
      description: 'A community pool.',
      isCommunity: false,
      // Protocol data is never part of the export contract.
      ...({ rewardToken: '0x9999999999999999999999999999999999999999', stakingWeight: '999' } as any),
    },
    '2026-10-05T00:00:00Z',
  )

  expect(document).toEqual({
    schemaVersion: 1,
    updatedAt: '2026-10-05T00:00:00Z',
    pools: [
      {
        id: `137:${getAddress(address).toLowerCase()}`,
        name: 'Example Pool',
        banner: 'https://metadata.coincollect.org/assets/pools/example/banner.webp',
        avatar: 'https://metadata.coincollect.org/assets/pools/example/avatar.webp',
        projectUrl: 'https://example.org/',
        getNftUrl: 'https://example.org/mint',
        description: 'A community pool.',
        category: 'PARTNER',
      },
    ],
  })
  expect(JSON.stringify(document)).not.toContain('rewardToken')
  expect(JSON.stringify(document)).not.toContain('stakingWeight')
})

it.each([
  ['DNS failure', jest.fn().mockRejectedValue(new Error('Failed to fetch'))],
  ['HTTP failure', jest.fn().mockResolvedValue({ ok: false, status: 404, headers: { get: () => null } })],
  [
    'malformed JSON',
    jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => '{not-json',
    }),
  ],
])('returns no document after a metadata %s so callers can use fallback presentation', async (_label, fetchMock) => {
  clearNftPoolPresentationCache()
  window.localStorage.clear()
  const originalFetch = global.fetch
  global.fetch = fetchMock as any
  try {
    await expect(loadNftPoolPresentations(true)).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(NFT_POOL_PRESENTATION_URL, expect.objectContaining({ cache: 'no-store' }))
  } finally {
    global.fetch = originalFetch
    clearNftPoolPresentationCache()
  }
})
