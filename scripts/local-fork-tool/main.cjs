#!/usr/bin/env node
'use strict'

const { spawn } = require('child_process')
const { createConnection } = require('net')
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const { Contract, ContractFactory, providers, utils } = require('ethers')

const ROOT = path.resolve(__dirname, '../..')
const TOOL_DIR = __dirname
const STATE_DIR = path.join(ROOT, '.coincollect-fork')
const STATE_FILE = path.join(STATE_DIR, 'state.json')
const DEFAULT_RPC = 'http://127.0.0.1:18545'
const RPC_URL = process.env.COINCOLLECT_FORK_RPC || DEFAULT_RPC
const CHAIN_ID = 31337
const TEST_WALLET = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const DEPLOYER_WALLET = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const FACTORY = '0xa7983F8B45860626398b391E9Bb71416A26349D4'
const COLLECT = '0x56633733fc8BAf9f730AD2b6b9956Ae22c6d4148'
const USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
const WPOL = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
const KNOWN_COLLECT_HOLDER = '0x46A928F2386b8c38cdde028a32c5b7aa19F40445'
const KNOWN_USDT_HOLDERS = ['0xf977814e90da44bfa03b6295a0616a897441acec']
const FORK_SOURCES = ['https://polygon.drpc.org', 'https://polygon-bor-rpc.publicnode.com']
const FACTORY_ABI = ['function owner() view returns (address)', 'function transferOwnership(address newOwner)']
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address,uint256) returns (bool)',
  'function deposit() payable',
]
const LOCAL_REWARD_ABI = [...ERC20_ABI, 'function mint(address,uint256)']
const NFT_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function ownerOf(uint256) view returns (address)',
  'function mint(address,uint256)',
  'function tokensOfOwnerBySize(address,uint256,uint256) view returns (uint256[],uint256)',
]

function fail(message) {
  throw new Error(message)
}

function validateLoopbackRpc(value) {
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    fail('Fork write target is not a valid URL.')
  }
  if (
    parsed.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    fail('Refusing fork writes: RPC must be a loopback HTTP URL (127.0.0.1, localhost or ::1).')
  }
  return parsed.toString().replace(/\/$/, '')
}

function validateUpstream(value) {
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    fail('Fork source URL is invalid. Set COINCOLLECT_FORK_UPSTREAM to a read-only HTTPS Polygon RPC.')
  }
  if (parsed.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) {
    fail('Fork source must be a remote HTTPS Polygon RPC. Fork writes never use this endpoint.')
  }
  return parsed.toString()
}

async function localRpc(method, params = []) {
  let response
  try {
    response = await fetch(validateLoopbackRpc(RPC_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      // The first storage read after an Anvil fork reset can hydrate from the
      // upstream archive RPC. Give that local-only request enough time to settle.
      signal: AbortSignal.timeout(45_000),
    })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      fail(`Local fork RPC ${method} timed out. The fork remains local; retry the command after the RPC recovers.`)
    }
    throw error
  }
  if (!response.ok) fail(`Local fork RPC returned HTTP ${response.status}.`)
  const payload = await response.json()
  if (payload.error) fail(payload.error.message || `${method} failed.`)
  return payload.result
}

async function assertAnvil() {
  validateLoopbackRpc(RPC_URL)
  const chainId = await localRpc('eth_chainId')
  if (Number.parseInt(chainId, 16) !== CHAIN_ID) fail(`Expected local fork chain ${CHAIN_ID}; received ${chainId}.`)
  await localRpc('anvil_nodeInfo')
}

function emptyState() {
  return {
    schemaVersion: 1,
    chainId: CHAIN_ID,
    rpcUrl: validateLoopbackRpc(RPC_URL),
    sessionId: randomUUID(),
    forkBlock: null,
    assets: {},
    seededAt: null,
  }
}

function readState() {
  if (!existsSync(STATE_FILE)) return null
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'))
  } catch {
    fail('Local fork state file is unreadable. Use fork:reset after checking the Anvil process.')
  }
}

function writeState(state) {
  mkdirSync(STATE_DIR, { recursive: true })
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
}

function forkSourceCandidates() {
  return process.env.COINCOLLECT_FORK_UPSTREAM
    ? [validateUpstream(process.env.COINCOLLECT_FORK_UPSTREAM)]
    : FORK_SOURCES
}

async function readPolygonTip() {
  let lastError
  for (const candidate of forkSourceCandidates()) {
    try {
      const endpoint = validateUpstream(candidate)
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
        signal: AbortSignal.timeout(15_000),
      })
      const chain = await response.json()
      if (!response.ok || chain.error || Number.parseInt(chain.result, 16) !== 137)
        fail('Fork source did not identify as Polygon mainnet (chain 137).')
      const blockResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'eth_blockNumber', params: [] }),
        signal: AbortSignal.timeout(15_000),
      })
      const block = await blockResponse.json()
      if (!blockResponse.ok || block.error || !block.result) fail('Polygon fork source did not return a block number.')
      const blockNumber = Number.parseInt(block.result, 16)
      const blockRead = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'eth_getBlockByNumber', params: [block.result, false] }),
        signal: AbortSignal.timeout(15_000),
      })
      const blockPayload = await blockRead.json()
      if (!blockRead.ok || blockPayload.error || !blockPayload.result?.hash)
        fail('Polygon fork source cannot read the selected historical block.')
      const factoryRead = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 4,
          method: 'eth_getCode',
          params: [FACTORY, block.result],
        }),
        signal: AbortSignal.timeout(15_000),
      })
      const factoryPayload = await factoryRead.json()
      if (!factoryRead.ok || factoryPayload.error || !factoryPayload.result || factoryPayload.result === '0x')
        fail('Polygon fork source cannot read the configured NFT SmartChef Factory at that block.')
      return { blockNumber, endpoint }
    } catch (error) {
      lastError = error
    }
  }
  fail(`Could not read Polygon mainnet forking block: ${lastError?.message || 'RPC unavailable'}`)
}

async function isPortFree(url) {
  const parsed = new URL(url)
  const host = parsed.hostname.replace(/^\[|\]$/g, '')
  const port = Number(parsed.port || 80)
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port })
    socket.setTimeout(800)
    socket.once('connect', () => {
      socket.destroy()
      reject(
        new Error(
          `Port ${port} is already occupied. Nothing was stopped. Choose another terminal/process or free that port yourself.`,
        ),
      )
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(true))
  })
}

async function waitForFork(child) {
  const started = Date.now()
  let lastError
  while (Date.now() - started < 180_000) {
    if (child.exitCode !== null) fail(`Anvil exited with code ${child.exitCode}.`)
    try {
      await assertAnvil()
      return
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  child.kill('SIGTERM')
  fail(`Anvil did not become ready: ${lastError?.message || 'timeout'}`)
}

async function startFork() {
  const localRpcUrl = validateLoopbackRpc(RPC_URL)
  const rpcParsed = new URL(localRpcUrl)
  if (rpcParsed.hostname !== '127.0.0.1') fail('fork:start binds only to 127.0.0.1; use the default RPC URL.')
  await isPortFree(localRpcUrl)
  const { blockNumber, endpoint } = await readPolygonTip()
  const state = { ...emptyState(), forkBlock: blockNumber }
  writeState(state)

  const anvilBin = path.join(TOOL_DIR, 'node_modules', '.bin', 'anvil')
  if (!existsSync(anvilBin)) fail('Anvil is not installed. Run npm run fork:install first.')
  const child = spawn(
    anvilBin,
    [
      '--host',
      '127.0.0.1',
      '--port',
      String(rpcParsed.port || 18545),
      '--chain-id',
      String(CHAIN_ID),
      '--accounts',
      '10',
      '--balance',
      '10000',
      '--fork-url',
      endpoint,
      '--fork-block-number',
      String(blockNumber),
      '--retries',
      '3',
      '--quiet',
    ],
    {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, RUST_LOG: process.env.RUST_LOG || 'warn' },
    },
  )

  child.once('error', (error) => console.error(`Anvil could not start: ${error.message}`))
  await waitForFork(child)
  console.log(`\nLocal Polygon fork ready at ${localRpcUrl} (chain ${CHAIN_ID}), forked from block ${blockNumber}.`)
  console.log('This terminal owns the local Anvil process. Press Ctrl+C to stop it; no remote-chain writes are sent.')
  await new Promise((resolve) => {
    child.once('exit', resolve)
    const forwardSignal = (signal) => child.kill(signal)
    process.once('SIGINT', forwardSignal)
    process.once('SIGTERM', forwardSignal)
  })
}

function compileAssets() {
  const solc = require(path.join(TOOL_DIR, 'node_modules', 'solc'))
  const fixturePath = path.join(ROOT, 'src/features/nftPoolManager/launch/__tests__/fixtures/LaunchAssets.sol')
  const source = readFileSync(fixturePath, 'utf8')
  const output = JSON.parse(
    solc.compile(
      JSON.stringify({
        language: 'Solidity',
        sources: { 'LaunchAssets.sol': { content: source } },
        settings: { evmVersion: 'paris', outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } },
      }),
    ),
  )
  const errors = (output.errors || []).filter((item) => item.severity === 'error')
  if (errors.length) fail(errors.map((item) => item.formattedMessage).join('\n'))
  return output.contracts['LaunchAssets.sol']
}

async function waitTx(transaction, label) {
  const receipt = await transaction.wait(1)
  if (!receipt || receipt.status !== 1) fail(`${label} transaction did not confirm successfully.`)
  return receipt
}

async function deployedFixtureContract(state, artifacts, name, args, signer) {
  const key = name === 'ForkCollect' ? 'forkCollect' : name === 'ForkUSDT' ? 'forkUsdt' : 'nft'
  const knownAddress = state.assets[key]
  if (knownAddress && (await signer.provider.getCode(knownAddress)) !== '0x') {
    return new Contract(knownAddress, artifacts[name].abi, signer)
  }
  const artifact = artifacts[name]
  const factory = new ContractFactory(artifact.abi, artifact.evm.bytecode.object, signer)
  const contract = await factory.deploy(...args)
  await contract.deployed()
  state.assets[key] = contract.address
  writeState(state)
  return contract
}

async function transferFromForkHolder(holderAddress, tokenAddress, decimals, amount, label, provider) {
  const holder = utils.getAddress(holderAddress)
  let impersonated = false
  try {
    const tokenRead = new Contract(tokenAddress, ERC20_ABI, provider)
    const available = await tokenRead.balanceOf(holder)
    const target = utils.parseUnits(String(amount), decimals)
    if (available.lt(target)) return false
    await localRpc('anvil_setBalance', [holder, utils.parseEther('25').toHexString()])
    await localRpc('anvil_impersonateAccount', [holder])
    impersonated = true
    const token = tokenRead.connect(provider.getSigner(holder))
    await waitTx(await token.transfer(TEST_WALLET, target), `Fork-only ${label} transfer`)
    console.log(`  ${label}: copied ${amount} from a fork-impersonated Polygon holder (local state only).`)
    return true
  } catch {
    return false
  } finally {
    if (impersonated) {
      try {
        await localRpc('anvil_stopImpersonatingAccount', [holder])
      } catch {}
    }
  }
}

async function ensureFactoryOwner(provider, state) {
  const factory = new Contract(FACTORY, FACTORY_ABI, provider)
  const owner = await factory.owner()
  if (owner.toLowerCase() === TEST_WALLET.toLowerCase()) return owner
  const ownerCode = await provider.getCode(owner)
  if (ownerCode && ownerCode !== '0x' && ownerCode !== '0x0') {
    fail(`NFT SmartChef Factory owner is a contract (${owner}); this browser-wallet test setup requires an EOA owner.`)
  }
  let impersonated = false
  try {
    await localRpc('anvil_setBalance', [owner, utils.parseEther('100').toHexString()])
    await localRpc('anvil_impersonateAccount', [owner])
    impersonated = true
    const ownerSigner = provider.getSigner(owner)
    await waitTx(
      await new Contract(FACTORY, FACTORY_ABI, ownerSigner).transferOwnership(TEST_WALLET),
      'Fork-only factory ownership transfer',
    )
  } finally {
    if (impersonated) await localRpc('anvil_stopImpersonatingAccount', [owner])
  }
  const nextOwner = await factory.owner()
  if (nextOwner.toLowerCase() !== TEST_WALLET.toLowerCase())
    fail('Factory owner read-back did not match the test wallet.')
  state.factoryOwner = nextOwner
  writeState(state)
  return nextOwner
}

async function ensureTestWalletIsEoa(provider) {
  const walletCode = await provider.getCode(TEST_WALLET)
  if (!walletCode || walletCode === '0x') return

  // This well-known Anvil key happens to have an EIP-7702 delegation record
  // in the forked Polygon snapshot. The app deliberately rejects contract
  // owners, so clear only that inherited delegation on this loopback fork.
  if (!walletCode.toLowerCase().startsWith('0xef0100')) {
    fail(`Test wallet has unexpected code (${walletCode}); refusing to replace it on the fork.`)
  }

  await localRpc('anvil_setCode', [TEST_WALLET, '0x'])
  const updatedCode = await provider.getCode(TEST_WALLET)
  if (updatedCode && updatedCode !== '0x') fail('Could not clear the test wallet delegation on the local fork.')
  console.log('  removed inherited EIP-7702 delegation from the test wallet on this local fork only.')
}

async function ensureWrappedPol(provider, walletSigner) {
  const wrapped = new Contract(WPOL, ERC20_ABI, walletSigner)
  const target = utils.parseEther('1000')
  const current = await wrapped.balanceOf(TEST_WALLET)
  if (current.lt(target)) await waitTx(await wrapped.deposit({ value: target.sub(current) }), 'Local WPOL wrapping')
}

async function ensureTestNfts(nft) {
  let owned = []
  for (let tokenId = 1; tokenId <= 500; tokenId += 1) {
    try {
      if ((await nft.ownerOf(tokenId)).toLowerCase() === TEST_WALLET.toLowerCase()) owned.push(tokenId)
    } catch {}
  }
  for (let tokenId = 1; owned.length < 2 && tokenId <= 500; tokenId += 1) {
    try {
      await nft.ownerOf(tokenId)
    } catch {
      await waitTx(await nft.mint(TEST_WALLET, tokenId), `Local test NFT #${tokenId} mint`)
      owned.push(tokenId)
    }
  }
  if (!owned.length) fail('Could not mint any local test NFT to the test wallet.')
  return owned
}

async function seedFork() {
  await assertAnvil()
  let state = readState() || emptyState()
  const block = await localRpc('eth_blockNumber')
  if (!state.forkBlock) state.forkBlock = Number.parseInt(block, 16)
  const provider = new providers.JsonRpcProvider(validateLoopbackRpc(RPC_URL), {
    chainId: CHAIN_ID,
    name: 'local-fork',
  })
  const walletSigner = provider.getSigner(TEST_WALLET)
  const deployer = provider.getSigner(DEPLOYER_WALLET)

  // All balance overrides and writes in this function target the validated loopback Anvil only.
  await localRpc('anvil_setBalance', [TEST_WALLET, utils.parseEther('10000').toHexString()])
  await localRpc('anvil_setBalance', [DEPLOYER_WALLET, utils.parseEther('100').toHexString()])
  await ensureTestWalletIsEoa(provider)
  await ensureFactoryOwner(provider, state)

  const artifacts = compileAssets()
  const nft = await deployedFixtureContract(state, artifacts, 'LaunchNFT', [], deployer)
  const forkCollect = await deployedFixtureContract(state, artifacts, 'ForkCollect', [TEST_WALLET], deployer)
  const forkUsdt = await deployedFixtureContract(state, artifacts, 'ForkUSDT', [TEST_WALLET], deployer)
  const forkCollectBalance = await forkCollect.balanceOf(TEST_WALLET)
  const collectTarget = utils.parseUnits('100000', 18)
  if (forkCollectBalance.lt(collectTarget))
    await waitTx(
      await forkCollect.mint(TEST_WALLET, collectTarget.sub(forkCollectBalance)),
      'Fork COLLECT test funding',
    )
  const forkUsdtBalance = await forkUsdt.balanceOf(TEST_WALLET)
  const usdtTarget = utils.parseUnits('10000', 6)
  if (forkUsdtBalance.lt(usdtTarget))
    await waitTx(await forkUsdt.mint(TEST_WALLET, usdtTarget.sub(forkUsdtBalance)), 'Fork USDT test funding')

  await ensureWrappedPol(provider, walletSigner)
  const nftSigner = nft.connect(deployer)
  const nftIds = await ensureTestNfts(nftSigner)

  const realCollectBefore = await new Contract(COLLECT, ERC20_ABI, provider).balanceOf(TEST_WALLET)
  let actualCollectCopied = false
  if (realCollectBefore.lt(collectTarget)) {
    actualCollectCopied = await transferFromForkHolder(
      KNOWN_COLLECT_HOLDER,
      COLLECT,
      18,
      '100000',
      'Polygon COLLECT',
      provider,
    )
  }
  const realUsdtBefore = await new Contract(USDT, ERC20_ABI, provider).balanceOf(TEST_WALLET)
  let actualUsdtCopied = false
  if (realUsdtBefore.lt(usdtTarget)) {
    for (const holder of KNOWN_USDT_HOLDERS) {
      if (await transferFromForkHolder(holder, USDT, 6, '10000', 'Polygon USDT', provider)) {
        actualUsdtCopied = true
        break
      }
    }
  }
  const canonicalCollectReady = (await new Contract(COLLECT, ERC20_ABI, provider).balanceOf(TEST_WALLET)).gte(
    collectTarget,
  )
  const canonicalUsdtReady = (await new Contract(USDT, ERC20_ABI, provider).balanceOf(TEST_WALLET)).gte(usdtTarget)

  state = {
    ...state,
    chainId: CHAIN_ID,
    rpcUrl: validateLoopbackRpc(RPC_URL),
    sessionId: state.sessionId || randomUUID(),
    assets: {
      ...state.assets,
      nft: nft.address,
      forkCollect: forkCollect.address,
      forkUsdt: forkUsdt.address,
    },
    factoryAddress: FACTORY,
    factoryOwner: await new Contract(FACTORY, FACTORY_ABI, provider).owner(),
    testWallet: TEST_WALLET,
    nftIds,
    actualCollectCopied: state.actualCollectCopied || actualCollectCopied || canonicalCollectReady,
    actualUsdtCopied: state.actualUsdtCopied || actualUsdtCopied || canonicalUsdtReady,
    seededAt: new Date().toISOString(),
  }
  writeState(state)
  console.log('Local fork seeded. No transaction was sent to Polygon mainnet.')
  console.log(`  wallet: ${TEST_WALLET}`)
  console.log(`  native POL (gas): ${formatToken(await provider.getBalance(TEST_WALLET), 18)}`)
  console.log(`  WPOL: 1,000 (real WPOL contract on this fork; ERC-20 reward)`)
  console.log(
    `  fork COLLECT: ${utils.formatUnits(await forkCollect.balanceOf(TEST_WALLET), 18)} at ${forkCollect.address}`,
  )
  console.log(`  fork USDT: ${utils.formatUnits(await forkUsdt.balanceOf(TEST_WALLET), 6)} at ${forkUsdt.address}`)
  console.log(`  test NFT: ${nft.address}, wallet-owned token IDs ${nftIds.join(', ')}`)
  console.log(`  factory owner: ${state.factoryOwner}`)
  if (!canonicalCollectReady)
    console.log('  canonical COLLECT unavailable: fork-only COLLECT test token is ready instead.')
  if (!canonicalUsdtReady) console.log('  canonical USDT unavailable: fork-only USDT test token is ready instead.')
}

function formatToken(value, decimals, places = 4) {
  const fixed = Number(utils.formatUnits(value, decimals)).toFixed(places)
  return fixed.replace(/\.?0+$/, '') || '0'
}

async function getStatus() {
  validateLoopbackRpc(RPC_URL)
  await assertAnvil()
  const state = readState()
  if (!state) fail('Local fork has not been initialized. Run npm run fork:start, then fork:seed.')
  const provider = new providers.JsonRpcProvider(validateLoopbackRpc(RPC_URL), {
    chainId: CHAIN_ID,
    name: 'local-fork',
  })
  const blockNumber = await provider.getBlockNumber()
  const [native, factoryCode, factoryOwner, testWalletCode] = await Promise.all([
    provider.getBalance(TEST_WALLET),
    provider.getCode(FACTORY),
    new Contract(FACTORY, FACTORY_ABI, provider).owner(),
    provider.getCode(TEST_WALLET),
  ])
  const tokenBalance = async (address) => {
    try {
      const contract = new Contract(address, ERC20_ABI, provider)
      const [symbol, decimals, balance] = await Promise.all([
        contract.symbol(),
        contract.decimals(),
        contract.balanceOf(TEST_WALLET),
      ])
      return { symbol, decimals: Number(decimals), raw: balance, display: formatToken(balance, Number(decimals)) }
    } catch {
      return { symbol: 'unavailable', decimals: 0, raw: utils.parseUnits('0', 0), display: 'unavailable' }
    }
  }
  const [collect, usdt, wpol, forkCollect, forkUsdt] = await Promise.all([
    tokenBalance(COLLECT),
    tokenBalance(USDT),
    tokenBalance(WPOL),
    state.assets.forkCollect ? tokenBalance(state.assets.forkCollect) : null,
    state.assets.forkUsdt ? tokenBalance(state.assets.forkUsdt) : null,
  ])
  let nftIds = []
  if (state.assets.nft) {
    try {
      const nft = new Contract(state.assets.nft, NFT_ABI, provider)
      const [items] = await nft.tokensOfOwnerBySize(TEST_WALLET, 0, 100)
      nftIds = items.map((id) => id.toString())
    } catch {}
  }
  const factoryOk = factoryCode !== '0x' && factoryOwner.toLowerCase() === TEST_WALLET.toLowerCase()
  const ready = Boolean(
    native.gte(utils.parseEther('100')) &&
      (!testWalletCode || testWalletCode === '0x') &&
      factoryOk &&
      (collect.raw.gt(0) || Boolean(forkCollect?.raw.gt(0))) &&
      (usdt.raw.gt(0) || Boolean(forkUsdt?.raw.gt(0))) &&
      wpol.raw.gte(utils.parseEther('100')) &&
      state.assets.nft &&
      nftIds.length > 0,
  )
  return {
    state,
    blockNumber,
    native,
    factoryCode,
    factoryOwner,
    testWalletCode,
    collect,
    usdt,
    wpol,
    forkCollect,
    forkUsdt,
    nftIds,
    ready,
  }
}

async function printStatus() {
  try {
    const status = await getStatus()
    console.log('CoinCollect local Polygon fork status')
    console.log(`  RPC: ${validateLoopbackRpc(RPC_URL)} · chain ${CHAIN_ID} · block ${status.blockNumber}`)
    console.log(`  test wallet: ${TEST_WALLET}`)
    console.log(`  native POL (gas): ${formatToken(status.native, 18)} POL`)
    console.log(`  canonical Polygon COLLECT: ${status.collect.display} ${status.collect.symbol}`)
    console.log(`  canonical Polygon USDT: ${status.usdt.display} ${status.usdt.symbol}`)
    console.log(`  canonical WPOL ERC-20: ${status.wpol.display} WPOL`)
    console.log(
      `  fork-only COLLECT: ${status.forkCollect?.display || 'not seeded'} · ${status.state.assets.forkCollect || '-'}`,
    )
    console.log(
      `  fork-only USDT: ${status.forkUsdt?.display || 'not seeded'} · ${status.state.assets.forkUsdt || '-'}`,
    )
    console.log(`  test NFT contract: ${status.state.assets.nft || 'not seeded'}`)
    console.log(`  wallet-owned test NFT IDs: ${status.nftIds.join(', ') || 'none'}`)
    console.log(`  NFT SmartChef Factory: ${FACTORY}`)
    console.log(`  factory owner: ${status.factoryOwner}`)
    console.log(`  test wallet code: ${status.testWalletCode === '0x' ? 'clear (EOA)' : 'present (not ready)'}`)
    console.log(`  ready for manual UI testing: ${status.ready ? 'YES' : 'NO'}`)
    if (status.state.forkBlock) console.log(`  Polygon state pinned at block: ${status.state.forkBlock}`)
    return status
  } catch (error) {
    console.error(`Local fork status unavailable: ${error.message}`)
    console.error('Start the fork with npm run fork:start. This command does not fall back to public Polygon RPCs.')
    process.exitCode = 1
    return null
  }
}

async function resetFork() {
  await assertAnvil()
  const prior = readState()
  if (!prior?.forkBlock) fail('No pinned fork block is recorded. Stop Anvil, then run fork:start and fork:seed.')
  const upstream = validateUpstream(process.env.COINCOLLECT_FORK_UPSTREAM || FORK_SOURCES[0])
  await localRpc('anvil_reset', [{ forking: { jsonRpcUrl: upstream, blockNumber: prior.forkBlock } }])
  await assertAnvil()
  const reset = {
    ...emptyState(),
    forkBlock: prior.forkBlock,
    sessionId: randomUUID(),
  }
  writeState(reset)
  await seedFork()
  console.log('Fork reset to its pinned Polygon read snapshot and reseeded.')
  console.log('Restart `npm run dev:fork` so this browser profile uses the new clean local-fork storage namespace.')
}

async function portIsFree(port) {
  return isPortFree(`http://127.0.0.1:${port}`)
}

async function runDevFork() {
  const status = await getStatus()
  if (!status.ready) fail('Fork is not seeded and ready. Run npm run fork:seed, then fork:status.')
  const state = status.state
  await portIsFree(3001)
  const env = {
    ...process.env,
    NEXT_PUBLIC_CHAIN_ID: '137',
    NEXT_PUBLIC_LOCAL_FORK: '1',
    NEXT_PUBLIC_LOCAL_FORK_CHAIN_ID: String(CHAIN_ID),
    NEXT_PUBLIC_LOCAL_FORK_RPC: validateLoopbackRpc(RPC_URL),
    NEXT_PUBLIC_FORK_SESSION_ID: state.sessionId,
    NEXT_PUBLIC_APP_BASE_URL: 'http://localhost:3001',
    COINCOLLECT_NEXT_DIST_DIR: '.next-fork',
    COINCOLLECT_FORK_RPC: validateLoopbackRpc(RPC_URL),
  }
  const nextBin = path.join(ROOT, 'node_modules', '.bin', 'next')
  if (!existsSync(nextBin)) fail('Next.js is not installed in the root project node_modules.')
  const child = spawn(nextBin, ['dev', '-p', '3001'], { cwd: ROOT, stdio: 'inherit', env })
  child.once('error', (error) => console.error(`Fork frontend could not start: ${error.message}`))
  await new Promise((resolve) => {
    child.once('exit', resolve)
    const forwardSignal = (signal) => child.kill(signal)
    process.once('SIGINT', forwardSignal)
    process.once('SIGTERM', forwardSignal)
  })
}

async function runForkTest() {
  const status = await getStatus()
  if (!status.ready) fail('Fork is not seeded and ready. Run npm run fork:seed, then fork:status.')
  const env = {
    ...process.env,
    NEXT_PUBLIC_LOCAL_FORK: '1',
    NEXT_PUBLIC_LOCAL_FORK_CHAIN_ID: String(CHAIN_ID),
    NEXT_PUBLIC_LOCAL_FORK_RPC: validateLoopbackRpc(RPC_URL),
    NEXT_PUBLIC_FORK_SESSION_ID: status.state.sessionId,
    COINCOLLECT_FORK_RPC: validateLoopbackRpc(RPC_URL),
    COINCOLLECT_FORK_CHAIN_ID: String(CHAIN_ID),
  }
  const jestBin = path.join(ROOT, 'node_modules', '.bin', 'jest')
  if (!existsSync(jestBin)) fail('Jest is not installed in the root project node_modules.')
  const child = spawn(
    jestBin,
    ['src/features/nftPoolManager/launch/__tests__/fork.test.ts', '--runInBand', '--reporters=default'],
    {
      cwd: ROOT,
      stdio: 'inherit',
      env,
    },
  )
  await new Promise((resolve) => child.once('exit', (code) => resolve((process.exitCode = code || 0))))
}

async function main() {
  const command = process.argv[2]
  if (command === 'start') return startFork()
  if (command === 'seed') return seedFork()
  if (command === 'status') return printStatus()
  if (command === 'reset') return resetFork()
  if (command === 'dev') return runDevFork()
  if (command === 'test') return runForkTest()
  fail('Usage: node scripts/local-fork-tool/main.cjs <start|seed|status|reset|dev|test>')
}

main().catch((error) => {
  console.error(`Local fork error: ${error.message}`)
  process.exitCode = 1
})
