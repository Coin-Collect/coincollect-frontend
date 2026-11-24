const { spawn, execFileSync } = require('node:child_process')
const { once } = require('node:events')
const { createServer } = require('node:net')
const { createServer: createHttpServer } = require('node:http')
const { setTimeout: delay } = require('node:timers/promises')
const { randomBytes } = require('node:crypto')
const { writeFileSync, mkdtempSync, openSync, closeSync, readFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { refuseFixtureEnvironment } = require('./local-test-environment.cjs')

refuseFixtureEnvironment()

const project = process.argv[2]
if (!project) throw new Error('Usage: node scripts/run-v3-browser-acceptance.cjs <Universal Rewards Solidity project>')
const contracts = path.resolve(project)
const { startLocalAnvil } = require(path.join(contracts, 'scripts/local-anvil.cjs'))

async function localPort() {
  const listener = createServer()
  listener.listen(0, '127.0.0.1')
  await once(listener, 'listening')
  const { port } = listener.address()
  await new Promise((resolve, reject) => listener.close((error) => (error ? reject(error) : resolve())))
  return port
}

async function run() {
  const fork = await startLocalAnvil()
  let server
  let distDir
  let sentry
  try {
    const logs = mkdtempSync(path.join(tmpdir(), 'coincollect-v3-browser-'))
    console.log('Isolated browser logs:', logs)
    const fixturePath = path.join(logs, 'fixture.json')
    const fixtureJson = execFileSync(process.execPath, ['scripts/deploy-browser-fixture.cjs'], {
      cwd: contracts,
      encoding: 'utf8',
      env: { ...process.env, COINCOLLECT_V34_FIXTURE: '1', COINCOLLECT_V3_LOCAL_RPC: fork.url },
      timeout: 120_000,
    })
    const fixture = JSON.parse(fixtureJson)
    writeFileSync(fixturePath, fixtureJson)
    const port = await localPort()
    const app = 'http://127.0.0.1:' + port
    const secret = randomBytes(32).toString('hex')
    const sentryProbe = 'coincollect-browser-probe-' + randomBytes(12).toString('hex')
    const sentryError = sentryProbe + '-expected'
    const sentryRejection = sentryProbe + '-rejected'
    const sentryEvents = []
    sentry = createHttpServer(async (request, response) => {
      response.setHeader('Access-Control-Allow-Origin', app)
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      if (request.method === 'POST' && request.url.startsWith('/api/1/envelope/')) {
        request.setEncoding('utf8')
        let envelope = ''
        for await (const chunk of request) {
          if (envelope.length < 1_000_000) envelope += chunk
        }
        for (const event of [sentryError, sentryRejection]) {
          if (envelope.includes(event)) sentryEvents.push(event)
        }
        response.writeHead(200).end('{}')
      } else if (request.method === 'GET' && request.url === '/probe') {
        response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(sentryEvents))
      } else {
        response.writeHead(request.method === 'OPTIONS' ? 204 : 404).end()
      }
    })
    sentry.listen(0, '127.0.0.1')
    await once(sentry, 'listening')
    const sentryEndpoint = '127.0.0.1:' + sentry.address().port
    const sentryDsn = 'http://test@' + sentryEndpoint + '/1'
    distDir = '.next-verification/v351-browser-' + port
    const env = {
      ...process.env,
      NEXT_PUBLIC_LOCAL_FORK: '1',
      NEXT_PUBLIC_LOCAL_FORK_CHAIN_ID: '31337',
      NEXT_PUBLIC_LOCAL_FORK_RPC: fork.url,
      NEXT_PUBLIC_FORK_BLOCK: '0',
      NEXT_PUBLIC_FORK_SESSION_ID: 'v3-browser-' + port,
      NEXT_PUBLIC_V3_LEDGER_ADDRESS: fixture.ledger,
      NEXT_PUBLIC_V3_LEDGER_CODE_HASH: fixture.runtimeHash,
      NEXT_TELEMETRY_DISABLED: '1',
      SENTRY_AUTH_TOKEN: '',
      SENTRY_DSN: sentryDsn,
      NEXT_PUBLIC_SENTRY_DSN: sentryDsn,
      COINCOLLECT_NEXT_DIST_DIR: distDir,
      COINCOLLECT_V3_AUTOMATION: 'isolated',
      COINCOLLECT_V3_AUTOMATION_FIRST_POOL: '1',
      COINCOLLECT_V3_ENABLE_POLYGON_EXECUTION: '0',
      CRON_SECRET: secret,
    }
    const next = require.resolve('next/dist/bin/next')
    const buildPath = path.join(logs, 'build.log')
    const buildLog = openSync(buildPath, 'w')
    try {
      execFileSync(process.execPath, [next, 'build', '--webpack'], {
        env,
        stdio: ['ignore', buildLog, buildLog],
        timeout: 360_000,
      })
    } catch {
      console.error(readFileSync(buildPath, 'utf8').split('\n').slice(-35).join('\n'))
      throw new Error('The isolated production build failed.')
    } finally {
      closeSync(buildLog)
    }
    const log = openSync(path.join(logs, 'next.log'), 'w')
    try {
      server = spawn(
        process.execPath,
        [next, 'start', '-H', '127.0.0.1', '-p', String(port)],
        {
          env,
          stdio: ['ignore', log, log],
        },
      )
    } finally {
      closeSync(log)
    }
    const deadline = Date.now() + 120_000
    for (;;) {
      if (server.exitCode !== null || Date.now() >= deadline) throw new Error('Next production server did not become ready.')
      const response = await fetch(app + '/api/v3/replenish?status=1', {
        signal: AbortSignal.timeout(4_000),
      }).catch(() => undefined)
      if (response?.ok) break
      await delay(300)
    }
    const test = spawn(process.execPath, ['scripts/verify-v3-browser.cjs', fixturePath], {
      env: {
        ...env,
        V3_BROWSER_CRON_SECRET: secret,
        V3_BROWSER_APP: app,
        V3_BROWSER_RPC: fork.url,
        V3_BROWSER_SENTRY_PROBE: sentryProbe,
        V3_BROWSER_SENTRY_URL: 'http://' + sentryEndpoint,
      },
      stdio: 'inherit',
    })
    const [status] = await once(test, 'exit')
    process.exitCode = status ?? 1
  } finally {
    if (server && server.exitCode === null && server.signalCode === null) {
      const stopped = once(server, 'exit')
      server.kill()
      await stopped
    }
    fork.close()
    if (sentry?.listening) sentry.close()
    if (distDir) rmSync(distDir, { recursive: true, force: true, maxRetries: 3 })
  }
}

run().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
