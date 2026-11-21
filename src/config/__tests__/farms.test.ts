import { isAddress } from '@ethersproject/address'
import { ChainId } from '@coincollect/sdk'
import farms from 'config/constants/farms'
import polygon from './fixtures/polygon-contracts.json'

jest.mock('config/constants/networks', () => ({ CHAIN_ID: '137' }))

const polygonDexFactory = '0x2bc17223a99b6e2857796a5f64a1ed91067b5657'
const pairs: Readonly<Record<string, { token0: string; token1: string; factory: string } | undefined>> = polygon.farms

describe('Polygon farm configuration', () => {
  it('assigns each configured farm a unique PID and pair contract', () => {
    expect(farms.length).toBeGreaterThan(0)
    expect(new Set(farms.map(({ pid }) => pid)).size).toBe(farms.length)
    expect(new Set(farms.map(({ lpAddresses }) => lpAddresses[ChainId.POLYGON]?.toLowerCase())).size).toBe(farms.length)
  })

  it.each(farms.map((farm) => [farm.pid, farm] as const))('matches the deployed LP pair and factory for farm %d', (_, farm) => {
    const address = farm.lpAddresses[ChainId.POLYGON]
    if (!address || !isAddress(address)) throw new Error(`Invalid LP address for farm ${farm.pid}`)
    const pair = pairs[address.toLowerCase()]
    if (!pair) throw new Error(`Missing Polygon LP fixture for ${address}`)

    expect(farm.token.chainId).toBe(ChainId.POLYGON)
    expect(farm.quoteToken.chainId).toBe(ChainId.POLYGON)
    expect([pair.token0, pair.token1].sort()).toEqual(
      [farm.token.address.toLowerCase(), farm.quoteToken.address.toLowerCase()].sort(),
    )
    expect(pair.factory).toBe(polygonDexFactory)
  })
})
