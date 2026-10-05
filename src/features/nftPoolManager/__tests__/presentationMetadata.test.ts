import { getAddress } from '@ethersproject/address'
import { validateNftPoolPresentationDocument } from '../presentationMetadata'

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
