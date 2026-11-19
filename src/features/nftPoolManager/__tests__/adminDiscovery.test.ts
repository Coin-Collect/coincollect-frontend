import { Interface } from '@ethersproject/abi'
import { Contract } from '@ethersproject/contracts'
import type { Provider } from '@ethersproject/providers'
import nftStakeAbi from 'config/abi/smartNftStake.json'
import addresses from 'config/constants/contracts'
import { clearNftPoolRegistryCache, getNftPoolRegistry, readNftPoolAdminDetail } from '../discovery'

jest.mock('config/constants/nftFarms', () => ({ __esModule: true, default: [] }))
jest.mock('@ethersproject/contracts', () => ({
  Contract: jest.fn().mockImplementation(() => ({ interface: { getEventTopic: () => 'factory-topic' } })),
}))

const abi = new Interface(nftStakeAbi)
const block = 97_000_000
const deploymentBlock = addresses.nftSmartChefFactoryDeploymentBlock[137]
const factory = addresses.nftSmartChefFactory[137]
const multicallAddress = addresses.multiCallPolygon[137]
const account = '0x1111111111111111111111111111111111111111'
const collection = '0x2222222222222222222222222222222222222222'
const reward = '0x3333333333333333333333333333333333333333'
const contracts = Contract as unknown as jest.Mock
const originalFetch = globalThis.fetch
const values: Record<string, number | string> = {
  owner: account,
  SMART_CHEF_FACTORY: factory,
  stakedToken: collection,
  rewardToken: reward,
  rewardPerBlock: 80,
  startBlock: block - 100,
  bonusEndBlock: block - 10,
  participantThreshold: 20,
}

function makeProvider(poolAddresses: string[]) {
  return {
    getNetwork: jest.fn().mockResolvedValue({ chainId: 137 }),
    getBlockNumber: jest.fn().mockResolvedValue(block),
    getBlock: jest.fn(async (number: number) => ({ timestamp: number * 2 })),
    getCode: jest.fn().mockResolvedValue('0x60006000'),
    getLogs: jest.fn(async ({ fromBlock }: { fromBlock: number }) =>
      fromBlock === deploymentBlock
        ? poolAddresses.map((address) => ({
            address: factory,
            topics: ['factory-topic', '0x' + address.slice(2).padStart(64, '0')],
            blockNumber: deploymentBlock,
            transactionHash: '0x' + '1'.repeat(64),
          }))
        : [],
    ),
  }
}

beforeEach(() => {
  clearNftPoolRegistryCache()
  contracts.mockReset()
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) })
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

it('batches admin schedule and identity reads without hydrating every discovered pool', async () => {
  const poolAddresses = Array.from({ length: 57 }, (_, i) => `0x${(i + 1).toString(16).padStart(40, '0')}`)
  const provider = makeProvider(poolAddresses)
  const directPoolCall = jest.fn().mockRejectedValue(new Error('Admin list should use multicall'))
  const tryAggregate = jest.fn(async (_required, calls: Array<{ target: string; callData: string }>) =>
    calls.map(({ callData }) => {
      const { name } = abi.getFunction(callData.slice(0, 10))
      return [true, abi.encodeFunctionResult(name, [values[name]])]
    }),
  )
  contracts.mockImplementation((target: string) => ({
    callStatic:
      target === multicallAddress
        ? { tryAggregate }
        : new Proxy(
            {},
            { get: (_, name) => (name === 'owner' && target === factory ? () => account : directPoolCall) },
          ),
    owner: () => account,
  }))

  const registry = await getNftPoolRegistry(provider as unknown as Provider, false, 'admin-summary')
  expect(registry.pools).toHaveLength(57)
  expect(registry.pools.every((pool) => pool.status === 'FINISHED' && pool.verified && !pool.publicReadiness)).toBe(
    true,
  )
  expect(tryAggregate).toHaveBeenCalledTimes(5)
  expect(tryAggregate).toHaveBeenCalledWith(false, expect.any(Array), { blockTag: block })
  expect(directPoolCall).not.toHaveBeenCalled()
  expect(await getNftPoolRegistry(provider as unknown as Provider, false, 'admin-summary')).toBe(registry)
  expect(tryAggregate).toHaveBeenCalledTimes(5)
})

it('reads one direct admin detail without scanning the factory and blocks cloning when configuration reads fail', async () => {
  const poolAddress = '0x4444444444444444444444444444444444444444'
  const provider = makeProvider([])
  contracts.mockImplementation(() => ({
    callStatic: new Proxy({}, { get: (_, name) => async () => values[String(name)] }),
  }))

  const result = await readNftPoolAdminDetail(provider as unknown as Provider, poolAddress)
  expect(result.pool).toMatchObject({ address: poolAddress, status: 'FINISHED', cloneSupport: 'UNAVAILABLE' })
  expect(result.pool?.warnings.some((warning) => warning.includes('settings could not be read'))).toBe(true)
  expect(provider.getLogs).not.toHaveBeenCalled()
  expect(globalThis.fetch).not.toHaveBeenCalled()
})
