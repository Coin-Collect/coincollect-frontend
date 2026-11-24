import { decodeV3Presentation, encodeV3Presentation, safeArtwork } from './metadata'
import { parseV3Amount } from './studio'

it('round trips Unicode pool metadata with a safe existing artwork path', () => {
  const value = {
    name: 'CoinCollect Ödülleri',
    description: 'Ödül, NFT sahibine ödenir.',
    artwork: '/images/rewards/pool.webp',
    poolType: 'partner',
  } as const
  expect(decodeV3Presentation(encodeV3Presentation(value), BigInt(1))).toEqual(value)
  expect(decodeV3Presentation(encodeV3Presentation({ ...value, poolType: 'community' }), BigInt(1)).poolType).toBe(
    'community',
  )
})

it('uses deterministic presentation when metadata is unusable, and blocks executable image protocols', () => {
  expect(safeArtwork('javascript:alert(1)')).toBeUndefined()
  expect(safeArtwork('//another.example/image.svg')).toBeUndefined()
  expect(safeArtwork('https://name:password@example.org/image.jpg')).toBeUndefined()
  expect(decodeV3Presentation('ipfs://not-a-v3-presentation', BigInt(42))).toEqual({
    name: 'Universal Rewards #42',
    description: '',
  })
  expect(() => encodeV3Presentation({ name: 'x', description: '🖼️'.repeat(95) })).toThrow()
})

it('parses exact funding and does not round user-supplied decimals or scientific notation', () => {
  expect(parseV3Amount('12.000001', 6, 'budget')).toBe(BigInt(12_000_001))
  for (const input of ['0', '-1', '1e3', '1.0000001', '10000000000000000000000000000000000000']) {
    expect(() => parseV3Amount(input, 6, 'budget')).toThrow()
  }
})
