import { BigNumber } from '@ethersproject/bignumber'
import { Interface } from '@ethersproject/abi'
import nftFactoryAbi from 'config/abi/nftSmartChefFactory.json'
import { buildNftDeployArguments, parseNftPoolAddress } from '../transactions'
import { NftPoolDeploymentPlan } from '../../types'
import { NftLaunchSchedule } from '../types'

const plan = {
  factoryParameters: {
    stakedTokenAddress: '0x56633733fc8BAf9f730AD2b6b9956Ae22c6d4148',
    rewardTokenAddress: '0x8c1245BA1714BD7a61A34Cb63b95331Fa3db497C',
    sideRewardTokens: ['0x1111111111111111111111111111111111111111'],
    sideRewardPercentages: ['12'],
    rewardPerBlock: '3000000000000000000',
    poolLimitPerUser: '0',
    numberBlocksForUserLimit: '0',
    poolCapacity: '500',
    participantThreshold: '3',
    intendedAdmin: '0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258',
  },
} as NftPoolDeploymentPlan
const schedule: NftLaunchSchedule = {
  planningEstimateBlocks: 1,
  finalDurationBlocks: 2,
  setupBufferBlocks: 3,
  bufferSeconds: 10,
  measuredSecondsPerBlock: 2,
  currentBlockAtPreparation: 4,
  startBlock: 7,
  endBlock: 9,
  preparedAt: 1,
}

describe('NFT launch transaction preparation', () => {
  it('builds the exact eleven factory arguments, including ConfigExtra and admin', () => {
    const args = buildNftDeployArguments(plan, schedule)
    expect(args).toHaveLength(11)
    expect(args[0]).toBe(plan.factoryParameters.stakedTokenAddress)
    expect(args[2]).toEqual([plan.factoryParameters.sideRewardTokens[0]])
    expect(args[3]).toEqual([BigNumber.from(12)])
    expect(args[9]).toEqual({ poolCapacity: BigNumber.from(500), participantThreshold: BigNumber.from(3) })
    expect(args[10]).toBe(plan.factoryParameters.intendedAdmin)
    expect(args).not.toContain('startBlock')
  })

  it('requires the factory event as the deployment address source', () => {
    const factory = '0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258'
    const deployed = '0x00000000000000000000000000000000000000aa'
    const iface = new Interface(nftFactoryAbi)
    const encoded = iface.encodeEventLog(iface.getEvent('NewSmartChefContract'), [deployed])
    expect(
      parseNftPoolAddress(
        {
          to: factory,
          logs: [{ address: factory, topics: encoded.topics, data: encoded.data }],
        } as any,
        factory,
      ).toLowerCase(),
    ).toBe(deployed)
  })

  it('rejects a matching event emitted by another contract', () => {
    const factory = '0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258'
    const deployed = '0x00000000000000000000000000000000000000aa'
    const iface = new Interface(nftFactoryAbi)
    const encoded = iface.encodeEventLog(iface.getEvent('NewSmartChefContract'), [deployed])
    expect(() =>
      parseNftPoolAddress(
        {
          to: factory,
          logs: [{ address: '0x00000000000000000000000000000000000000cc', topics: encoded.topics, data: encoded.data }],
        } as any,
        factory,
      ),
    ).toThrow('did not contain NewSmartChefContract')
  })

  it('ignores unrelated logs while accepting the single expected factory event', () => {
    const factory = '0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258'
    const deployed = '0x00000000000000000000000000000000000000aa'
    const iface = new Interface(nftFactoryAbi)
    const encoded = iface.encodeEventLog(iface.getEvent('NewSmartChefContract'), [deployed])
    expect(
      parseNftPoolAddress(
        {
          to: factory,
          logs: [
            { address: '0x00000000000000000000000000000000000000cc', topics: ['0x1234'], data: '0x' },
            { address: factory, topics: encoded.topics, data: encoded.data },
          ],
        } as any,
        factory,
      ).toLowerCase(),
    ).toBe(deployed)
  })
})
