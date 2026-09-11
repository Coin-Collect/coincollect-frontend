import { BigNumber } from '@ethersproject/bignumber'
import { buildDeployArguments, validateDeploymentParameters } from '../transactions'
import { parseNewSmartChefAddress } from '../transactions'
import { PoolDeploymentParameters } from '../types'
import { Interface } from '@ethersproject/abi'
import factoryAbi from 'config/abi/smartChefFactoryV2.json'

const valid: PoolDeploymentParameters = {
  stakedToken: '0x56633733fc8BAf9f730AD2b6b9956Ae22c6d4148',
  rewardToken: '0x8c1245BA1714BD7a61A34Cb63b95331Fa3db497C',
  rewardPerBlock: BigNumber.from(3),
  startBlock: 100,
  bonusEndBlock: 200,
  poolLimitPerUser: BigNumber.from(0),
  numberBlocksForUserLimit: 0,
  participantThreshold: BigNumber.from(0),
  admin: '0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258',
}

describe('Pool Manager deployment transaction helpers', () => {
  it('builds the exact nine v2 factory arguments', () => {
    expect(buildDeployArguments(valid)).toHaveLength(9)
    expect(buildDeployArguments(valid)[2]).toEqual(BigNumber.from(3))
    expect(buildDeployArguments(valid)[7]).toEqual(BigNumber.from(0))
  })

  it('rejects invalid schedule and addresses before wallet interaction', () => {
    expect(validateDeploymentParameters({ ...valid, startBlock: 200, bonusEndBlock: 100 })).toEqual(
      expect.arrayContaining(['End block must be after start block.']),
    )
    expect(validateDeploymentParameters({ ...valid, admin: 'not-an-address' })).toEqual(
      expect.arrayContaining(['Pool admin address is invalid.']),
    )
  })

  it('parses the deployed address from the factory receipt event', () => {
    const deployed = '0x00000000000000000000000000000000000000aa'
    const iface = new Interface(factoryAbi)
    const encoded = iface.encodeEventLog(iface.getEvent('NewSmartChefContract'), [deployed])
    const receipt = { logs: [{ topics: encoded.topics, data: encoded.data }] } as any
    expect(parseNewSmartChefAddress(receipt, valid.admin).toLowerCase()).toBe(deployed.toLowerCase())
  })
})
