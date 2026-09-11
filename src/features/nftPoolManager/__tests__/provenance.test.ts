import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import factoryAbi from 'config/abi/nftSmartChefFactory.json'
import { decodeDeployPoolData } from '../provenance'

describe('NFT factory deployment provenance', () => {
  it('decodes the original deployPool inputs including initial capacity', () => {
    const iface = new Interface(factoryAbi as any)
    const data = iface.encodeFunctionData('deployPool', [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      ['0x3333333333333333333333333333333333333333'],
      [BigNumber.from(6670)],
      BigNumber.from(123),
      BigNumber.from(100),
      BigNumber.from(200),
      BigNumber.from(1),
      BigNumber.from(0),
      { poolCapacity: BigNumber.from(500), participantThreshold: BigNumber.from(7) },
      '0x4444444444444444444444444444444444444444',
    ])
    const decoded = decodeDeployPoolData(data)
    expect(decoded.stakedTokenAddress).toBe('0x1111111111111111111111111111111111111111')
    expect(decoded.initialPoolCapacity.toString()).toBe('500')
    expect(decoded.participantThreshold.toString()).toBe('7')
    expect(decoded.sideRewardPercentages[0].toString()).toBe('6670')
    expect(decoded.admin).toBe('0x4444444444444444444444444444444444444444')
  })
})
