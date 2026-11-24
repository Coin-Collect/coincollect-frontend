const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { createPublicClient, http, isAddressEqual, keccak256, parseAbi, zeroAddress } = require('viem')
const { printProtectedStatus, readProtectedEnvironment } = require('./local-test-environment.cjs')
const registry = require('./v3-protected-deployments.json')

const ledgerAbi = parseAbi([
  'function poolCount() view returns (uint256)',
  'function treasuryVault() view returns (address)',
  'function supportedAssets() view returns (address[])',
  'function poolState(uint256) view returns ((uint64 start,uint64 end,uint16 threshold,uint16 maxWallets,uint16 maxNftsPerWallet,string metadataURI),uint64,uint16,uint64,uint256)',
  'function collectionRules(uint256) view returns ((uint256 sourceChainId,address collection,uint32 weight)[])',
  'function rewardsOf(uint256) view returns (address[])',
  'function rewardState(uint256,address) view returns ((uint128 cap,uint128 inventory,uint256 committed))',
  'function rewardSettlement(uint256,address) view returns (uint256,uint128)',
  'function fundingState(uint256) view returns ((address asset,uint128 budget,uint32 interval,bool paused,uint128 deposited,uint128 spent,uint128 recovered))',
  'function positionKeys(uint256,uint256,uint256) view returns (bytes32[],uint256)',
  'function positionState(uint256,bytes32) view returns ((uint256 sourceChainId,address collection,uint32 weight,uint256 tokenId,address seatOwner,uint64 seatExpiry))',
  'function claimable(uint256,bytes32,address) view returns (uint256)',
])
const vaultAbi = parseAbi([
  'function ledger() view returns (address)',
  'function balance(address) view returns ((uint256 available,uint256 deposited,uint256 allocated,uint256 spent,uint256 fundingReturned,uint256 rewardsReturned,uint256 withdrawn))',
  'function swapTotals(address) view returns (uint256,uint256)',
])
const tokenAbi = parseAbi(['function balanceOf(address) view returns (uint256)'])

async function inspect(client, deployment, blockNumber) {
  const { address, treasury } = deployment
  const read = (functionName, args = []) => client.readContract({ address, functionName, args, blockNumber, abi: ledgerAbi })
  const vault = (functionName, args = []) =>
    client.readContract({ address: treasury.address, functionName, args, blockNumber, abi: vaultAbi })
  const [ledgerCode, vaultCode, vaultAddress, vaultLedger, count, supported] = await Promise.all([
    client.getCode({ address, blockNumber }), client.getCode({ address: treasury.address, blockNumber }),
    read('treasuryVault'), vault('ledger'), read('poolCount'), read('supportedAssets'),
  ])
  assert.equal(keccak256(ledgerCode), deployment.runtimeHash)
  assert.equal(keccak256(vaultCode), treasury.runtimeHash)
  assert.ok(isAddressEqual(vaultAddress, treasury.address) && isAddressEqual(vaultLedger, address))
  const reserves = new Map()
  const reserve = (token, amount) => reserves.set(token.toLowerCase(), (reserves.get(token.toLowerCase()) ?? 0n) + amount)
  const pools = []
  for (let pool = 1n; pool <= count; pool++) {
    const [state, rules, rewards, funding] = await Promise.all([
      read('poolState', [pool]), read('collectionRules', [pool]), read('rewardsOf', [pool]), read('fundingState', [pool]),
    ])
    if (!isAddressEqual(funding.asset, zeroAddress)) reserve(funding.asset, funding.deposited - funding.spent - funding.recovered)
    const rewardStates = await Promise.all(rewards.map(async (token) => {
      const [balance, settlement] = await Promise.all([read('rewardState', [pool, token]), read('rewardSettlement', [pool, token])])
      reserve(token, balance.inventory)
      assert.ok(settlement[0] <= balance.inventory * 10n ** 18n)
      return [token, balance, settlement]
    }))
    const positions = []
    let total
    do {
      const [keys, nextTotal] = await read('positionKeys', [pool, BigInt(positions.length), 32n])
      total = nextTotal
      assert.ok(keys.length > 0 || total === BigInt(positions.length))
      positions.push(...await Promise.all(keys.map(async (key) => [
        key, await read('positionState', [pool, key]), await Promise.all(rewards.map(token => read('claimable', [pool, key, token]))),
      ])))
    } while (BigInt(positions.length) < total)
    pools.push({ state, rules, funding, rewardStates, positions })
  }
  const assets = await Promise.all(supported.map(async (token) => {
    const tokens = (owner) => client.readContract({ address: token, abi: tokenAbi, functionName: 'balanceOf', args: [owner], blockNumber })
    const [balance, [swappedIn, swappedOut], cash, escrow] = await Promise.all([
      vault('balance', [token]), vault('swapTotals', [token]), tokens(treasury.address), tokens(address),
    ])
    assert.equal(balance.available, balance.deposited + swappedIn + balance.fundingReturned + balance.rewardsReturned
      - balance.allocated - balance.spent - balance.fundingReturned - balance.withdrawn - swappedOut)
    assert.ok(cash >= balance.available, 'Treasury funds must cover recorded available assets')
    assert.ok(escrow >= (reserves.get(token.toLowerCase()) ?? 0n), 'Ledger tokens must cover reward and funding reserves')
    return { token, balance, swappedIn, swappedOut, cash, escrow }
  }))
  const digest = createHash('sha256').update(JSON.stringify({ pools, assets }, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value)).digest('hex')
  return { id: deployment.id, ledger: address, treasury: treasury.address, runtimeBytes: (ledgerCode.length - 2) / 2,
    pools: pools.length, positions: pools.reduce((total, pool) => total + pool.positions.length, 0), assets: assets.length, digest }
}

async function main() {
  const environment = readProtectedEnvironment()
  assert.equal(environment?.checkpoint.hash, registry.checkpointHash)
  await printProtectedStatus(environment)
  const client = createPublicClient({ transport: http(environment.rpc, { batch: true }) })
  const reference = await client.getBlock(process.argv[2] ? { blockNumber: BigInt(process.argv[2]) } : {})
  const deployments = await Promise.all(registry.deployments.map(deployment => inspect(client, deployment, reference.number)))
  console.log(JSON.stringify({ chainId: environment.chainId, block: Number(reference.number), hash: reference.hash, deployments }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
