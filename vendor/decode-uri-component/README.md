# CommonJS build of decode-uri-component 0.5.1

WalletConnect resolves query-string 7.1.3, which uses the callable CommonJS export of decode-uri-component. The upstream security fix ships as ESM. This file keeps the same upstream algorithm and exposes it through `module.exports`.

The official npm tarball `decode-uri-component@0.5.1` has integrity `sha512-vWHQkXgg2cE3BB4rR0c+PYw9BCQzLoNIRMI7AunIkZst74tw/vpPp7VLoYtsR/cy1f55g3XDWUslfeCZjiZJyA==`. Verify that its `package/index.js` SHA-256 is `6a86ac891edf15c5efa0841ebb31935e3669d58b98318b57d7b08a4530317cb0`. Prepend `'use strict';` and a blank line. Replace the single `export default function decodeUriComponent` with `module.exports = function decodeUriComponent`. Preserve every other byte and retain the MIT license from the tarball.

The dependency gate verifies the exact CommonJS file resolved from WalletConnect and exercises the query-string interface. Remove this port once the maintained WalletConnect dependency supplies a patched decoder compatible with its module format.

[Security advisory](https://github.com/advisories/GHSA-qr28-fpjm-wq7f) · [Upstream package](https://www.npmjs.com/package/decode-uri-component/v/0.5.1)
