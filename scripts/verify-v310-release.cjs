const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const lock = require('./v310-release-lock.json')

const [directory, contractsRepo, pairingPath] = process.argv.slice(2)
if (!directory || !contractsRepo || !pairingPath) throw new Error('Usage: verify-v310-release.cjs ARTIFACT_DIR CONTRACTS_REPO EVIDENCE_FILE')
const digest = (value) => createHash('sha256').update(value).digest('hex')
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const manifestFile = fs.readFileSync(path.join(directory, 'manifest.json'))
const manifest = JSON.parse(manifestFile)
assert.equal(git('-C', contractsRepo, 'rev-parse', 'HEAD'), lock.contractsCommit)
assert.equal(digest(manifestFile), lock.manifestSha256)
assert.equal(manifest.release, lock.release)
assert.equal(manifest.standardInputSha256, lock.standardInputSha256)
assert.equal(digest(fs.readFileSync(path.join(directory, 'standard-input.json'))), lock.standardInputSha256)

function artifact(name) {
  const entry = manifest.contracts.find((contract) => contract.name === name)
  assert.ok(entry, 'Missing release contract ' + name)
  const data = fs.readFileSync(path.join(directory, entry.artifact))
  assert.equal(digest(data), entry.artifactSha256)
  const compiled = JSON.parse(data)
  assert.equal(compiled.evm.deployedBytecode.object.length / 2, entry.runtimeBytes)
  return { entry, ...compiled }
}

function frontendAbi(file) {
  const source = fs.readFileSync(path.join(__dirname, '../src/features/universalRewards', file + '.ts'), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
  const exports = {}
  new Function('require', 'exports', outputText)(require, exports)
  return exports
}

function parameter({ type, indexed, components }, includeNames = false) {
  return { type, ...(indexed !== undefined && { indexed }), ...(components && {
    components: components.map((component) => ({ ...parameter(component), ...(includeNames && { name: component.name }) })),
  }) }
}

function signature(entry) {
  const { type, name, stateMutability, anonymous, inputs = [], outputs = [] } = entry
  return JSON.stringify({ type, name, stateMutability, anonymous, inputs: inputs.map((input) => parameter(input)),
    outputs: outputs.map((output) => parameter(output, true)) })
}

function assertCompatible(frontend, compiled) {
  const expected = new Set(compiled.abi.map(signature))
  for (const entry of frontend) {
    assert.ok(expected.has(signature(entry)), compiled.name + ' does not match frontend ABI entry ' + signature(entry))
  }
}

const ledger = artifact('UniversalRewardsV310')
assert.equal(ledger.entry.runtimeBytes, lock.runtimeBytes)
assert.ok(ledger.entry.runtimeBytes <= 24_576)
const core = frontendAbi('abi')
const v36 = frontendAbi('abiV36')
assertCompatible([...core.universalRewardsAbi, ...frontendAbi('positionBatch').positionBatchAbi], ledger)
assertCompatible(v36.treasuryVaultV36Abi, artifact('TreasuryVaultV36'))
assertCompatible(v36.treasuryAssetsV36Abi, artifact('TreasuryAssetsV36'))
assertCompatible(v36.rewardRoutePlannerV36Abi, artifact('RewardRoutePlannerV36'))
assertCompatible([...core.managedNftCollectionAbi, ...frontendAbi('managedBatch').managedBatchAbi], artifact('ManagedNftCollectionV39'))

const pairing = { ...lock, frontendCommit: git('rev-parse', 'HEAD'), ledgerAbiSha256: ledger.entry.abiSha256,
  eip170Headroom: 24_576 - ledger.entry.runtimeBytes }
fs.writeFileSync(pairingPath, JSON.stringify(pairing, null, 2) + '\n')
console.log('Verified V3.10 ABI, compiler input, runtime size and paired repository commits')
