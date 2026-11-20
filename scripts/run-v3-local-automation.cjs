'use strict'

const target = new URL(process.env.V3_LOCAL_PREVIEW || 'http://127.0.0.1:3015')
const secret = process.env.CRON_SECRET
if (
  target.protocol !== 'http:' ||
  !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
  target.username ||
  target.password ||
  target.pathname !== '/' ||
  target.search ||
  target.hash ||
  !secret ||
  secret.length < 16
)
  throw new Error('The local V3 worker requires a loopback preview URL and its configured CRON_SECRET.')

let timer
let active = true
let lastError = ''
async function tick() {
  try {
    const response = await fetch(new URL('/api/v3/replenish', target), {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      redirect: 'error',
      signal: AbortSignal.timeout(70_000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = await response.json()
    if (result.mode !== 'isolated') throw new Error('Unexpected automation response')
    if (lastError) console.log('Local V3 reward automation is connected.')
    lastError = ''
    for (const job of result.results) {
      if (job.status === 'confirmed' || job.status === 'pending') {
        console.log(`Pool #${job.poolId}, reward window ${job.epoch} ${job.status} (${job.hash})`)
      }
    }
  } catch (error) {
    if (String(error) !== lastError) console.warn('Local V3 reward automation will retry.', error.message)
    lastError = String(error)
  } finally {
    if (active) timer = setTimeout(tick, 30_000)
  }
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    active = false
    clearTimeout(timer)
  })
}
void tick()
