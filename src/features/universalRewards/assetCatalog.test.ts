import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { preferStudioTokens, studioCollection, studioCollections, studioToken, studioTokens } from './assetCatalog'

describe('V3 Studio asset catalog', () => {
  it('provides one Polygon preset and existing artwork per requested collection', () => {
    expect(studioCollections).toHaveLength(22)
    expect(new Set(studioCollections.map(({ address }) => address.toLowerCase())).size).toBe(22)
    expect(studioCollections.every(({ sourceChain }) => sourceChain === '137')).toBe(true)
    expect(studioCollections.slice(0, 5).map(({ power }) => power)).toEqual(['3', '5', '10', '15', '1'])
    expect(studioCollections.slice(5).every(({ power }) => power === '10')).toBe(true)
    expect(
      studioCollections.filter(({ requiresCompatibility }) => requiresCompatibility).map(({ name }) => name),
    ).toEqual(['Aavegotchi'])
    for (const { image } of studioCollections) {
      expect(image && existsSync(join(process.cwd(), 'public', image))).toBe(true)
    }
  })

  it('looks up Polygon collections case-insensitively without aliasing other chains', () => {
    const galxe = studioCollections.find(({ name }) => name === 'Galxe OAT')
    expect(galxe).toBeDefined()
    const address = galxe!.address.toLowerCase()
    expect(studioCollection(BigInt(137), address)).toBe(galxe)
    expect(studioCollection('8453', address)).toBeUndefined()
  })

  it('prioritizes catalog tokens already present in the ledger and preserves other assets', () => {
    expect(studioTokens.map(({ symbol }) => symbol)).toEqual([
      'COLLECT',
      'LOT',
      'BLITZ',
      'AVATAR',
      'HUNT',
      'NITRO',
      'DJ',
      'Z',
    ])
    for (const { address } of studioTokens) {
      expect(studioToken(address.toLowerCase())?.address).toBe(address)
      expect(existsSync(join(process.cwd(), 'public', 'images', 'tokens', `${address}.svg`))).toBe(true)
    }
    const other = { address: '0x0000000000000000000000000000000000000001' }
    const dj = { address: studioTokens[6].address.toLowerCase() }
    const collect = { address: studioTokens[0].address }
    expect(preferStudioTokens([other, dj, collect])).toEqual([collect, dj, other])
    expect(preferStudioTokens([other])).toEqual([other])
  })
})
