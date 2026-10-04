import type { Token } from '@coincollect/sdk'
import type { TokenAddressMap } from '../hooks'
import { getTokensForChain } from '../tokenMap'

describe('getTokensForChain', () => {
  it('returns an empty map when the connected chain has no token list', () => {
    expect(getTokensForChain({} as TokenAddressMap, 31337)).toEqual({})
  })

  it('returns tokens for a chain that has a list', () => {
    const token = { address: '0x1234' } as Token
    const tokenMap = {
      137: {
        '0x1234': { token },
      },
    } as unknown as TokenAddressMap

    expect(getTokensForChain(tokenMap, 137)).toEqual({ '0x1234': token })
  })
})
