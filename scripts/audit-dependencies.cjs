'use strict'

const fs = require('node:fs')
const { spawnSync } = require('node:child_process')
const { dependencies, optionalDependencies } = require('../package.json')

// Existing high findings and reachability are tracked in docs/universal-rewards-v354-security.md.
const acceptedHighRoots = {
  'GHSA-qr28-fpjm-wq7f': ['wagmi', '@web3modal/wagmi'],
  'GHSA-c2c7-rcm5-vvqj': ['wagmi', '@web3modal/wagmi'],
  'GHSA-96hv-2xvq-fx4p': ['@next/bundle-analyzer'],
  'GHSA-p6mc-m468-83gw': ['@snapshot-labs/snapshot.js'],
  'GHSA-mrhx-c7xc-m3w5': ['@web3modal/wagmi'],
}

const reportPath = process.argv[2]
if (!reportPath) throw new Error('Usage: node scripts/audit-dependencies.cjs <report.jsonl>')
const { stdout, stderr, error } = spawnSync('corepack', ['yarn', 'audit', '--json'], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
  timeout: 100_000,
})
if (error) throw error
fs.writeFileSync(reportPath, stdout)
if (stderr) process.stderr.write(stderr)
const records = stdout.trim().split('\n').map((line) => JSON.parse(line))
const summary = records.find((record) => record.type === 'auditSummary')
if (!summary || records.some((record) => record.type === 'error')) {
  throw new Error('Yarn audit did not return a completed registry report.')
}

const production = { ...dependencies, ...optionalDependencies }
const findings = new Map()
const unreviewed = new Set()
for (const { type, data } of records) {
  if (type !== 'auditAdvisory') continue
  const { advisory, resolution } = data
  const id = advisory.github_advisory_id || advisory.url.split('/').pop()
  const root = resolution.path.split('>')[0]
  if (!findings.has(id)) findings.set(id, advisory.severity)
  const reviewed = acceptedHighRoots[id]?.includes(root)
  if (advisory.severity === 'critical' || (advisory.severity === 'high' && root in production && !reviewed)) {
    unreviewed.add(id + ' through ' + root)
  }
}
const counts = {}
for (const level of findings.values()) counts[level] = (counts[level] || 0) + 1
console.log('Deduplicated advisories:', counts)
console.log('Dependency paths:', summary.data.vulnerabilities)
console.log('Complete registry evidence:', reportPath)
if (unreviewed.size) {
  console.error('Release gate requires triage for:', [...unreviewed].sort().join(', '))
  process.exitCode = 1
}
