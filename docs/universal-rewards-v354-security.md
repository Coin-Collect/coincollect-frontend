# Universal Rewards V3.5.4 frontend verification

This record pairs the frontend release with [contracts commit bf79d05369b50b7da399f8efabf7a6d11e4c6f0a](https://github.com/Coin-Collect/coincollect-smart-contracts/commit/bf79d05369b50b7da399f8efabf7a6d11e4c6f0a). CI compiles immutable contract source `e6247008e91a635c09726906c1aef4e1c0c7186a`. The pinned source, lock and manifest match the contracts branch's reviewed V3.5.4 tree. Reproduce the founder's environment with the [Turkish manual guide](../MANUAL_TESTING_GUIDE_TR.md).

## Findings and protections

| Finding and severity | Evidence and resolution |
| --- | --- |
| Medium · public RPC trust boundary | The Polygon relay previously forwarded arbitrary JSON-RPC envelopes and served upstream body bytes/types under the application origin. This exposed the upstream method surface and provider quota. It now only forwards named read methods, bounds batch size and body size, rejects duplicate IDs and unexpected response shapes, refuses redirects and returns JSON with `nosniff`. Twelve API regressions exercise validation, upstream correlation, RPC errors and failures. Chrome verifies the actual production API through Anvil. |
| High · wallet dependency advisories | Scoped resolution updates cover Coinbase Wallet SDK v4 (4.3.0), WebSocket (8.23.0), Socket.IO parser (4.2.7), secp256k1 (5.0.2), base-x (4.0.1), node-forge (1.4.3), h3 (1.15.6), defu (6.1.7), form-data (3.0.5), fast-uri (3.1.9) and compatible picomatch v2 paths. A repository import and configuration pass found no app consumer for the direct Moralis and Blocto packages, which were removed. The UI kit retains existing wallet descriptors and working connector configuration. |
| Operational · RPC availability | Provider trust still affects display freshness and simulation availability. The browser verifies chain ID and configured ledger runtime hash. A public client can spend its read quota, so deploy endpoint budgets and monitoring through the existing host controls. No RPC changes grant authority over signing. |
| Operational · wallet request and local controls | Browser and source checks cover chain and account changes, user rejection, simulation, confirmation, receipt status and wallet rehydration. Production execution requires a configured signer, expected address, HTTPS RPC, runtime verification and explicit enablement. Local presentation requires a scoped signed revision and isolated chain 31337. Local overrides and experimental ABI selectors remain environment-scoped. |

Public frontend configuration only identifies infrastructure or deployments. Production executor keys and cron bearer secrets are server-only. The review covered the staged files for secret patterns. Infrastructure-level secret rotation, committed legacy environment history and deployed setting values require owner verification. No credential values are included here.

## Dependency reachability and triage

Yarn Classic registry audit, deduplicated by GHSA identifier on 2026-11-21, changed from 70 to **39 high**, from 50 to **37 moderate** and from 19 to **11 low** advisories, with **zero critical** in both scans. The repeat count by dependency paths changed from 372 to 234 high. The CI job uploads every registry record, prints both views and fails on critical findings or a high finding through a production root absent from the reviewed list. Recording a finding in that list leaves it visible and requires its release disposition below.

| Remaining high findings through dependency roots | Classification and evidence |
| --- | --- |
| `decode-uri-component`, `GHSA-qr28-fpjm-wq7f` via Wagmi and Web3Modal | Browser wallet stack reachability. Production URL/callback availability risk needs further review. Locked WalletConnect uses CommonJS query-string and expects a callable CommonJS export. The patched decoder is ESM. Review a compatible wallet SDK change and test real provider sessions before production. [Advisory](https://github.com/advisories/GHSA-qr28-fpjm-wq7f) |
| `zod`, `GHSA-mrhx-c7xc-m3w5` via Web3Modal wallet | Browser frame validation is present. No vulnerable constrained collection schema was identified in the inspected frame schema. Validate production frame origin and provider payload exposure independently before selecting a compatible SDK with a fixed Zod major. [Advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) |
| `picomatch`, `GHSA-c2c7-rcm5-vvqj` through WalletConnect | The remaining production dependency paths are from `unstorage` into the Node file watcher or tooling. CoinCollect uses wallet browser storage and does not expose that watcher through its own API routes. Recheck runtime bundle reachability on connector upgrades. [Advisory](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj) |
| `ws`, `GHSA-96hv-2xvq-fx4p` via bundle analyzer | Build-only, with its listener absent from the deployed application. The vulnerable Jest path is also development-only. Wallet/viem paths have compatible locked v8 patches. [Advisory](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) |
| `lodash.set`, `GHSA-p6mc-m468-83gw` via Snapshot | The vulnerable setter is used by Snapshot's multicaller path construction. CoinCollect's Voting flow uses the Snapshot client for governance submissions and does not instantiate that multicaller in the inspected code. There is no patched standalone build. Review SDK replacement with Voting regression coverage as a release follow-up. [Advisory](https://github.com/advisories/GHSA-p6mc-m468-83gw) |
| Remaining high paths in dev dependencies | Jest, lint, bundle analysis, local serve/start-server-and-test, Cypress and tooling. The complete upload lists exact advisory IDs and paths. Keep workflow inputs and fetched artifacts trusted and avoid executing untrusted test packages or archives. |
| Moderate and low | Complete inventory retained in CI. Individual runtime reachability for all moderate/low paths remains open for launch triage. |

Lockfile resolutions are explicit and warnings stay visible. This gate is evidence of the scan and policy result. Wallet SDK integration, lower-severity findings and legacy tooling require continued triage before launch.

## Test evidence and scope

- Full strict TypeScript, independently checked SDK, UI Kit and Storybook, full Jest and repository lint passed. Jest ran 2,732 passing tests plus one opt-in fork test run separately and passed. Lint reported 223 existing warnings and zero errors.
- Next.js 16.4.6 Pages Router with React 18.3.1 built successfully in regular production mode and in the isolated acceptance build. Next reports a React 18 deprecation notice. The migration to React 19 requires a separate scope and connector verification.
- Chrome against `next start` exercised local RPC integration, V3 Studio creation, Treasury policies, local worker authorization and idempotency, multi-NFT Harvest, selected exits, transfer and partial exit of managed ERC-1155, exact-period recovery, reconnect/reject/switch, mobile layout, keyboard focus on dialog close, production Sentry, and legacy Swap, Add Liquidity, Liquidity, NFT Collections and connected NFT profile. The browser uses a controlled EIP-1193 provider; official wallet extension UI is a founder manual check.
- Separate pinned V2 fork acceptance executed launch, accounting and user paths. Solidity regression, two pinned Polygon fork tests, byte-for-byte generated ABI and deterministic release manifest passed. Mainnet market readings are documented on the paired contract commit. Live production route approval and TWAP remain blocked.

## Founder UI backlog

| Priority | Route | Manual review and expected impact |
| --- | --- | --- |
| P1 | `/nftpools` and `/nftpools/v3/:id` | Confirm generated MetaMask prompts and the harvest sequence are easy to understand across multiple positions, including a rejection midway through. |
| P1 | `/admin/nft-pools/v3` | At 390 px, check the distinction between available Treasury funds, allocations and wallet POL fees. Consider a compact mobile view after founder review. |
| P2 | `/nftpools`, `/nfts/profile/:address` | Check large token amounts, long collection names, dense reward cards and accessible focus at actual device font sizes. |
| P2 | Swap, Liquidity and NFT Marketplace | Check provider reconnection in physical MetaMask and Uniswap, network badges, horizontal overflow and empty-state readability. |

The candidate is ready for founder testing and external review. Required mainnet decisions include production wallet dependency disposition, approved token/collection and route identities, fresh TWAP evidence, executor drills and an independent contract audit.
