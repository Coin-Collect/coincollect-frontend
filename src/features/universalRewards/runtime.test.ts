import { getAddress } from 'viem'
import { parseV3DeploymentRegistry, v3DeploymentPath, type V3Deployment } from './runtime'

const hash = ('0x' + 'ab'.repeat(32)) as `0x${string}`
const address = (number: number) => getAddress('0x' + number.toString(16).padStart(40, '0'))
const entry = (id: string, number: number) => ({
  id,
  chainId: 31337,
  address: address(number),
  runtimeHash: hash,
  treasury: { address: address(number + 10), runtimeHash: hash },
})
const current = entry('v3.10', 1)
const older = entry('v3.9', 2)
const defaultDeployment: V3Deployment = { address: current.address, runtimeHash: hash, chainId: 31337 }

test('retains the single-deployment configuration and bare URLs', () => {
  expect(parseV3DeploymentRegistry(undefined, defaultDeployment)).toEqual([defaultDeployment])
  expect(v3DeploymentPath('/nftpools/v3/1', defaultDeployment)).toBe('/nftpools/v3/1')
})

test('scopes the same pool ID across independently verified deployments', () => {
  const [legacy, primary] = parseV3DeploymentRegistry(JSON.stringify([older, current]), defaultDeployment)
  expect([legacy.primary, primary.primary]).toEqual([false, true])
  expect(v3DeploymentPath('/nftpools/v3/1', legacy)).toBe('/nftpools/v3/1?deployment=v3.9')
  expect(v3DeploymentPath('/nftpools/v3/1', primary)).toBe('/nftpools/v3/1?deployment=v3.10')
})

test.each([
  [older],
  [current, { ...older, chainId: 137 }],
  [current, { ...older, id: current.id }],
  [current, { ...older, address: current.address }],
  [current, { ...older, treasury: current.treasury }],
  [{ ...current, runtimeHash: '0x' + '00'.repeat(32) }, older],
].map((entries) => [JSON.stringify(entries)]))('rejects an ambiguous or mismatched registry', (registry) => {
  expect(() => parseV3DeploymentRegistry(registry, defaultDeployment)).toThrow()
})
