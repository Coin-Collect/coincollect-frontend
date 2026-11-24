'use strict'

const { execFileSync, spawn } = require('node:child_process')
const { once } = require('node:events')
const { randomBytes } = require('node:crypto')
const { rmSync } = require('node:fs')
const path = require('node:path')
const { createInterface } = require('node:readline/promises')
const { setTimeout: delay } = require('node:timers/promises')
const { Wallet, Contract } = require('ethers')
const { refuseFixtureEnvironment } = require('./local-test-environment.cjs')

refuseFixtureEnvironment()

const project = path.resolve(process.argv[2] || '')
const port = Number(process.argv[3] || 3020)
if (!process.argv[2] || !Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('Usage: node scripts/run-v3-manual.cjs <reviewed Solidity project> [port]')
}
const { startLocalAnvil } = require(path.join(project, 'scripts/local-anvil.cjs'))
const origin = 'http://127.0.0.1:' + port
const next = require.resolve('next/dist/bin/next')

async function run() {
  const mnemonic = Wallet.createRandom().mnemonic.phrase
  const local = await startLocalAnvil(['--mnemonic', mnemonic])
  const { provider } = local
  const secret = randomBytes(32).toString('hex')
  const session = randomBytes(8).toString('hex')
  const distDir = '.next-verification/v354-manual-' + session
  let server
  let consoleInput
  let stop
  const stopped = new Promise((resolve) => { stop = resolve })
  let stopping = false
  const interrupt = () => {
    stopping = true
    stop()
  }
  process.once('SIGINT', interrupt)
  process.once('SIGTERM', interrupt)
  try {
    const fixture = JSON.parse(execFileSync(process.execPath, ['scripts/deploy-browser-fixture.cjs'], {
      cwd: project,
      encoding: 'utf8',
      env: { ...process.env, COINCOLLECT_V34_FIXTURE: '1', COINCOLLECT_V3_LOCAL_RPC: local.url },
      timeout: 120_000,
    }))
    if (!fixture.managed) throw new Error('The reviewed fixture must include the managed ERC-1155 adapter.')
    const wallets = [0, 1].map((index) => Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/" + index))
    if (wallets[0].address !== fixture.operator || wallets[1].address !== fixture.participant) {
      throw new Error('The Anvil test wallet addresses did not match the fixture.')
    }

    server = spawn(process.execPath, [next, 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(port)], {
      env: {
        ...process.env,
        NEXT_PUBLIC_LOCAL_FORK: '1',
        NEXT_PUBLIC_LOCAL_FORK_CHAIN_ID: '31337',
        NEXT_PUBLIC_LOCAL_FORK_RPC: local.url,
        NEXT_PUBLIC_FORK_BLOCK: '0',
        NEXT_PUBLIC_FORK_SESSION_ID: session,
        NEXT_PUBLIC_V3_LEDGER_ADDRESS: fixture.ledger,
        NEXT_PUBLIC_V3_LEDGER_CODE_HASH: fixture.runtimeHash,
        NEXT_PUBLIC_V33_BASE_RPC: '',
        NEXT_PUBLIC_V33_ARBITRUM_RPC: '',
        NEXT_TELEMETRY_DISABLED: '1',
        NEXT_PUBLIC_SENTRY_DSN: '',
        SENTRY_DSN: '',
        SENTRY_AUTH_TOKEN: '',
        COINCOLLECT_NEXT_DIST_DIR: distDir,
        COINCOLLECT_V3_AUTOMATION: 'isolated',
        COINCOLLECT_V3_ENABLE_POLYGON_EXECUTION: '0',
        COINCOLLECT_V3_EXECUTOR_KEY: '',
        CRON_SECRET: secret,
      },
      stdio: ['ignore', 'inherit', 'inherit'],
    })
    const exited = once(server, 'exit')
    const deadline = Date.now() + 120_000
    while (!stopping) {
      if (server.exitCode !== null || Date.now() >= deadline) throw new Error('The manual preview did not start.')
      const status = await fetch(origin + '/api/v3/replenish?status=1', {
        signal: AbortSignal.timeout(5_000),
      }).then((response) => response.json()).catch(() => undefined)
      if (status?.mode === 'starting') break
      await delay(500)
    }
    if (stopping) return
    console.log('\nStudio: ' + origin + '/admin/nft-pools/v3')
    console.log('Pool list: ' + origin + '/nftpools')
    console.log('Fixture ERC-721 pool: ' + origin + '/nftpools/v3/' + fixture.poolId)
    console.log('Wallet network: CoinCollect Local | RPC ' + local.url + ' | Chain 31337 | Currency POL')
    console.log('Admin ' + fixture.operator + ' | Participant ' + fixture.participant)
    console.log('ERC-721 ' + fixture.nft + ' #23 | Wrapped POL ' + fixture.token)
    console.log('Managed ERC-1155 ' + fixture.managed.collection + ' #25 | adapter ' + fixture.managed.adapter)
    console.log('Unsupported ERC-1155 fixture ' + fixture.managed.plainCollection)
    if (fixture.dynamic) {
      console.log('V3.6 registered swap token V3USD ' + fixture.dynamic.stable)
      console.log('V3.6 unregistered 8-decimal test token V3BTC ' + fixture.dynamic.nextToken)
    }
    const help = 'Commands: wallets, tick, advance <seconds>, pool-time <id> <end|before|deadline>, transfer1155 <units>'
      + (fixture.dynamic ? ', observe36' : '') + ', quit'
    console.log(help)
    const leaf = fixture.dynamic && new Contract(fixture.dynamic.adapter, [
      'function observe(address input,address output)',
    ], provider.getSigner(fixture.operator))

    const ledger = new Contract(fixture.ledger, [
      'function poolState(uint256 id) view returns ((uint64 start,uint64 end,uint16 threshold,uint16 maxWallets,uint16 maxNftsPerWallet,string metadataURI),uint64,uint16,uint64,uint256)',
      'function CLAIM_PERIOD() view returns (uint256)',
    ], provider)
    const managed = new Contract(fixture.managed.collection, [
      'function safeTransferFrom(address from,address to,uint256 id,uint256 amount,bytes data)',
    ], provider.getSigner(fixture.participant))
    consoleInput = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) })
    const commands = async () => {
      for await (const line of consoleInput) {
        const [command, argument, boundary] = line.trim().split(/\s+/)
        if (command === 'quit') return
        try {
          if (command === 'wallets') {
            console.log('Ephemeral test private keys only. Import in a separate test profile.')
            console.log('Admin ' + wallets[0].privateKey)
            console.log('Participant ' + wallets[1].privateKey)
          } else if (command === 'tick') {
            const response = await fetch(origin + '/api/v3/replenish', {
              method: 'POST',
              headers: { Authorization: 'Bearer ' + secret },
              redirect: 'error',
              signal: AbortSignal.timeout(70_000),
            })
            console.log('Worker HTTP ' + response.status, await response.json())
          } else if (command === 'observe36' && leaf) {
            const first = await (await leaf.observe(fixture.token, fixture.dynamic.stable)).wait()
            await (await leaf.observe(fixture.dynamic.stable, fixture.token)).wait()
            console.log('Local route observations confirmed (' + first.transactionHash + ').')
          } else if (command === 'advance' && /^[1-9]\d{0,7}$/.test(argument)) {
            await provider.send('evm_increaseTime', [Number(argument)])
            await provider.send('evm_mine', [])
            const block = await provider.getBlock('latest')
            console.log('Local block time ' + new Date(block.timestamp * 1000).toISOString())
          } else if (command === 'pool-time' && /^[1-9]\d{0,7}$/.test(argument) && ['end', 'before', 'deadline'].includes(boundary)) {
            const [[{ end }], claimPeriod, block] = await Promise.all([
              ledger.poolState(argument), ledger.CLAIM_PERIOD(), provider.getBlock('latest'),
            ])
            const target = boundary === 'end' ? end : end.add(claimPeriod).sub(boundary === 'before' ? 1 : 0)
            if (target.lte(block.timestamp)) {
              console.log('That boundary has already passed. Start a fresh fixture to revisit it.')
              continue
            }
            await provider.send('evm_setNextBlockTimestamp', [target.toNumber()])
            await provider.send('evm_mine', [])
            console.log('Local block time ' + new Date(target.toNumber() * 1000).toISOString())
          } else if (command === 'transfer1155' && /^[1-9]\d?$/.test(argument)) {
            const tx = await managed.safeTransferFrom(
              fixture.participant, fixture.operator, fixture.managed.tokenId, Number(argument), '0x',
            )
            console.log('Local ERC-1155 transfer ' + (await tx.wait()).transactionHash)
          } else if (command) {
            console.log(help)
          }
        } catch (error) {
          console.error('Local action failed:', error.code || error.shortMessage || error.name)
        }
      }
      if (!process.stdin.isTTY) await stopped
    }
    await Promise.race([stopped, exited, commands()])
    if (server.exitCode) process.exitCode = server.exitCode
  } finally {
    consoleInput?.close()
    if (server && server.exitCode === null && server.signalCode === null && server.pid) {
      const done = once(server, 'exit')
      server.kill()
      await done
    }
    local.close()
    rmSync(distDir, { recursive: true, force: true, maxRetries: 3 })
    process.removeListener('SIGINT', interrupt)
    process.removeListener('SIGTERM', interrupt)
  }
}

run().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
