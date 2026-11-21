import { isAddress } from '@ethersproject/address'
import { parseUnits } from '@ethersproject/units'
import { ChainId } from '@coincollect/sdk'
import pools from 'config/constants/pools'
import poolsDeployedBlockNumber from 'config/constants/poolsDeployedBlockNumber'
import { mainnetTokens } from 'config/constants/tokens'
import polygon from './fixtures/polygon-contracts.json'

jest.mock('config/constants/networks', () => ({ CHAIN_ID: '137' }))

const stakingPools: Readonly<
  Record<string, { stakedToken: string; rewardToken: string; rewardPerBlock: string } | undefined>
> = polygon.pools

describe('Polygon pool configuration', () => {
  it('assigns each pool a unique ID and contract', () => {
    expect(pools.length).toBeGreaterThan(1)
    expect(new Set(pools.map(({ sousId }) => sousId)).size).toBe(pools.length)
    expect(new Set(pools.map(({ contractAddress }) => contractAddress[ChainId.POLYGON]?.toLowerCase())).size).toBe(
      pools.length,
    )
  })

  it('preserves pool zero as the legacy COLLECT staking entry', () => {
    const pool = pools.find(({ sousId }) => sousId === 0)
    expect(pool).toMatchObject({
      contractAddress: { [ChainId.POLYGON]: '0x46A928F2386b8c38cdde028a32c5b7aa19F40445' },
      stakingToken: { chainId: ChainId.POLYGON, address: mainnetTokens.collect.address },
      earningToken: { chainId: ChainId.POLYGON, address: mainnetTokens.collect.address },
    })
  })

  it.each(pools.filter(({ sousId }) => sousId !== 0).map((pool) => [pool.sousId, pool] as const))(
    'matches deployed staking, rewards and emissions for pool %d',
    (_, pool) => {
      const address = pool.contractAddress[ChainId.POLYGON]
      if (!address || !isAddress(address)) throw new Error(`Invalid contract address for pool ${pool.sousId}`)
      const deployed = stakingPools[address.toLowerCase()]
      if (!deployed) throw new Error(`Missing Polygon pool fixture for ${address}`)

      expect(pool.stakingToken.chainId).toBe(ChainId.POLYGON)
      expect(pool.earningToken.chainId).toBe(ChainId.POLYGON)
      expect(pool.stakingToken.address.toLowerCase()).toBe(deployed.stakedToken)
      expect(pool.earningToken.address.toLowerCase()).toBe(deployed.rewardToken)
      expect(parseUnits(pool.tokenPerBlock, pool.earningToken.decimals).toString()).toBe(deployed.rewardPerBlock)
      const deployedBlock = pool.deployedBlockNumber ?? poolsDeployedBlockNumber[address]
      expect(deployedBlock).toBeGreaterThan(0)
      expect(deployedBlock).toBeLessThanOrEqual(polygon.blockNumber)
    },
  )
})
