const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const { once } = require('node:events')
const { createServer } = require('node:net')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { setTimeout: delay } = require('node:timers/promises')
const { parseAbi, encodeFunctionData, decodeFunctionResult, encodeEventTopics, parseEther, toHex } = require('viem')

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

async function minedReceipt(hash, operation) {
  assert.match(hash ?? '', /^0x[0-9a-f]{64}$/i, operation)
  const deadline = Date.now() + 10_000
  do {
    const receipt = await rpc('eth_getTransactionReceipt', [hash])
    if (receipt) return receipt
    await delay(50)
  } while (Date.now() < deadline)
  throw new Error(`${operation} did not produce a mined receipt: ${hash}`)
}

function injectedWallet(account, node, announceProvider, initialChain) {
  localStorage.setItem('wagmi.injected.connected', 'true')
  localStorage.setItem('wagmi.recentConnectorId', JSON.stringify('injected'))
  const listeners = new Map()
  let chainId = initialChain
  window.ethereum = {
    isMetaMask: announceProvider,
    on(event, callback) {
      listeners.set(event, callback)
    },
    removeListener(event) {
      listeners.delete(event)
    },
    async request({ method, params = [] }) {
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
        return [window.__nextV3WalletAccount || account]
      }
      if (method === 'eth_chainId') return chainId
      if (method === 'eth_sendTransaction' && chainId !== '0x7a69') {
        throw Object.assign(new Error('The test wallet is on the wrong network.'), { code: 4901 })
      }
      if (method === 'eth_sendTransaction' && window.__nextV3WalletError) {
        const { message, code } = window.__nextV3WalletError
        delete window.__nextV3WalletError
        throw Object.assign(new Error(message), { code })
      }
      if (method === 'wallet_switchEthereumChain' && params[0]?.chainId === '0x7a69') {
        chainId = '0x7a69'
        listeners.get('chainChanged')?.(chainId)
        return null
      }
      const forceRevert = method === 'eth_sendTransaction' && window.__nextV3WalletLowGas
      if (forceRevert) {
        window.__nextV3WalletLowGas = false
        params = [{ ...params[0], gas: '0x7530' }]
      }
      const response = await fetch(node, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      })
      const result = await response.json()
      if (result.error) throw Object.assign(new Error(result.error.message), result.error)
      if (method === 'eth_getBlockByNumber' && window.__nextV3DifferentFork && result.result) {
        return { ...result.result, hash: '0x' + '00'.repeat(32) }
      }
      if (forceRevert) window.__nextV3RevertedHash = result.result
      return result.result
    },
  }
  if (announceProvider) {
    const announce = () =>
      window.dispatchEvent(
        new CustomEvent('eip6963:announceProvider', {
          detail: {
            info: {
              uuid: '350670db-19fa-4704-a166-e52e0cd7860d',
              name: 'MetaMask',
              rdns: 'io.metamask',
              icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
            },
            provider: window.ethereum,
          },
        }),
      )
    window.addEventListener('eip6963:requestProvider', announce)
    announce()
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
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      for (const arg of message.params.args) {
        if (arg.subtype === 'error' && arg.description) {
          exceptions.push(arg.description.split('\n')[0])
        }
      }
    }
    const command = commands.get(message.id)
    if (!command) return
    commands.delete(message.id)
    clearTimeout(command.timer)
    if (message.error) command.reject(new Error(message.error.message))
    else command.resolve(message.result)
  })
  function command(method, params = {}, timeout = 8_000) {
    const id = ++serial
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        commands.delete(id)
        reject(new Error('Chrome did not answer ' + method))
      }, timeout)
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
  const cronUrl = base + '/api/v3/replenish'
  const tick = () =>
    fetch(cronUrl, { headers: { Authorization: 'Bearer ' + secret } }).then((response) => {
      assert.equal(response.status, 200)
      return response.json()
    })
  if (secret) {
    assert.equal((await fetch(cronUrl)).status, 401)
    // The build leaves Anvil idle. Use a fresh block for the first 90-second
    // purchase deadline so runner build time does not make the quote stale.
    await rpc('evm_mine')
    const first = await tick()
    assert.ok(
      first.results.some((job) => job.poolId === String(fixture.poolId) && job.status === 'confirmed'),
      'The first isolated purchase must confirm: ' + JSON.stringify(first.results),
    )
    const repeated = await tick()
    assert.ok(repeated.results.every((job) => job.status !== 'confirmed'))
    console.log('PASS local cron authorization, receipt verification and duplicate delivery')
  }
  const listener = createServer().listen(0, '127.0.0.1')
  await once(listener, 'listening')
  const { port } = listener.address()
  await new Promise((resolve, reject) => listener.close((error) => (error ? reject(error) : resolve())))
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'coincollect-v3-chrome-'))
  const browser = spawn(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--disable-background-networking',
      '--disable-dev-shm-usage',
      '--remote-debugging-address=127.0.0.1',
      '--remote-debugging-port=' + port,
      '--user-data-dir=' + profile,
      '--no-sandbox',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  let chromeLog = ''
  browser.stderr.setEncoding('utf8').on('data', (chunk) => {
    chromeLog = (chromeLog + chunk).slice(-3000)
  })
  const browserClosed = once(browser, 'close').catch(() => undefined)
  let worker
  let browserError
  browser.on('error', (error) => {
    browserError = error
  })
  let cdp
  try {
    const deadline = Date.now() + 45_000
    let target
    while (!target) {
      if (browserError) throw browserError
      if (browser.exitCode !== null || browser.signalCode !== null || Date.now() >= deadline) {
        throw new Error('Chrome did not expose a DevTools page.\n' + chromeLog)
      }
      const pages = await fetch('http://127.0.0.1:' + port + '/json/list', {
        signal: AbortSignal.timeout(1_000),
      }).then((response) => response.json()).catch(() => [])
      target = Array.isArray(pages) && pages.find(({ type }) => type === 'page')
      if (!target) await delay(100)
    }
    cdp = await connect(target.webSocketDebuggerUrl)
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
        text: (document.querySelector('main') ?? document.body)?.innerText.slice(-2400),
        scripts: document.scripts.length,
        visibility: document.visibilityState,
        route: location.pathname,
        ethereum: Boolean(window.ethereum),
      })).catch((error) => ({ expressionError: error.message }))
      throw new Error(
        'Browser did not reach ' + label + '\n' + JSON.stringify({ ...evidence, errors: cdp.exceptions.slice(-8) }),
      )
    }
    const visit = async (route, account, announceProvider = false, chainId = '0x7a69') => {
      if (injection) await command('Page.removeScriptToEvaluateOnNewDocument', { identifier: injection })
      injection = undefined
      if (account) {
        const expression =
          '(' + injectedWallet.toString() + ')(...' + JSON.stringify([account, rpcUrl, announceProvider, chainId]) + ')'
        injection = (await command('Page.addScriptToEvaluateOnNewDocument', { source: expression })).identifier
      }
      await command('Page.navigate', { url: base + route }, 45_000)
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
    const editPoolName = async (name) => {
      await wait('FarmCard name editor', () => {
        const card = document.querySelector('[aria-label="Editable FarmCard"]')
        if (card?.querySelector('input[name="pool-name"]')) return true
        const button = card?.querySelector('button[aria-label="Edit pool name"]')
        if (button && !button.disabled) button.click()
        return false
      })
      await field('pool-name', name)
      await evalPage(() => {
        const input = document.querySelector('input[name="pool-name"]')
        if (!input) throw new Error('The FarmCard name editor closed before confirmation.')
        input.focus()
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      })
      await wait('FarmCard name saved', (expected) =>
        document.querySelector('[aria-label="Editable FarmCard"] article h3')?.textContent.includes(expected),
      name)
    }

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
    await visit('/swap')
    await has('Swap')
    await wait('swap amount input', () => Boolean(document.querySelector('input[inputmode="decimal"]')))
    const rpcRead = await evalPage(async () => {
      const result = await fetch('/api/rpc/polygon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 'isolated', method: 'eth_chainId', params: [] }),
      })
      return [result.status, result.headers.get('Content-Type'), await result.json()]
    })
    assert.equal(rpcRead[0], 200)
    assert.match(rpcRead[1], /^application\/json/)
    assert.deepEqual(rpcRead[2], { jsonrpc: '2.0', id: 'isolated', result: '0x7a69' })
    console.log('PASS same-origin Polygon RPC returns a correlated JSON read from the isolated chain')
    if (process.env.V3_BROWSER_SENTRY_PROBE && process.env.V3_BROWSER_SENTRY_URL) {
      await wait('initialised production Sentry browser client', () => {
        const carrier = window.__SENTRY__
        const client = carrier?.[carrier.version]?.defaultCurrentScope?.getClient()
        return client?.getOptions().environment === 'production'
      })
      const flushed = await evalPage(async (probe) => {
        const carrier = window.__SENTRY__
        const scope = carrier[carrier.version].defaultCurrentScope
        scope.captureException(Object.assign(new Error(probe + '-rejected'), { code: 4001 }))
        scope.captureException(new Error(probe + '-expected'))
        return scope.getClient().flush(5000)
      }, process.env.V3_BROWSER_SENTRY_PROBE)
      assert.ok(flushed, 'Sentry did not flush the browser probe')
      const response = await fetch(local(process.env.V3_BROWSER_SENTRY_URL) + '/probe', {
        signal: AbortSignal.timeout(3000),
      })
      assert.ok(response.ok)
      assert.deepEqual(await response.json(), [process.env.V3_BROWSER_SENTRY_PROBE + '-expected'])
      console.log('PASS production Sentry sends an application exception and discards a rejected wallet request')
    }
    await visit('/liquidity')
    await has('Connect to a wallet to view your liquidity.')
    await visit('/add')
    await has('Add Liquidity')
    await visit('/nfts/collections')
    await has('Stake community NFTs for FREE income streams')
    await wait('community collections link', () =>
      Boolean(document.querySelector('a[href="/nftpools/community-collections"]')),
    )
    console.log('PASS disconnected Swap, Liquidity, Add Liquidity and NFT Collections routes')

    await visit('/nftpools')
    for (const [width, height, mobile] of [[1200, 900, false], [390, 844, true]]) {
      await viewport(width, height, mobile)
      const point = await wait('wallet button visible clear of the local fork notice', () => {
        const button = [...document.querySelectorAll('nav button')].find(
          (candidate) => candidate.textContent.trim() === 'Connect Wallet',
        )
        if (!button) return false
        const { left, top, width, height } = button.getBoundingClientRect()
        const x = left + width / 2
        const y = top + height / 2
        return button.contains(document.elementFromPoint(x, y)) ? { x, y } : false
      })
      // A server-rendered header may be visible before React installs its click handler.
      for (let attempt = 0; attempt < 10; attempt++) {
        if (await evalPage(() => Boolean(document.querySelector('dialog[open]')))) break
        await command('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
        await command('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
        await delay(250)
      }
      await has('Connect a browser wallet')
      await click('dialog button', 'Close')
      console.log(`PASS ${width}px local fork header opens the wallet picker by pointer`)
    }
    await viewport(1200, 900)
    await wait('disconnected FarmCard CTA', () => {
      const card = [...document.querySelectorAll('article')].find(
        (item) => item.querySelector('h3')?.textContent === 'V3 Browser Fixture',
      )
      return [...(card?.querySelectorAll('button') ?? [])].some(
        (button) => button.textContent.trim() === 'Connect Wallet',
      )
    })

    for (const [route, selector] of [
      ['/swap', '#swap-currency-output .open-currency-select-button'],
      ['/add', '#add-liquidity-input-tokenb .open-currency-select-button'],
    ]) {
      await visit(route, fixture.participant)
      await wait('token selector on ' + route, (target) => {
        const button = document.querySelector(target)
        if (!button || button.disabled) return false
        button.click()
        return true
      }, selector)
      await has('Select a Token')
      await wait('token search input on ' + route, () => Boolean(document.querySelector('#token-search-input')))
    }
    await visit('/liquidity', fixture.participant)
    await has('Your Liquidity')
    await has('No liquidity found.')
    await visit('/nfts/collections', fixture.participant)
    await has('Stake community NFTs for FREE income streams')
    console.log('PASS connected Swap and Add Liquidity token search, Liquidity positions and NFT Collections')
    await visit('/nfts/profile/' + fixture.participant.toLowerCase(), fixture.participant)
    await wait('connected profile inventory and rewards filters', () => {
      const labels = [...document.querySelectorAll('button')].map((button) => button.textContent.trim())
      return labels.some((label) => /^NFTs\s*\(\d+\)$/.test(label)) &&
        labels.some((label) => /^Rewards\s*\(\d+\)$/.test(label))
    })
    console.log('PASS connected NFT profile renders the wallet inventory and rewards controls')

    const walletNonceBeforeSwitch = await rpc('eth_getTransactionCount', [fixture.participant, 'latest'])
    await visit('/nftpools/v3/' + fixture.poolId, fixture.participant, false, '0x1')
    await has('Switch to the settlement network to send transactions.')
    await click('button', 'Switch network')
    await wait('wallet switches to the local settlement chain', async () =>
      (await window.ethereum.request({ method: 'eth_chainId' })) === '0x7a69' &&
      !document.body.innerText.includes('Switch to the settlement network to send transactions.'),
    )
    assert.equal(await rpc('eth_getTransactionCount', [fixture.participant, 'latest']), walletNonceBeforeSwitch)
    console.log('PASS a wrong-network wallet switches to the isolated chain without submitting a transaction')

    await visit('/nftpools', fixture.participant)
    await has('Staked only')
    await has('Finished')
    await has('V3 Browser Fixture')
    await wait('one chip in the reward ticker', () => {
      const card = [...document.querySelectorAll('article')].find(
        (item) => item.querySelector('h3')?.textContent === 'V3 Browser Fixture',
      )
      return card?.querySelector('[data-testid="nft-pool-reward-ticker"]')?.firstElementChild?.children.length === 1
    })
    await wait('shared card details', () => {
      const card = [...document.querySelectorAll('article')].find(
        (item) => item.querySelector('h3')?.textContent === 'V3 Browser Fixture',
      )
      const toggle = [...(card?.querySelectorAll('button') ?? [])].find(
        (button) => button.textContent.trim() === 'Details',
      )
      if (!toggle) return false
      toggle.click()
      return true
    })
    await has('Total staked')
    await has('Pool ends')
    await wait('connected shared stake button', () => {
      const card = [...document.querySelectorAll('article')].find(
        (item) => item.querySelector('h3')?.textContent === 'V3 Browser Fixture',
      )
      const stake = [...(card?.querySelectorAll('button') ?? [])].find(
        (button) => button.textContent.trim() === 'Click to Stake Now' && !button.disabled,
      )
      if (!stake) return false
      stake.focus()
      stake.click()
      return true
    })
    await wait(
      'stake picker opens over the catalogue',
      () => location.pathname === '/nftpools' && !!document.querySelector('dialog[open]'),
    )
    await command('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
    })
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
    await wait(
      'Escape closes the picker and returns focus',
      () => !document.querySelector('dialog') && document.activeElement?.textContent.trim() === 'Click to Stake Now',
    )
    await click('article button', 'Click to Stake Now')
    await wait('reopen the stake picker', () => !!document.querySelector('dialog[open]'))
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: 8, y: 8, button: 'left', clickCount: 1 })
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 8, y: 8, button: 'left', clickCount: 1 })
    await wait('backdrop dismisses the stake picker', () => !document.querySelector('dialog'))
    await click('article button', 'Click to Stake Now')
    await has('Selected NFTs')
    const selectNft = (id) =>
      wait(
        'eligible NFT tile',
        (id) => {
          const option = Array.from(document.querySelectorAll('dialog[open] button[aria-pressed]')).find((button) =>
            button.getAttribute('aria-label').endsWith('#' + id),
          )
          if (!option || option.disabled) return false
          option.click()
          return true
        },
        String(id),
      )
    await selectNft(fixture.tokenId)
    await has('Estimated next 24 hours')
    const beforeRejection = await rpc('eth_getTransactionCount', [fixture.participant, 'latest'])
    await evalPage(() => {
      window.__nextV3WalletError = { message: 'User rejected the request.', code: 4001 }
    })
    await click('dialog button', 'Confirm')
    await wait('wallet rejection is visible', () => /user (rejected|denied)/i.test(document.body.innerText))
    assert.equal(await rpc('eth_getTransactionCount', [fixture.participant, 'latest']), beforeRejection)
    await visit('/nftpools', fixture.participant)
    await click('article button', 'Click to Stake Now')
    await selectNft(fixture.tokenId)
    await evalPage(() => {
      window.__nextV3WalletError = { message: 'Wallet provider disconnected.', code: 4900 }
    })
    await click('dialog button', 'Confirm')
    await wait('wallet disconnect is visible', () => /(?:provider|wallet)(?: is)? disconnected/i.test(document.body.innerText))
    assert.equal(await rpc('eth_getTransactionCount', [fixture.participant, 'latest']), beforeRejection)
    await visit('/nftpools', fixture.participant)
    await click('article button', 'Click to Stake Now')
    await selectNft(fixture.tokenId)
    await click('dialog button', 'Confirm')
    await has('Confirmed on the settlement network.')
    await has('STAKED NFT COUNT')
    console.log('PASS rejected requests and disconnected wallets leave positions untouched and permit retry')
    await command('Page.reload')
    await has('STAKED NFT COUNT')
    console.log('PASS wallet reconnects to the existing position after page reload')
    await has('Stake More')
    await has('Unstake')
    await click('article button', 'Stake More')
    await wait(
      'stake more opens the same picker',
      () => document.querySelector('dialog[open]')?.getAttribute('aria-label') === 'Select NFTs to Stake',
    )
    await click('dialog button', 'Cancel')
    assert.equal(await ownerOf(), '0x' + pad(fixture.participant).toLowerCase())
    assert.equal(
      await rpc('eth_call', [{ to: fixture.nft, data: '0x081812fc' + tokenId }, 'latest']),
      '0x' + '0'.repeat(64),
    )
    assert.equal(
      await rpc('eth_call', [
        { to: fixture.nft, data: '0xe985e9c5' + pad(fixture.participant) + pad(fixture.ledger) },
        'latest',
      ]),
      '0x' + '0'.repeat(64),
    )

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
    await wait(
      'upper-right pool detail link',
      (path) => {
        const link = document.querySelector('article a[aria-label="Open pool page"]')
        if (link?.getAttribute('href') !== path) return false
        link.click()
        return true
      },
      poolPath,
    )
    await wait('pool detail route', (path) => location.pathname === path, poolPath)
    await has(['3.2', '3.3', '3.4', '3.6'].includes(fixture.version) ? 'Reconcile recorded owner' : 'No wallet positions in the records on this page.')
    await viewport(390, 844, true)
    const ownerBalance = await tokenBalance(fixture.operator)
    await visit(poolPath, fixture.operator)
    await click('article button', 'Unstake')
    await wait(
      'unstake picker on mobile',
      () => document.querySelector('dialog[open]')?.getAttribute('aria-label') === 'Select NFTs to UnStake',
    )
    await selectNft(fixture.tokenId)
    await click('dialog button', 'Unstake & Harvest')
    await has('Confirmed on the settlement network.')
    await has('No active participation')
    assert.equal(await ownerOf(), '0x' + pad(fixture.operator).toLowerCase())
    assert.ok((await tokenBalance(fixture.operator)) > ownerBalance)
    assert.ok(await evalPage(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    console.log('PASS shared FarmCard modals, keyboard focus, detail link, non-custodial join and mobile exit')

    const openStudio = async (wallet = fixture.operator) => {
      await visit('/admin/nft-pools/v3', wallet, true)
      await has('Pool Studio V3')
      await wait('Studio wallet connection', () => {
        if (
          document.querySelector('[aria-label="V3 pool dashboard"]') ||
          [...document.querySelectorAll('button')].some((button) => button.textContent.trim() === 'Treasury')
        )
          return true
        const connect = [...document.querySelectorAll('section[aria-label="Pool Studio V3"] button')].find(
          (button) => button.textContent.trim() === 'Connect Wallet',
        )
        if (!connect) return false
        connect.click()
        return 'modal'
      }).then(async (connection) => {
        if (connection !== 'modal') return
        await wait('announced Studio wallet', () => {
          const localWallet = [...document.querySelectorAll('dialog[open] button')].find(
            (button) => ['MetaMask', 'Injected'].includes(button.textContent.trim()) && !button.disabled,
          )
          if (localWallet) {
            localWallet.click()
            return true
          }
          function findWallet(root) {
            for (const element of root.querySelectorAll('*')) {
              if (element.localName === 'wui-list-wallet' && ['MetaMask', 'Browser Wallet'].includes(element.name))
                return element
              const nested = element.shadowRoot && findWallet(element.shadowRoot)
              if (nested) return nested
            }
            return null
          }
          const root = document.querySelector('w3m-modal')?.shadowRoot
          const wallet = root && findWallet(root)
          if (!wallet) return false
          wallet.click()
          return true
        })
      })
    }
    await viewport(1280, 900)
    await openStudio()
    await wait('verified existing pool in Studio', () =>
      Boolean(document.querySelector('[aria-label="Manage V3 Browser Fixture"]')),
    )
    await click('section[aria-label="V3 pool dashboard"] button', 'Upcoming')
    await has('No matching pools on this page')
    await click('section[aria-label="V3 pool dashboard"] button', 'Live')
    await click('button[aria-label="Manage V3 Browser Fixture"]', 'Manage')
    await has('Manage pool #1')
    await wait('FarmCard preview', () => Boolean(document.querySelector('[aria-label="FarmCard preview"] article')))
    await click('button', 'Hide preview')
    await wait('preview collapses', () => !document.querySelector('[aria-label="FarmCard preview"]'))
    await click('button', 'Preview FarmCard')
    await wait('preview reopens', () => Boolean(document.querySelector('[aria-label="FarmCard preview"] article')))
    await click('button', 'Back to pools')
    await click('button', 'New pool')
    await evalPage(() => document.querySelector('input[name="funding-source"][value="wallet"]')?.click())
    await editPoolName('Studio acceptance pool')
    await wait('editable collection avatar', () => {
      const button = document.querySelector('article button[aria-label="Edit NFT collections"]')
      if (!button) return false
      button.click()
      return true
    })
    if (fixture.managed?.plainCollection) {
      await field('collection-address', fixture.managed.plainCollection)
      await click('dialog button', 'Add collection')
      await has('This ERC-1155 collection needs a registered CoinCollect adapter and a bound transfer hook.')
      assert.ok(await evalPage(() => document.querySelector('[name="collection-address"]').getAttribute('aria-invalid') === 'true'))
      await field('collection-address', fixture.managed.collection)
      await click('dialog button', 'Add collection')
      await has('ERC-1155 · bound transfer hook')
      await click('dialog button', 'Remove collection')
      console.log('PASS Studio rejects plain ERC-1155 and verifies a bound adapter')
    }
    await field('collection-address', fixture.nft)
    await click('dialog button', 'Add collection')
    await has('Polygon ERC-721 · direct ownership check')
    await click('dialog button', 'Done')
    await wait('collections dialog closes', () => !document.querySelector('dialog'))
    await click('article button', 'Set funding budget')
    await click('dialog button', 'V3R')
    await field('funding-budget', '12')
    await click('dialog button', 'Done')
    await wait('budget dialog closes', () => !document.querySelector('dialog'))
    await wait('editable schedule badge', () => {
      const button = document.querySelector('article button[aria-label="Edit reward schedule"]')
      if (!button) return false
      button.click()
      return true
    })
    await click('dialog button', 'In 1 hour')
    await click('dialog button', 'Done')
    await wait('schedule dialog closes', () => !document.querySelector('dialog'))
    await click('button', 'Review pool plan')
    await has('Review funding and rewards')
    await click('button', 'Create V3 pool')
    await has('Reward budget · Pool #')
    await has('Fund 12 POL')
    const payment = (method) =>
      wait(
        'payment method ' + method,
        (value) => {
          const option = document.querySelector('input[name="funding-method"][value="' + value + '"]')
          if (!option || option.disabled) return false
          option.click()
          return true
        },
        method,
      )
    await wait(
      'native POL is preselected',
      () => document.querySelector('input[name="funding-method"][value="native"]')?.checked,
    )
    await payment('token')
    await has('Your V3R balance is too low. Choose POL above to fund this pool.')
    await wait('insufficient wrapped balance prevents a deposit and approval', () =>
      [...document.querySelectorAll('form[aria-label="Deposit reward budget"] button')].some(
        (button) => button.textContent.trim() === 'Fund 12 V3R' && button.disabled,
      ),
    )
    await payment('native')
    await click('form[aria-label="Deposit reward budget"] summary', 'Change deposit amount')
    await field('deposit-amount', '4')
    await click('button', 'Fund 4 POL')
    await has('Budget partially deposited')
    const tokenAbi = parseAbi([
      'function deposit() payable',
      'function allowance(address owner, address spender) view returns (uint256)',
    ])
    const readAllowance = async () =>
      BigInt(
        await rpc('eth_call', [
          {
            to: fixture.token,
            data: encodeFunctionData({
              abi: tokenAbi,
              functionName: 'allowance',
              args: [fixture.operator, fixture.ledger],
            }),
          },
          'latest',
        ]),
      )
    assert.equal(await readAllowance(), 0n, 'Native POL funding must not request an ERC-20 allowance')
    const wrap = await rpc('eth_sendTransaction', [
      {
        from: fixture.operator,
        to: fixture.token,
        data: encodeFunctionData({ abi: tokenAbi, functionName: 'deposit' }),
        value: toHex(parseEther('8')),
      },
    ])
    assert.equal((await minedReceipt(wrap, 'Fund the ERC-20 fixture')).status, '0x1')
    await evalPage(() => document.dispatchEvent(new Event('visibilitychange')))
    await payment('token')
    await has('Confirm V3R spending permission first, then confirm the deposit.')
    await click('button', 'Fund 8 V3R')
    await has('Budget fully deposited')
    assert.equal(await readAllowance(), 0n, 'The exact allowance must be spent by the token deposit')
    console.log('PASS visible POL/WPOL choice, zero WPOL guard, and native plus approved ERC-20 deposits')
    if (secret) {
      worker = spawn(process.execPath, [path.join(__dirname, 'run-v3-local-automation.cjs')], {
        env: { ...process.env, CRON_SECRET: secret, V3_LOCAL_PREVIEW: base },
        stdio: 'ignore',
      })
      const abi = parseAbi([
        'function rewardState(uint256,address) view returns (uint128 cap,uint128 inventory,uint256 committed)',
      ])
      const calldata = encodeFunctionData({
        abi,
        functionName: 'rewardState',
        args: [BigInt(fixture.poolId + 1), fixture.token],
      })
      let inventory = BigInt(0)
      for (let tries = 0; tries < 100 && inventory === BigInt(0); tries++) {
        const data = await rpc('eth_call', [{ to: fixture.ledger, data: calldata }, 'latest'])
        const [, reserve] = decodeFunctionResult({ abi, functionName: 'rewardState', data })
        inventory = reserve
        if (inventory === BigInt(0)) await delay(150)
      }
      assert.ok(inventory > BigInt(0), 'Worker must fund reward inventory without a manual replenish action')
      worker.kill()
      console.log('PASS single budget action with approval and deposit, followed by automatic reserve funding')
    }
    const blockBeforeEdit = await rpc('eth_blockNumber')
    await click('button', 'Edit presentation')
    await field('presentation-name', 'Studio acceptance pool updated')
    await field('presentation-artwork-choice', '/images/poolBanners/15.webp')
    await field('presentation-description', 'Presentation only. Ledger unchanged.')
    await wait(
      'presentation changes in preview',
      () =>
        document.querySelector('[aria-label="FarmCard preview"] article h3')?.innerText ===
        'Studio acceptance pool updated',
    )
    await click('button', 'Save presentation')
    await has('Presentation saved. The local catalogue uses the updated FarmCard.')
    assert.equal(await rpc('eth_blockNumber'), blockBeforeEdit, 'A presentation change must not send a transaction')
    await click('a', 'View public pool')
    await has('Studio acceptance pool updated')
    await evalPage(() => localStorage.clear())
    await visit('/nftpools/v3', fixture.participant)
    await has('Studio acceptance pool updated')
    assert.ok(
      await evalPage(() =>
        [...document.querySelectorAll('article')].some(
          (card) =>
            card.querySelector('h3')?.textContent === 'Studio acceptance pool updated' &&
            card.querySelector('img[src*="15.webp"]'),
        ),
      ),
    )
    const batchAbi = parseAbi([
      'function mint(address owner, uint256 tokenId)',
      'function deposit() payable',
      'function approve(address spender, uint256 amount) returns (bool)',
      'function poolCount() view returns (uint256)',
      'function observe(address input,address output)',
      'function createPool((uint64 start,uint64 end,uint16 threshold,uint16 maxWallets,uint16 maxNftsPerWallet,string metadataURI) config,(uint256 sourceChainId,address collection,uint32 weight)[] collections,(address token,uint128 cap)[] rewards) returns (uint256)',
      'function fundReward(uint256 poolId,address token,uint128 amount)',
      'function nftKey(uint256 sourceChainId,address collection,uint256 tokenId) view returns (bytes32)',
      'function walletsNftCount(uint256 poolId,address account) view returns (uint256)',
      'function positionState(uint256 poolId,bytes32 key) view returns ((uint256 sourceChainId,address collection,uint32 weight,uint256 tokenId,address seatOwner,uint64 seatExpiry))',
      'function rewardState(uint256 poolId,address token) view returns ((uint128 cap,uint128 inventory,uint256 committed))',
      'function rewardSettlement(uint256 poolId,address token) view returns (uint256 claimLiability,uint128 expiredRecovered)',
      'function safeTransferFrom(address from,address to,uint256 id,uint256 amount,bytes data)',
      'function positionId(uint256 poolId,uint256 id,address account,bool released) view returns (uint256)',
      'function positions(uint256 id) view returns (uint128 entitled,uint32 active)',
      'function populate(address ledger,uint256 pool,address collection,uint256 first,uint256 wallets,uint256 perWallet)',
      'function join(uint256 poolId,uint256 sourceChainId,address collection,uint256 tokenId)',
      'event Claimed(uint256 indexed poolId,bytes32 indexed nft,address indexed token,address owner,uint256 amount)',
    ])
    const sendFixture = async (to, functionName, args = [], value, from = fixture.operator) => {
      const data = encodeFunctionData({ abi: batchAbi, functionName, args })
      const hash = await rpc('eth_sendTransaction', [{ from, to, data, value, gas: '0x7a1200' }])
      assert.equal((await minedReceipt(hash, functionName)).status, '0x1', functionName)
    }
    const readBatchPool = async (functionName, args = []) => {
      const calldata = encodeFunctionData({ abi: batchAbi, functionName, args })
      const data = await rpc('eth_call', [{ to: fixture.ledger, data: calldata }, 'latest'])
      return decodeFunctionResult({ abi: batchAbi, functionName, data })
    }
    const batchIds = [41n, 42n, 43n]
    for (const id of batchIds) await sendFixture(fixture.nft, 'mint', [fixture.participant, id])
    const deposit = parseEther('12')
    await sendFixture(fixture.token, 'deposit', [], toHex(deposit))
    await sendFixture(fixture.token, 'approve', [fixture.ledger, deposit])
    const block = await rpc('eth_getBlockByNumber', ['latest', false])
    const start = BigInt(block.timestamp) + 60n
    const end = start + 3600n
    const uri =
      'data:application/json;base64,' +
      Buffer.from(JSON.stringify({ name: 'Harvest-all acceptance', description: '' })).toString('base64')
    await sendFixture(fixture.ledger, 'createPool', [
      { start, end, threshold: 1, maxWallets: 8, maxNftsPerWallet: 4, metadataURI: uri },
      [{ sourceChainId: 137n, collection: fixture.nft, weight: 1 }],
      [{ token: fixture.token, cap: deposit }],
    ])
    const batchId = await readBatchPool('poolCount')
    await sendFixture(fixture.ledger, 'fundReward', [batchId, fixture.token, deposit])
    await rpc('evm_setNextBlockTimestamp', [Number(start)])
    await rpc('evm_mine')
    await visit('/nftpools/v3/' + batchId, fixture.participant)
    await click('article button', 'Click to Stake Now')
    for (const id of batchIds) await selectNft(id)
    await click('dialog button', 'Confirm')
    await has('Confirmed on the settlement network.')
    assert.equal(await readBatchPool('walletsNftCount', [batchId, fixture.participant]), 3n)
    await rpc('evm_increaseTime', [180])
    await rpc('evm_mine')
    await visit('/nftpools/v3/' + batchId, fixture.participant)
    const keys = await Promise.all(batchIds.map((id) => readBatchPool('nftKey', [137n, fixture.nft, id])))
    const claimTopics = encodeEventTopics({ abi: batchAbi, eventName: 'Claimed', args: { poolId: batchId } })
    const claimsSince = (before) =>
      rpc('eth_getLogs', [
        {
          address: fixture.ledger,
          topics: claimTopics,
          fromBlock: toHex(BigInt(before) + 1n),
          toBlock: 'latest',
        },
      ])
    const beforeHarvest = await rpc('eth_blockNumber')
    await click('article button', 'Harvest')
    await has('3 of 3 transactions confirmed on the settlement network.')
    assert.equal(await evalPage(() => document.querySelector('dialog[open]') === null), true)
    const harvestClaims = await claimsSince(beforeHarvest)
    assert.deepEqual(harvestClaims.map(({ topics }) => topics[2]).sort(), [...keys].sort())
    assert.equal(new Set(harvestClaims.map(({ transactionHash }) => transactionHash)).size, 3)
    assert.equal(await readBatchPool('walletsNftCount', [batchId, fixture.participant]), 3n)
    await rpc('evm_increaseTime', [180])
    await rpc('evm_mine')
    const beforeExit = await rpc('eth_blockNumber')
    await click('article button', 'Unstake')
    await selectNft(batchIds[0])
    await selectNft(batchIds[2])
    await has('2 NFTs selected')
    await click('dialog button', 'Unstake & Harvest')
    await has('2 of 2 transactions confirmed on the settlement network.')
    await wait('selective Unstake dialog closes', () => document.querySelector('dialog[open]') === null)
    const exitClaims = await claimsSince(beforeExit)
    assert.deepEqual(exitClaims.map(({ topics }) => topics[2]).sort(), [keys[0], keys[2]].sort())
    assert.equal(new Set(exitClaims.map(({ transactionHash }) => transactionHash)).size, 2)
    const seats = await Promise.all(keys.map((key) => readBatchPool('positionState', [batchId, key])))
    assert.equal(seats[0].seatOwner, '0x' + '0'.repeat(40))
    assert.equal(seats[1].seatOwner.toLowerCase(), fixture.participant.toLowerCase())
    assert.equal(seats[2].seatOwner, '0x' + '0'.repeat(40))
    for (const id of batchIds) {
      const result = await rpc('eth_call', [{ to: fixture.nft, data: '0x6352211e' + pad(toHex(id)) }, 'latest'])
      assert.equal(result, '0x' + pad(fixture.participant).toLowerCase())
    }
    console.log('PASS Harvest claims all three NFTs, and selective Unstake pays and exits only two NFTs')
    await rpc('evm_setNextBlockTimestamp', [Number(end + 12n * 86400n)])
    await rpc('evm_mine')
    await visit('/nftpools/v3/' + batchId, fixture.participant)
    await has('18 days left to claim')
    await wait('Harvest stays available during the claim window', () =>
      [...document.querySelectorAll('article button')].some(
        (button) => button.textContent.trim() === 'Harvest' && !button.disabled,
      ),
    )
    const [liability] = await readBatchPool('rewardSettlement', [batchId, fixture.token])
    assert.ok(liability > 0n)
    if (secret) {
      const early = await tick()
      assert.ok(early.results.every((job) => job.poolId !== String(batchId) || job.action !== 'treasury-recovery'))
    }
    await rpc('evm_setNextBlockTimestamp', [Number(end + 30n * 86400n)])
    await rpc('evm_mine')
    await visit('/nftpools/v3/' + batchId, fixture.participant)
    await has('Claim period ended')
    await wait('expired harvest is disabled', () =>
      [...document.querySelectorAll('article button')].some(
        (button) => button.textContent.trim() === 'Harvest closed' && button.disabled,
      ),
    )
    await openStudio()
    await click('button[aria-label="Manage Harvest-all acceptance"]', 'Manage')
    await has('Claims and treasury settlement')
    await has('awaiting treasury recovery')
    const { inventory } = await readBatchPool('rewardState', [batchId, fixture.token])
    assert.ok(inventory > 0n)
    if (secret) {
      const settled = await tick()
      assert.ok(
        settled.results.some(
          (job) => job.poolId === String(batchId) && job.action === 'treasury-recovery' && job.status === 'confirmed',
        ),
      )
      const repeated = await tick()
      assert.ok(repeated.results.every((job) => job.poolId !== String(batchId) || job.status !== 'confirmed'))
      await openStudio()
      await click('button[aria-label="Manage Harvest-all acceptance"]', 'Manage')
    } else {
      await click('button', 'Recover V3R to treasury')
    }
    await has('recovered to treasury')
    assert.deepEqual(await readBatchPool('rewardSettlement', [batchId, fixture.token]), [0n, inventory])
    assert.equal((await readBatchPool('rewardState', [batchId, fixture.token])).inventory, 0n)
    console.log('PASS V3 claim countdown, disabled expired Harvest, Studio liabilities and treasury recovery')
    if (fixture.treasuryVault) {
      const vaultAbi = parseAbi([
        'function balance(address token) view returns ((uint256 available,uint256 deposited,uint256 allocated,uint256 spent,uint256 fundingReturned,uint256 rewardsReturned,uint256 withdrawn))',
      ])
      const available = async () => {
        const data = await rpc('eth_call', [
          {
            to: fixture.treasuryVault,
            data: encodeFunctionData({ abi: vaultAbi, functionName: 'balance', args: [fixture.token] }),
          },
          'latest',
        ])
        return decodeFunctionResult({ abi: vaultAbi, functionName: 'balance', data })
      }
      await openStudio(fixture.treasury)
      await click('button', 'Treasury')
      await has('Central Treasury')
      await field('treasury-amount', '100')
      assert.ok(
        await evalPage(() => {
          const input = document.querySelector('[name="treasury-native"]')
          if (!input) return false
          input.click()
          return input.checked
        }),
      )
      await click('form[aria-label="Manage available treasury assets"] button', 'Deposit')
      await has('Confirmed on the settlement network.')
      assert.equal((await available()).available, parseEther('100'))
      await openStudio()
      await click('button', 'New pool')
      await editPoolName('Treasury lifetime pool')
      await wait('Treasury pool collection editor', () => {
        const entry = document.querySelector('article button[aria-label="Edit NFT collections"]')
        if (!entry) return false
        entry.click()
        return true
      })
      await field('collection-address', fixture.nft)
      await click('dialog button', 'Add collection')
      await has('Polygon ERC-721 · direct ownership check')
      await click('dialog button', 'Done')
      await wait('Treasury pool collections saved', () => !document.querySelector('dialog'))
      await click('article button', 'Set funding budget')
      await click('dialog button', 'V3R')
      await field('funding-budget', '10')
      await click('dialog button', 'Done')
      await wait('Treasury pool budget saved', () => !document.querySelector('dialog'))
      await wait('Treasury schedule editor', () => {
        const entry = document.querySelector('article button[aria-label="Edit reward schedule"]')
        if (!entry) return false
        entry.click()
        return true
      })
      await click('dialog button', 'In 1 hour')
      await field('duration-days', '365')
      await click('dialog button', 'Done')
      await wait('Treasury schedule saved', () => !document.querySelector('dialog'))
      await wait('Treasury is the default funding source', () =>
        document.querySelector('input[name="funding-source"][value="treasury"]')?.checked,
      )
      await click('button', 'Review pool plan')
      await has('Lifetime purchase minimum')
      await has('Economic preflight')
      await has('Lifetime reward share by participation')
      await has('One purchase per reward asset')
      await click('button', 'Create pool and reserve 10 V3R from Treasury')
      await has('Treasury budget fully reserved')
      const reserved = await available()
      assert.equal(reserved.available, parseEther('90'))
      assert.equal(reserved.allocated, parseEther('10'))
      await openStudio(fixture.treasury)
      await click('button', 'Treasury')
      if (fixture.version === '3.6') await click('[role="tab"]', 'Withdraw')
      await field('treasury-amount', '20')
      await click('button', 'Withdraw available')
      await has('Confirmed on the settlement network.')
      assert.equal((await available()).available, parseEther('70'))
      if (secret) {
        const createdV31 = await readBatchPool('poolCount')
        let funding = await tick()
        for (
          let attempt = 0;
          attempt < 2 &&
          !funding.results.some((job) => job.poolId === String(createdV31) && job.status === 'confirmed');
          attempt++
        ) {
          await delay(1000)
          funding = await tick()
        }
        assert.ok(funding.results.some((job) => job.poolId === String(createdV31) && job.status === 'confirmed'))
        assert.equal((await available()).spent, parseEther('10'))
        assert.equal((await readBatchPool('rewardState', [createdV31, fixture.token])).inventory, parseEther('10'))
      }
      await viewport(390, 844, true)
      if (fixture.version === '3.6') await click('[role="tab"]', 'Pool reserves')
      await has('Reserved NFT claims')
      assert.ok(await evalPage(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
      console.log(
        'PASS V3.1 Treasury deposit, 365-day pool allocation, available withdrawal, automatic purchase and responsive dashboard',
      )
    }
    if (fixture.scaleFixture) {
      const scaleStart = BigInt((await rpc('eth_getBlockByNumber', ['latest', false])).timestamp) + 30n
      const scaleEnd = scaleStart + 86400n
      const reserve = parseEther('20')
      await sendFixture(fixture.token, 'deposit', [], toHex(reserve))
      await sendFixture(fixture.token, 'approve', [fixture.ledger, reserve])
      const scaleUri =
        'data:application/json;base64,' + Buffer.from(JSON.stringify({ name: 'Scalable NFT pool' })).toString('base64')
      await sendFixture(fixture.ledger, 'createPool', [
        {
          start: scaleStart,
          end: scaleEnd,
          threshold: 64,
          maxWallets: 1024,
          maxNftsPerWallet: 8,
          metadataURI: scaleUri,
        },
        [{ sourceChainId: 137n, collection: fixture.nft, weight: 2 }],
        [{ token: fixture.token, cap: reserve }],
      ])
      const scaleId = await readBatchPool('poolCount')
      await sendFixture(fixture.ledger, 'fundReward', [scaleId, fixture.token, reserve])
      await rpc('evm_setNextBlockTimestamp', [Number(scaleStart)])
      await rpc('evm_mine')
      let inserted = 0
      for (const size of [32, 128, 512, 1024]) {
        while (inserted < size) {
          await sendFixture(fixture.scaleFixture, 'populate', [
            fixture.ledger,
            scaleId,
            fixture.nft,
            BigInt(1000 + inserted),
            2n,
            8n,
          ])
          inserted += 16
        }
        const before = Date.now()
        await visit('/nftpools/v3/' + scaleId, fixture.participant)
        await wait(
          'render participants, NFT count and power at scale',
          (members) => {
            const stats = document.querySelector('[aria-label="Recorded pool participation"]')
            const values = [...(stats?.querySelectorAll('dd') ?? [])].map((value) => value.textContent.trim())
            return (
              values.join('|') ===
              [members / 8, members, members * 2].map((value) => value.toLocaleString('en-US')).join('|')
            )
          },
          size,
        )
        await click('article button', 'Click to Stake Now')
        await wait(
          'bounded NFT selection above the original pool limit',
          () => !!document.querySelector('dialog[open]'),
        )
        await click('dialog button', 'Cancel')
        assert.ok(await evalPage(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
        console.log(`PASS browser at ${size} active NFTs · counted and opened picker in ${Date.now() - before} ms`)
      }
      await sendFixture(fixture.nft, 'mint', [fixture.participant, 9_999n])
      await sendFixture(fixture.ledger, 'join', [scaleId, 137n, fixture.nft, 9_999n], undefined, fixture.participant)
      await rpc('evm_increaseTime', [120])
      await rpc('evm_mine')
      await visit('/nftpools/v3/' + scaleId, fixture.participant)
      await has('Estimated live earnings')
      await click('article button', 'Pause live estimate')
      await has('Last verified earnings')
      await click('article button', 'Harvest')
      await has('Confirmed on the settlement network.')
      console.log('PASS above 1,024 NFTs · verified reward receipt, live estimate and pause control')
    }
    if (fixture.managed) {
      const reserve = parseEther('10')
      const start = BigInt((await rpc('eth_getBlockByNumber', ['latest', false])).timestamp) + 180n
      const end = start + 3600n
      await sendFixture(fixture.token, 'deposit', [], toHex(reserve))
      await sendFixture(fixture.token, 'approve', [fixture.ledger, reserve])
      const uri = 'data:application/json;base64,' + Buffer.from(JSON.stringify({ name: 'Mixed NFT Rewards' })).toString('base64')
      await sendFixture(fixture.ledger, 'createPool', [
        { start, end, threshold: 1, maxWallets: 10, maxNftsPerWallet: 4, metadataURI: uri },
        [{ sourceChainId: 137n, collection: fixture.managed.adapter, weight: 3 }],
        [{ token: fixture.token, cap: reserve }],
      ])
      const poolId = await readBatchPool('poolCount')
      await sendFixture(fixture.ledger, 'fundReward', [poolId, fixture.token, reserve])
      await viewport(390, 844, true)
      await openStudio()
      await click('section[aria-label="V3 pool dashboard"] button', 'Upcoming')
      await click('button[aria-label="Manage Mixed NFT Rewards"]', 'Manage')
      await has('ERC-1155 quantity limits')
      await field('limit', '8')
      await click('button', 'Save limit')
      await has('Confirmed on the settlement network.')
      await rpc('evm_setNextBlockTimestamp', [Number(start)])
      await rpc('evm_mine')
      const route = '/nftpools/v3/' + poolId
      await visit(route, fixture.participant)
      await has('Polygon · ERC-1155')
      await field('managed-token-id', '25')
      await click('button', 'Check NFT')
      await has('10 owned · 0 participating')
      await has('Up to 8 active')
      await field('managed-quantity', '6')
      await click('button', 'Join with quantity')
      await has('10 owned · 6 participating · 18 power')
      await rpc('evm_increaseTime', [120])
      await rpc('evm_mine')
      await sendFixture(fixture.managed.collection, 'safeTransferFrom',
        [fixture.participant, fixture.operator, 25n, 2n, '0x'], undefined, fixture.participant)
      await visit(route, fixture.operator)
      await field('managed-token-id', '25')
      await click('button', 'Check NFT')
      await has('2 owned · 2 participating · 6 power')
      await field('managed-quantity', '1')
      await click('button', 'Exit quantity and release rewards')
      await has('2 owned · 1 participating · 3 power')
      await has('Released rewards')
      await click('article button', 'Harvest')
      await has('Confirmed on the settlement network.')
      assert.ok(await evalPage(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
      console.log('PASS managed mobile ERC-1155 unit cap, quantity join, partial transfer, partial exit and Harvest')
    }
    if (fixture.dynamic) {
      const dynamic = fixture.dynamic
      const treasuryAbi = parseAbi([
        'function balance(address token) view returns ((uint256 available,uint256 deposited,uint256 allocated,uint256 spent,uint256 fundingReturned,uint256 rewardsReturned,uint256 withdrawn))',
        'function paused() view returns (bool)',
        'function swapTotals(address token) view returns (uint256 swappedIn,uint256 swappedOut)',
        'function permitted(address token,uint8 permissions) view returns (bool)',
        'function observe(address input,address output)',
        'function rewardsOf(uint256 poolId) view returns (address[])',
      ])
      const read = async (to, functionName, args) => {
        const data = await rpc('eth_call', [{ to, data: encodeFunctionData({ abi: treasuryAbi, functionName, args }) }, 'latest'])
        return decodeFunctionResult({ abi: treasuryAbi, functionName, data })
      }
      const observe = () => sendFixture(dynamic.adapter, 'observe', [fixture.token, dynamic.stable])
      await openStudio()
      await click('button', 'Treasury')
      await viewport(320, 844, true)
      assert.ok(await evalPage(() => {
        const tabs = document.querySelector('[role="tablist"][aria-label="Treasury sections"]')
        const overview = tabs.querySelector('[aria-selected="true"]')
        overview.focus()
        overview.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
        return document.activeElement.textContent.trim() === 'Activity'
      }))
      await has('Recent treasury transactions')
      await click('[role="tab"]', 'Overview')
      assert.ok(await evalPage(() => {
        const page = document.documentElement
        const balances = document.querySelector('[aria-label="Treasury balances by asset"]')
        return page.scrollWidth <= page.clientWidth && balances.clientWidth > 0 && balances.scrollWidth <= balances.clientWidth
      }))
      await viewport(1200, 900)
      await click('[role="tab"]', 'Swap')
      await field('treasury-sell', fixture.token)
      await field('treasury-buy', dynamic.stable)
      await field('treasury-swap-amount', '1')
      await click('button', 'Get protected quote')
      await has('TWAP observations are missing or stale')
      assert.equal(await evalPage(() =>
        [...document.querySelectorAll('button')].some((button) => button.textContent === 'Confirm Treasury swap'),
      ), false)
      await observe()
      await rpc('evm_increaseTime', [1801])
      await rpc('evm_mine')
      await observe()
      await click('button', 'Get protected quote')
      await has('Minimum received')
      await has('Impact incl. DEX fees')
      await has('Estimated network fee')
      await viewport(1200, 900)
      if (process.env.V3_BROWSER_TREASURY_DESKTOP_SCREENSHOT) {
        assert.equal(await evalPage(() => window.innerWidth), 1200)
        const screenshot = await command('Page.captureScreenshot', { captureBeyondViewport: true })
        fs.writeFileSync(process.env.V3_BROWSER_TREASURY_DESKTOP_SCREENSHOT, Buffer.from(screenshot.data, 'base64'))
      }
      await viewport(390, 844, true)
      await wait('Treasury and protected quote fit the mobile viewport after resize', () => {
        const page = document.documentElement
        const quote = document.querySelector('[aria-label="Protected Treasury quote"]')
        return page.scrollWidth <= page.clientWidth &&
          quote?.clientWidth > 0 && quote.scrollWidth <= quote.clientWidth
      })
      if (process.env.V3_BROWSER_TREASURY_SCREENSHOT) {
        assert.equal(await evalPage(() => window.innerWidth), 390)
        const screenshot = await command('Page.captureScreenshot', { captureBeyondViewport: true })
        fs.writeFileSync(process.env.V3_BROWSER_TREASURY_SCREENSHOT, Buffer.from(screenshot.data, 'base64'))
      }
      const beforeSwap = await read(fixture.treasuryVault, 'balance', [fixture.token])
      await evalPage((walletAccount) => { window.__nextV3WalletAccount = walletAccount }, fixture.participant)
      await click('button', 'Confirm Treasury swap')
      await has('The wallet account changed.')
      await evalPage(() => { delete window.__nextV3WalletAccount })
      assert.deepEqual(await read(fixture.treasuryVault, 'balance', [fixture.token]), beforeSwap)
      await evalPage(() => { window.__nextV3DifferentFork = true })
      await click('button', 'Confirm Treasury swap')
      await has('different or behind local RPC')
      await evalPage(() => { window.__nextV3DifferentFork = false })
      assert.deepEqual(await read(fixture.treasuryVault, 'balance', [fixture.token]), beforeSwap)
      await evalPage(() => {
        window.__nextV3WalletError = { message: 'User rejected the request.', code: 4001 }
      })
      await click('button', 'Confirm Treasury swap')
      await has('rejected')
      assert.deepEqual(await read(fixture.treasuryVault, 'balance', [fixture.token]), beforeSwap)
      await evalPage(() => {
        window.__nextV3WalletError = {
          message: 'The requested method and/or account has not been authorized by the user.',
          code: 4100,
        }
      })
      await click('button', 'Confirm Treasury swap')
      await has('Review the site permissions in your wallet')
      assert.deepEqual(await read(fixture.treasuryVault, 'balance', [fixture.token]), beforeSwap)
      await evalPage(() => { window.__nextV3WalletLowGas = true })
      await click('button', 'Confirm Treasury swap')
      await has('The transaction reverted on the settlement network.')
      const revertedHash = await evalPage(() => window.__nextV3RevertedHash)
      assert.equal((await minedReceipt(revertedHash, 'Deliberately reverted Treasury swap')).status, '0x0')
      assert.deepEqual(await read(fixture.treasuryVault, 'balance', [fixture.token]), beforeSwap)
      await rpc('evm_increaseTime', [121])
      await rpc('evm_mine')
      await click('button', 'Confirm Treasury swap')
      await has('This quote expired. Request a fresh quote.')
      assert.deepEqual(await read(fixture.treasuryVault, 'balance', [fixture.token]), beforeSwap)
      await click('button', 'Get protected quote')
      await has('Minimum received')
      await click('button', 'Confirm Treasury swap')
      await wait('the swap receipt', () => document.body.innerText.includes('Confirmed on the settlement network.'))
      await click('[role="tab"]', 'Activity')
      await has('Swap 1 V3R →')
      const afterSwap = await read(fixture.treasuryVault, 'balance', [fixture.token])
      assert.equal(afterSwap.available, beforeSwap.available - parseEther('1'))
      assert.equal(afterSwap.allocated, beforeSwap.allocated)
      assert.equal((await read(fixture.treasuryVault, 'swapTotals', [fixture.token]))[1], parseEther('1'))
      assert.ok((await read(fixture.treasuryVault, 'swapTotals', [dynamic.stable]))[0] > 0n)
      await click('[role="tab"]', 'Overview')
      await click('[role="tab"]', 'Withdraw')
      await field('treasury-amount', '1')
      await evalPage(() => document.querySelector('input[name="treasury-native-withdraw"]').click())
      await click('button', 'Withdraw as native POL')
      await wait('the native withdrawal receipt', () => document.body.innerText.includes('Confirmed on the settlement network.'))
      await click('[role="tab"]', 'Activity')
      await has('Withdrawn as native POL · 1 POL')
      assert.equal((await read(fixture.treasuryVault, 'balance', [fixture.token])).available, afterSwap.available - parseEther('1'))
      await click('[role="tab"]', 'Asset settings')
      await click('summary', 'Add or re-review a token')
      await field('token-contract', dynamic.nextToken)
      await click('button', 'Check token contract')
      await has('8 decimals')
      await field('token-review-hash', '0x' + '12'.repeat(32))
      await field('token-probe', '0.00000001')
      await evalPage(() => {
        document.querySelector('input[name="permission-1"]').click()
        document.querySelector('input[name="permission-2"]').click()
      })
      await click('button', 'Register reviewed token')
      await wait('registered Treasury asset appears', () =>
        [...document.querySelectorAll('[aria-label="Treasury balances by asset"] th')].some((cell) =>
          cell.textContent.includes('V3BTC')))
      assert.equal(await read(dynamic.registry, 'permitted', [dynamic.nextToken, 3]), true)
      assert.equal(await read(dynamic.registry, 'permitted', [dynamic.nextToken, 4]), false)
      await click('[role="tab"]', 'Overview')
      await click('[role="tab"]', 'Deposit')
      await field('treasury-asset', dynamic.nextToken)
      await field('treasury-amount', '15')
      await click('form[aria-label="Manage available treasury assets"] button', 'Deposit')
      await wait('the reviewed token deposit receipt', () => document.body.innerText.includes('Confirmed on the settlement network.'))
      await click('[role="tab"]', 'Activity')
      await wait('new token deposit appears in Treasury history', () => document.body.innerText.includes('Deposited · 15 V3BTC'))
      await viewport(1200, 900)
      await openStudio()
      await click('button', 'New pool')
      await editPoolName('New V3BTC Rewards')
      await wait('dynamic pool collection editor', () => {
        const editor = document.querySelector('article button[aria-label="Edit NFT collections"]')
        if (!editor) return false
        editor.click()
        return true
      })
      await field('collection-address', fixture.nft)
      await click('dialog button', 'Add collection')
      await has('Polygon ERC-721 · direct ownership check')
      await click('dialog button', 'Done')
      await click('article button', 'Set funding budget')
      await click('dialog button', 'V3BTC')
      await field('funding-budget', '10')
      await click('dialog button', 'Done')
      await wait('dynamic pool schedule editor', () => {
        const editor = document.querySelector('article button[aria-label="Edit reward schedule"]')
        if (!editor) return false
        editor.click()
        return true
      })
      await click('dialog button', 'In 1 hour')
      await field('duration-days', '2')
      await click('dialog button', 'Done')
      await click('button', 'Review pool plan')
      await click('button', 'Create pool and reserve 10 V3BTC from Treasury')
      await has('Treasury budget fully reserved')
      const created = await readBatchPool('poolCount')
      assert.deepEqual((await read(fixture.ledger, 'rewardsOf', [created])).map((token) => token.toLowerCase()),
        [dynamic.nextToken.toLowerCase()])
      const tokenBook = await read(fixture.treasuryVault, 'balance', [dynamic.nextToken])
      assert.equal(tokenBook.available, 500000000n)
      assert.equal(tokenBook.allocated, 1000000000n)
      await openStudio()
      await click('button', 'Treasury')
      await click('[role="tab"]', 'Asset settings')
      await click('summary', 'Manage token permissions')
      await field('registered-asset', dynamic.nextToken)
      await evalPage(() => document.querySelector('form[aria-labelledby] select[name="registered-asset"]').form
        .querySelector('input[name="permission-2"]').click())
      await click('button', 'Save permissions')
      await wait('the permission update receipt', () => document.body.innerText.includes('Confirmed on the settlement network.'))
      assert.equal(await read(dynamic.registry, 'permitted', [dynamic.nextToken, 2]), false)
      assert.deepEqual((await read(fixture.ledger, 'rewardsOf', [created])).map((token) => token.toLowerCase()),
        [dynamic.nextToken.toLowerCase()])
      await click('button', 'Pause treasury')
      await has('Treasury paused')
      assert.equal(await read(fixture.treasuryVault, 'paused', []), true)
      await click('[role="tab"]', 'Overview')
      assert.equal(await evalPage(() => document.querySelector('button[value="deposit"]').disabled), true)
      await click('[role="tab"]', 'Asset settings')
      await click('button', 'Resume treasury')
      await has('Treasury open')
      assert.equal(await read(fixture.treasuryVault, 'paused', []), false)
      console.log('PASS V3.6 Treasury responsive keyboard navigation, permissions, wallet recovery, stale quote, swap, native withdrawal, new token pool, pause and resume')
    }
    console.log(
      'PASS Studio filters, FarmCard preview, signed creation and deposit, off-chain edit and clean catalogue read',
    )
  } finally {
    worker?.kill()
    if (cdp && browser.exitCode === null && browser.signalCode === null) {
      await Promise.race([cdp.command('Browser.close', {}, 2000).catch(() => undefined), browserClosed])
    }
    cdp?.close()
    await Promise.race([browserClosed, delay(2000, undefined, { ref: false })])
    if (browser.exitCode === null && browser.signalCode === null && !browserError) {
      browser.kill()
      await Promise.race([browserClosed, delay(2000, undefined, { ref: false })])
    }
    // Chrome's children can still finish writing the profile after the main process exits.
    await fs.promises.rm(profile, { recursive: true, force: true, maxRetries: 12, retryDelay: 250 })
  }
}

testBrowser().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
