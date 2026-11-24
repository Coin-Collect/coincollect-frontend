'use strict'

const { readFileSync } = require('node:fs')
const { homedir } = require('node:os')
const path = require('node:path')

const configPath = path.join(homedir(), '.config', 'coincollect', 'test-environment.json')

function readProtectedEnvironment() {
  let contents
  try {
    contents = readFileSync(configPath, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
  const config = JSON.parse(contents)
  const { app, rpc, chainId, checkpoint } = config ?? {}
  const isLoopback = (url) => typeof url === 'string' && /^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(url)
  if (
    !isLoopback(app) || !isLoopback(rpc) || !Number.isSafeInteger(chainId) || chainId <= 0 ||
    !/^0x[\da-f]+$/.test(checkpoint?.number) || !/^0x[\da-f]{64}$/.test(checkpoint?.hash)
  ) {
    throw new Error(`Invalid protected CoinCollect test environment in ${configPath}.`)
  }
  return config
}

function refuseFixtureEnvironment(config = readProtectedEnvironment()) {
  if (config) {
    throw new Error(`This command uses a disposable fork. Use the protected Studio at ${config.app} and npm run fork:status.`)
  }
}

function readStudioDeploymentOverride(env = process.env) {
  if (env.NODE_ENV !== 'development' || env.NEXT_PUBLIC_LOCAL_FORK !== '1') return undefined
  const config = readProtectedEnvironment()
  if (env.NEXT_PUBLIC_LOCAL_FORK_RPC !== config?.rpc || Number(env.NEXT_PUBLIC_LOCAL_FORK_CHAIN_ID) !== config?.chainId)
    return undefined

  const deploymentPath = path.join(path.dirname(configPath), 'studio-deployment.json')
  let deployment
  try {
    deployment = JSON.parse(readFileSync(deploymentPath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return undefined
    throw error
  }
  if (
    deployment?.checkpointHash !== config.checkpoint.hash ||
    !/^0x[\da-f]{40}$/i.test(deployment?.address) ||
    !/^0x[\da-f]{64}$/i.test(deployment?.runtimeHash)
  ) throw new Error(`Invalid protected Studio deployment in ${deploymentPath}.`)

  return {
    NEXT_PUBLIC_V3_LEDGER_ADDRESS: deployment.address,
    NEXT_PUBLIC_V3_LEDGER_CODE_HASH: deployment.runtimeHash,
  }
}

async function printProtectedStatus({ app, rpc, chainId, checkpoint }) {
  const calls = [
    { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] },
    { jsonrpc: '2.0', id: 2, method: 'eth_getBlockByNumber', params: [checkpoint.number, false] },
    { jsonrpc: '2.0', id: 3, method: 'eth_blockNumber', params: [] },
  ]
  const response = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(calls),
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  }).catch(() => {
    throw new Error(`Protected RPC ${rpc} is unreachable. Keep its existing chain state for recovery.`)
  })
  if (!response.ok) throw new Error(`Protected RPC ${rpc} returned HTTP ${response.status}.`)
  const results = new Map((await response.json()).map(({ id, result }) => [id, result]))
  const head = results.get(3)
  if (Number(results.get(1)) !== chainId || results.get(2)?.hash !== checkpoint.hash || !/^0x[\da-f]+$/.test(head)) {
    throw new Error(`Protected RPC ${rpc} does not match the recorded test chain. Stop and check its state.`)
  }
  console.log(`Protected test chain ${chainId}, block ${Number(head)} (checkpoint verified)\nStudio: ${app}/admin/nft-pools/v3\nWallet RPC: ${rpc}`)
}

module.exports = { printProtectedStatus, readProtectedEnvironment, readStudioDeploymentOverride, refuseFixtureEnvironment }
