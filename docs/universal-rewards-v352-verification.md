# Universal Rewards V3.5.2 verification

Release verdict: **FAIL**. Full application TypeScript and the production build still fail. Production browser acceptance and production Sentry verification require a successful build.

## TypeScript baseline

| Frontend revision | Diagnostics | Files |
| --- | ---: | ---: |
| `e6daf6c98d8a2f20e495a30f4d5f1ff16cb11f4a` sources with the migration's compiler and check scope | 2,152 | 519 |
| `b1bf735102d80e83fa81601932003148aaf71b02` migration | 1,900 | 441 |
| V3.5.2 verification | 1,369 | 362 |

The V3.5 GitHub workflow passed its scoped checks. Its Next.js config had `typescript.ignoreBuildErrors: true`. To compare the source revisions, check out the V3.5 tree and run TypeScript 5.9.3 with the migration's workspace inclusion, JSX, module resolution and dependencies. Matching diagnostics by path, code and primary message, 1,877 occur in both source revisions. The migration removed 275 matching diagnostics and introduced or exposed 23. The V3.5.2 run removed 531 diagnostics relative to V3.5.1 with no additional diagnostics by this comparison.

- Redux dispatch now uses the inferred store dispatch type, including thunks. Vault and pool state types represent unavailable reads and the deserialized values that consumers already receive.
- Storybook templates model CSF args, React 18 components declare children explicitly where needed, and SDK, UI kit and Storybook have mandatory independent type checks. The root check still covers production and workspace sources.
- The BitKeep connector validates provider availability and legacy replies. The exchange keeps wallet-backed signers on write paths, and the chart models missing pairs and quotes explicitly. Next.js removed `NextRequest.geo` in version 15. The legacy middleware source uses Vercel headers and the current cookie API at its existing path. [Next.js request API](https://nextjs.org/docs/app/api-reference/functions/next-request) [Vercel request headers](https://vercel.com/docs/headers/request-headers)
- Remaining clusters include nullable wallet and network inputs, unvalidated subgraph and API response models, optional values in legacy Predictions, Lottery and NFT views, and React component and SDK contracts. The root check and the Next.js build enforce these errors.

## Verification results

| Check | Result | Evidence |
| --- | --- | --- |
| Full TypeScript | FAIL | 1,369 diagnostics in 362 files |
| SDK, UI kit and Storybook TypeScript | PASS | Independent projects via `yarn typecheck:workspaces` |
| Full Jest | PASS | 135 suites, 2,716 tests and 38 snapshots. The isolated V2 fork suite ran separately and passed. |
| Full lint | PASS | Zero errors and 226 warnings |
| V3 lint, types and Jest | PASS | 44 suites and 217 tests. The isolated V2 fork suite is reported separately. |
| `yarn build` | FAIL | Next.js 16.4.6 webpack build stops during mandatory type checking |
| Isolated production browser acceptance | BLOCKED | The fixture deploys to local chain 31337. The build exits before `next start`. |
| Isolated development browser | PASS | Chrome verifies Treasury deposit and withdrawal, pool creation and funding, ERC-721 participation, managed ERC-1155 quantities and partial transfers, Harvest, exit, expired recovery, Auto-Swap receipts and retries, wallet rejection and reconnection, mobile flows and the disconnected Swap, Liquidity, Add Liquidity and NFT Collections routes. |
| V2 Polygon fork | PASS | Published NFT factory discovery and one full user lifecycle on the isolated fork |
| V3 Solidity and Polygon fork | PASS | Compile, 30 Solidity scenarios and two pinned Polygon fork scenarios |
| Solidity manifest and frontend ABI | PASS | Byte-for-byte comparisons of generated files |

Jest checks real Polygon LP token pairs and factories, standalone pool token addresses and emissions, and ERC-20 metadata from block 97,638,790. The fixture records shipped display aliases for WPOL, USDT0 and WETH. The locale tests exercise literal fallback, branding overrides and interpolation. The development browser route smoke checks page rendering. It does not attest a successful production bundle, live exchange transactions or Sentry envelope delivery.

Run the frontend checks on Node 22 with the root frozen Yarn lockfile.

```sh
yarn install --frozen-lockfile
yarn typecheck
yarn typecheck:workspaces
yarn lint
yarn test --runInBand --silent
yarn build
node scripts/run-v3-browser-acceptance.cjs ../coincollect-smart-contracts/projects/universal-rewards-v3
```

React 18.3.1 remains pinned. Next.js 16 reports a deprecation warning for React 18 support.

## Dependencies and artifacts

Yarn's registry audit, counted by unique advisory ID, went from 93 to 79 high findings, 75 to 56 moderate and 20 to 19 low. No critical advisories were reported in either run. The installed browser cookie package is `js-cookie@3.0.7`. The Moralis core resolution uses `axios@1.21.1`, clearing the 13 high Axios findings under that SDK. The repo's cookie reader uses a fixed key, and the legacy NFT tokens API still needs modernization from its old Moralis API. [JavaScript Cookie advisory](https://github.com/advisories/GHSA-qjx8-664m-686j) [Axios release notes](https://github.com/axios/axios/releases/tag/v1.21.1)

Remaining advisory paths include runtime wallet connectors and transport dependencies, Snapshot and GraphQL clients, and development tools such as Jest, Cypress and source-map-explorer. Transport or signing code can ship to the browser even where a particular vulnerable operation requires a Node adapter or specific caller configuration. A dependency path establishes presence. Full runtime reachability for each remaining advisory has not been established.

The contract compiler and source inventory match the V3.5 release. The frontend workflow pins contract tooling at `e6247008e91a635c09726906c1aef4e1c0c7186a`. The contract-tooling audit reports 14 low and zero moderate, high or critical advisories. The reproduced manifest SHA-256 is `964adf731bac4a7535585ac497b6f36536b0d489c589b5b75c18a3a2b34d7363`. The exported ABI SHA-256 is `eb39f11b5115de1ed473aeb4c41b251781a40d71b8b2ffc1b1c8d8ab8f3eb72b`. [Contract release manifest](https://github.com/Coin-Collect/coincollect-smart-contracts/blob/e6247008e91a635c09726906c1aef4e1c0c7186a/projects/universal-rewards-v3/release-manifest.json)
