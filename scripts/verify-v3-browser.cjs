const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { setTimeout: delay } = require('node:timers/promises')
const { parseAbi, encodeFunctionData, decodeFunctionResult } = require('viem')

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

function injectedWallet(account, node, announceProvider) {
  localStorage.setItem('wagmi.injected.connected', 'true')
  localStorage.setItem('wagmi.recentConnectorId', JSON.stringify('injected'))
  const listeners = new Map()
  window.ethereum = {
    isMetaMask: announceProvider,
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
  let worker
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
    const visit = async (route, account, announceProvider = false) => {
      if (injection) await command('Page.removeScriptToEvaluateOnNewDocument', { identifier: injection })
      injection = undefined
      if (account) {
        const expression =
          '(' + injectedWallet.toString() + ')(...' + JSON.stringify([account, rpcUrl, announceProvider]) + ')'
        injection = (await command('Page.addScriptToEvaluateOnNewDocument', { source: expression })).identifier
      }
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
    await visit('/nftpools')
    await wait('disconnected FarmCard CTA', () => {
      const card = [...document.querySelectorAll('article')].find(
        (item) => item.querySelector('h3')?.textContent === 'V3 Browser Fixture',
      )
      return [...(card?.querySelectorAll('button') ?? [])].some(
        (button) => button.textContent.trim() === 'Connect Wallet',
      )
    })
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
        id,
      )
    await selectNft(fixture.tokenId)
    await has('Estimated next 24 hours')
    await click('dialog button', 'Confirm')
    await has('Confirmed on the settlement network.')
    await has('STAKED NFT COUNT')
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
    await has('No wallet positions in the records on this page.')
    await viewport(390, 844, true)
    const ownerBalance = await tokenBalance(fixture.operator)
    await visit(poolPath, fixture.operator)
    await click('article button', 'Unstake')
    await wait(
      'unstake picker on mobile',
      () => document.querySelector('dialog[open]')?.getAttribute('aria-label') === 'Select NFTs to UnStake',
    )
    await selectNft(fixture.tokenId)
    await click('dialog button', 'Confirm')
    await has('Confirmed on the settlement network.')
    await has('No active participation')
    assert.equal(await ownerOf(), '0x' + pad(fixture.operator).toLowerCase())
    assert.ok((await tokenBalance(fixture.operator)) > ownerBalance)
    assert.ok(await evalPage(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    console.log('PASS shared FarmCard modals, keyboard focus, detail link, non-custodial join and mobile exit')

    await viewport(1280, 900)
    await visit('/admin/nft-pools/v3', fixture.operator, true)
    await has('Pool Studio V3')
    await wait('Studio wallet connection', () => {
      if (document.querySelector('[aria-label="V3 pool dashboard"]')) return true
      const connect = [...document.querySelectorAll('section[aria-label="Pool Studio V3"] button')].find(
        (button) => button.textContent.trim() === 'Connect Wallet',
      )
      if (!connect) return false
      connect.click()
      return 'modal'
    }).then(async (connection) => {
      if (connection !== 'modal') return
      await wait('announced Studio wallet', () => {
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
    await wait('inline FarmCard name', () => {
      const action = document.querySelector('article button[aria-label="Edit pool name"]')
      if (!action || action.disabled) return false
      action.focus()
      action.click()
      return true
    })
    await field('pool-name', 'Studio acceptance pool')
    await evalPage(() => {
      const title = document.querySelector('[name="pool-name"]')
      title.focus()
      title.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    })
    await wait('inline name committed to the card', () =>
      document.querySelector('article h3')?.innerText.includes('Studio acceptance pool'),
    )
    await wait('editable collection avatar', () => {
      const button = document.querySelector('article button[aria-label="Edit NFT collections"]')
      if (!button) return false
      button.click()
      return true
    })
    await field('collection-address', fixture.nft)
    await click('dialog button', 'Add collection')
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
    const tokenAbi = parseAbi([
      'function deposit() payable',
      'function allowance(address owner, address spender) view returns (uint256)',
    ])
    const wrap = await rpc('eth_sendTransaction', [
      {
        from: fixture.operator,
        to: fixture.token,
        data: encodeFunctionData({ abi: tokenAbi, functionName: 'deposit' }),
        value: '0xa688906bd8b00000',
      },
    ])
    assert.equal((await rpc('eth_getTransactionReceipt', [wrap])).status, '0x1')
    await has('Your wallet may ask for two confirmations')
    await click('button', 'Fund 12 V3R')
    await has('Budget fully deposited')
    const allowance = await rpc('eth_call', [
      {
        to: fixture.token,
        data: encodeFunctionData({
          abi: tokenAbi,
          functionName: 'allowance',
          args: [fixture.operator, fixture.ledger],
        }),
      },
      'latest',
    ])
    assert.equal(BigInt(allowance), BigInt(0), 'The exact allowance must be spent by the single deposit')
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
    console.log(
      'PASS Studio filters, FarmCard preview, signed creation and deposit, off-chain edit and clean catalogue read',
    )
  } finally {
    worker?.kill()
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
