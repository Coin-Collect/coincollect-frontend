import { selectPrimaryReward } from '../rewardSelection'
import type { NftPoolDraftReward } from '../types'

const collect: NftPoolDraftReward = {
  address: '0x1111111111111111111111111111111111111111',
  symbol: 'COLLECT',
  name: 'CoinCollect',
  decimals: 18,
}
const pol: NftPoolDraftReward = {
  address: '0x2222222222222222222222222222222222222222',
  symbol: 'POL',
  name: 'Polygon Ecosystem Token',
  decimals: 18,
}

describe('NFT pool primary reward selection', () => {
  it('promotes a selected side reward and keeps the former primary as a side reward', () => {
    expect(selectPrimaryReward(collect, [pol], pol)).toEqual({ primary: pol, side: [collect] })
  })

  it('removes duplicate addresses case-insensitively when promoting', () => {
    expect(selectPrimaryReward(collect, [pol, { ...pol, address: pol.address.toUpperCase() }], pol)).toEqual({
      primary: pol,
      side: [collect],
    })
  })

  it('keeps existing replacement behavior for a token that was not already selected', () => {
    const usdt = { ...pol, address: '0x3333333333333333333333333333333333333333', symbol: 'USDT' }
    expect(selectPrimaryReward(collect, [pol], usdt)).toEqual({ primary: usdt, side: [pol] })
  })
})
