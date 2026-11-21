import { isAddress } from '@ethersproject/address'
import { AddressZero } from '@ethersproject/constants'
import { ChainId } from '@coincollect/sdk'
import { mainnetTokens } from 'config/constants/tokens'
import { deserializeToken, serializeToken } from 'state/user/hooks/helpers'
import polygon from './fixtures/polygon-contracts.json'

const polygonTokens: Readonly<Record<string, { symbol: string; decimals: number } | undefined>> = polygon.tokens

const polygonDisplayAliases: Readonly<Record<string, { onChain: string; display: string } | undefined>> = {
  matic: { onChain: 'WPOL', display: 'POL' },
  usdt: { onChain: 'USDT0', display: 'USDT' },
  weth: { onChain: 'WETH', display: 'ETH' },
}

describe('Token configuration', () => {
  it.each(Object.entries(mainnetTokens))('preserves valid token metadata through serialization for %s', (_, token) => {
    expect(isAddress(token.address)).toBe(true)
    expect(token.address).not.toBe(AddressZero)
    expect([ChainId.POLYGON, ChainId.MAINNET]).toContain(token.chainId)
    expect(token.symbol).toMatch(/\S/)
    expect(Number.isInteger(token.decimals)).toBe(true)
    expect(token.decimals).toBeGreaterThanOrEqual(0)
    expect(token.decimals).toBeLessThanOrEqual(255)
    expect(deserializeToken(serializeToken(token))).toEqual(token)
  })

  it.each(Object.entries(mainnetTokens).filter(([, token]) => token.chainId === ChainId.POLYGON))(
    'matches the deployed Polygon metadata and configured display symbol for %s',
    (key, token) => {
      const deployed = polygonTokens[token.address.toLowerCase()]
      if (!deployed) throw new Error(`Missing Polygon token fixture for ${token.address}`)
      const alias = polygonDisplayAliases[key]

      expect(token.decimals).toBe(deployed.decimals)
      expect(token.symbol).toBe(alias?.display ?? deployed.symbol)
      if (alias) expect(alias.onChain).toBe(deployed.symbol)
    },
  )
})
