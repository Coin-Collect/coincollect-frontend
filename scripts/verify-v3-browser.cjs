const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { setTimeout: delay } = require('node:timers/promises')

const fixtureFile = process.argv[2]
if (!fixtureFile) throw new Error('Usage: node scripts/verify-v3-browser.cjs <deployed fixture JSON>')
const fixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf8'))
const local = (value) => {
  const url = new URL(value)
  if (
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('The browser acceptance test requires loopback endpoints.')
  return url.origin
}
const rpcUrl = local(process.env.V3_BROWSER_RPC || 'http://127.0.0.1:18545')
const base = local(process.env.V3_BROWSER_APP || 'http://127.0.0.1:3013')
const chrome =
  process.env.CHROME_BIN ||
  (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome')

async function rpc(method, params = []) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(6_000),
  })
  const result = await response.json()
  if (result.error) throw new Error(method + ': ' + result.error.message)
  return result.result
}

function injectedWallet(account, node) {
  localStorage.setItem('wagmi.injected.connected', 'true')
  localStorage.setItem('wagmi.recentConnectorId', JSON.stringify('injected'))
  const listeners = new Map()
  window.ethereum = {
    on(event, callback) {
      listeners.set(event, callback)
    },
    removeListener(event) {
      listeners.delete(event)
    },
    async request({ method, params = [] }) {
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [account]
      if (method === 'wallet_switchEthereumChain' && params[0]?.chainId === '0x7a69') {
        listeners.get('chainChanged')?.('0x7a69')
        return null
      }
      const response = await fetch(node, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      })
      const result = await response.json()
      if (result.error) throw Object.assign(new Error(result.error.message), result.error)
      return result.result
    },
  }
}

async function connect(url) {
  const socket = new WebSocket(url)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  let serial = 0
  const commands = new Map()
  const exceptions = []
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data))
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails
      exceptions.push((details.exception?.description || details.text).split('\n')[0])
    }
    const command = commands.get(message.id)
    if (!command) return
    commands.delete(message.id)
    clearTimeout(command.timer)
    if (message.error) command.reject(new Error(message.error.message))
    else command.resolve(message.result)
  })
  function command(method, params = {}) {
    const id = ++serial
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        commands.delete(id)
        reject(new Error('Chrome did not answer ' + method))
      }, 8_000)
      commands.set(id, { resolve, reject, timer })
      socket.send(JSON.stringify({ method, params, id }))
    })
  }
  return { command, exceptions, close: () => socket.close() }
}

async function testBrowser() {
  assert.equal(await rpc('eth_chainId'), '0x7a69')
  assert.ok((await rpc('anvil_nodeInfo')).environment)
  const secret = process.env.V3_BROWSER_CRON_SECRET
  if (secret) {
    const cronUrl = base + '/api/v3/replenish'
    assert.equal((await fetch(cronUrl)).status, 401)
    const tick = () =>
      fetch(cronUrl, { headers: { Authorization: 'Bearer ' + secret } }).then((response) => {
        assert.equal(response.status, 200)
        return response.json()
      })
    const first = await tick()
    assert.ok(first.results.some((job) => job.poolId === String(fixture.poolId) && job.status === 'confirmed'))
    const repeated = await tick()
    assert.ok(repeated.results.every((job) => job.status !== 'confirmed'))
    console.log('PASS local cron authorization, receipt verification and duplicate delivery')
  }
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'coincollect-v3-chrome-'))
  const browser = spawn(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--disable-background-networking',
      '--remote-debugging-port=0',
      '--user-data-dir=' + profile,
      '--no-sandbox',
      'about:blank',
    ],
    { stdio: 'ignore' },
  )
  let browserError
  browser.on('error', (error) => {
    browserError = error
  })
  let cdp
  try {
    const portFile = path.join(profile, 'DevToolsActivePort')
    for (let i = 0; i < 200 && !fs.existsSync(portFile); i++) {
      if (browserError) throw browserError
      if (browser.exitCode !== null) throw new Error('Chrome stopped before starting the acceptance browser.')
      await delay(50)
    }
    const [port] = fs.readFileSync(portFile, 'utf8').split('\n')
    const pages = await fetch('http://127.0.0.1:' + port + '/json/list').then((response) => response.json())
    cdp = await connect(pages.find(({ type }) => type === 'page').webSocketDebuggerUrl)
    const { command } = cdp
    await command('Page.enable')
    await command('Runtime.enable')
    let injection
    const evalPage = async (fn, ...args) => {
      const evaluated = await command('Runtime.evaluate', {
        expression: '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')',
        awaitPromise: true,
        returnByValue: true,
        userGesture: true,
      })
      if (evaluated.exceptionDetails) throw new Error(evaluated.result.description || evaluated.exceptionDetails.text)
      return evaluated.result.value
    }
    const wait = async (label, condition, ...args) => {
      const until = Date.now() + 28_000
      while (Date.now() < until) {
        const value = await evalPage(condition, ...args).catch(() => undefined)
        if (value) return value
        await delay(150)
      }
      const evidence = await evalPage(() => ({
        text: document.body?.innerText.slice(-1600),
        scripts: document.scripts.length,
        visibility: document.visibilityState,
        route: location.pathname,
        ethereum: Boolean(window.ethereum),
      })).catch((error) => ({ expressionError: error.message }))
      throw new Error(
        'Browser did not reach ' + label + '\n' + JSON.stringify({ ...evidence, errors: cdp.exceptions.slice(-8) }),
      )
    }
    const visit = async (route, account) => {
      if (injection) await command('Page.removeScriptToEvaluateOnNewDocument', { identifier: injection })
      const expression =
        '(' + injectedWallet.toString() + ')(' + JSON.stringify(account) + ',' + JSON.stringify(rpcUrl) + ')'
      injection = (await command('Page.addScriptToEvaluateOnNewDocument', { source: expression })).identifier
      await command('Page.navigate', { url: base + route })
      await wait(route, (expected) => location.pathname === expected && document.readyState === 'complete', route)
    }
    const viewport = (width, height, mobile = false) =>
      command('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile,
      })
    const has = (text) => wait(text, (phrase) => document.body.innerText.includes(phrase), text)
    const click = (selector, text) =>
      wait(
        text,
        (selector, text) => {
          const element = Array.from(document.querySelectorAll(selector)).find(
            (candidate) => candidate.textContent.trim() === text && !candidate.disabled,
          )
          if (!element) return false
          element.click()
          return true
        },
        selector,
        text,
      )
    const field = (name, value) =>
      wait(
        name,
        (name, value) => {
          const element = document.querySelector('[name="' + name + '"]')
          if (!element || element.disabled) return false
          const prototype = Object.getPrototypeOf(element)
          Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value)
          element.dispatchEvent(new Event('input', { bubbles: true }))
          element.dispatchEvent(new Event('change', { bubbles: true }))
          return element.value === value
        },
        name,
        value,
      )

    const pad = (hex) => hex.slice(2).padStart(64, '0')
    const tokenId = pad('0x' + Number(fixture.tokenId).toString(16))
    const ownerOf = () => rpc('eth_call', [{ to: fixture.nft, data: '0x6352211e' + tokenId }, 'latest'])
    const tokenBalance = (account) =>
      rpc('eth_call', [
        {
          to: fixture.token,
          data: '0x70a08231' + pad(account),
        },
        'latest',
      ]).then(BigInt)

    await viewport(1360, 900)
    await visit('/nftpools', fixture.participant)
    await has('Staked only')
    await has('Finished')
    await has('V3 Browser Fixture')
    await click('a', 'View pool')
    await field('token-id', String(fixture.tokenId))
    await click('button', 'Check NFT')
    await wait(
      'eligible NFT checkbox',
      (id) => {
        const option = Array.from(document.querySelectorAll('label')).find((label) =>
          label.textContent.includes('#' + id + ' · 3 power'),
        )
        const input = option?.querySelector('input[type=checkbox]')
        if (!input || input.disabled) return false
        input.click()
        return true
      },
      fixture.tokenId,
    )
    await has('Estimated next 24 hours')
    await click('button', 'Join with selected NFTs')
    await has('Confirmed on the settlement network.')
    await has('Exit and claim')
    assert.equal(await ownerOf(), '0x' + pad(fixture.participant).toLowerCase())

    await rpc('evm_increaseTime', [900])
    await rpc('evm_mine')
    await rpc('eth_sendTransaction', [
      {
        from: fixture.participant,
        to: fixture.nft,
        data: '0x23b872dd' + pad(fixture.participant) + pad(fixture.operator) + tokenId,
      },
    ])
    const poolPath = '/nftpools/v3/' + fixture.poolId
    await visit(poolPath, fixture.participant)
    await has('No wallet positions in the records on this page.')
    await viewport(390, 844, true)
    const ownerBalance = await tokenBalance(fixture.operator)
    await visit(poolPath, fixture.operator)
    await click('button', 'Exit and claim')
    await has('Confirmed on the settlement network.')
    await has('No active participation')
    assert.equal(await ownerOf(), '0x' + pad(fixture.operator).toLowerCase())
    assert.ok((await tokenBalance(fixture.operator)) > ownerBalance)
    assert.ok(await evalPage(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    console.log('PASS Chrome desktop join, NFT transfer, mobile layout and new-owner exit')

    await viewport(1280, 900)
    await visit('/admin/nft-pools/v3', fixture.operator)
    await has('Pool Studio V3')
    await field('pool-name', 'Studio acceptance pool')
    await field('collection-0', fixture.nft)
    await field('funding-asset', fixture.token)
    await field('reward-0', fixture.token)
    await field('funding-budget', '12')
    const future = new Date(Date.now() + 3 * 3600_000)
    const localFuture = new Date(future.getTime() - future.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
    await field('start-date', localFuture)
    await click('button', 'Review pool plan')
    await has('Review funding and rewards')
    await click('button', 'Create V3 pool')
    await has('Fund and manage pool #')
    await field('deposit-amount', '12')
    await wait('native POL option', () => {
      const option = document.querySelector('input[name="native-pol"]')
      if (!option) return false
      option.click()
      return true
    })
    await click('button', 'Deposit budget')
    await wait('confirmed 12-token deposit', () =>
      Array.from(document.querySelectorAll('dt')).some(
        (term) => term.textContent === 'Deposited' && term.parentElement.textContent.includes('12'),
      ),
    )
    await click('a', 'View public pool')
    await has('Studio acceptance pool')
    await evalPage(() => localStorage.clear())
    await visit('/nftpools/v3', fixture.participant)
    await has('Studio acceptance pool')
    console.log('PASS Chrome operator preview, creation, signed deposit and independent catalogue read')
  } finally {
    cdp?.close()
    browser.kill()
    await new Promise((resolve) => {
      if (browser.exitCode !== null || browser.signalCode !== null || browserError) resolve()
      else {
        browser.once('exit', resolve)
        setTimeout(resolve, 2000).unref()
      }
    })
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 })
  }
}

testBrowser().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
