'use strict'

const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const fs = require('node:fs')
const { createRequire } = require('node:module')

const walletUtils = createRequire(require.resolve('@walletconnect/utils'))
const queryPath = walletUtils.resolve('query-string')
const decoderPath = createRequire(queryPath).resolve('decode-uri-component')
const digest = createHash('sha256').update(fs.readFileSync(decoderPath)).digest('hex')
assert.equal(digest, '5ff0e23c5a448993c5cd317cdf968090186c32d54c1132d9df5cb5bf44880f3a',
  'WalletConnect must use the reviewed CommonJS port of decode-uri-component 0.5.1')

const query = require(queryPath)
const input = { uri: 'wc:session@2?relay-protocol=irn', returnTo: '/nftpools?asset=POL & WETH', title: 'Ödül' }
assert.deepEqual({ ...query.parse(query.stringify(input)) }, input)
assert.equal(query.parse('message=hello+world').message, 'hello world')
assert.equal(typeof query.parse('message=broken%escape').message, 'string')
console.log('WalletConnect CommonJS decoder identity and URL compatibility verified.')
