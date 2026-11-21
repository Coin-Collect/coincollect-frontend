# Universal Rewards V3.5.3 frontend verification

The baseline is frontend commit `db4b2806efa84afed815399997f39bfda8608fe9`. The full TypeScript step in its [GitHub workflow](https://github.com/Coin-Collect/coincollect-frontend/actions/runs/44881648796) reported 1,369 diagnostics across 362 files. TS2322 (421), TS2345 (329), TS18048 (293) and TS2339 (120) accounted for 1,163 diagnostics.

| Module or workflow | Baseline diagnostics | Baseline files | Remaining diagnostics |
| --- | ---: | ---: | ---: |
| NFT marketplace and profile | 211 | 69 | 0 |
| Predictions | 196 | 40 | 0 |
| Shared components, utilities, routes and tests | 187 | 72 | 0 |
| Trading Competition and Farm Auction | 173 | 31 | 0 |
| Farms and staking vaults | 173 | 45 | 0 |
| Pancake Squad, IFO and onboarding | 127 | 26 | 0 |
| Lottery | 115 | 28 | 0 |
| V2 NFT pools | 102 | 17 | 0 |
| Voting and Analytics | 80 | 30 | 0 |
| Swap and Liquidity views | 5 | 4 | 0 |
| **Total** | **1,369** | **362** | **0** |

Each baseline file belongs to one row. Feature rows include their corresponding Redux modules where applicable. Removing the inherited TypeScript suppression directives exposed 43 additional diagnostics, which were resolved. The required project configuration is unchanged. A separate probe with `--noImplicitAny` enabled across the older application and workspace code reports 524 diagnostics in 173 files. The V3 project already requires `noImplicitAny`.

## Root causes

- Redux and RPC data represented pending and unavailable results as if they were complete. The shared Farms, vault, auction, Predictions and marketplace models now declare absence explicitly. Their consumers wait for required data and keep loading states distinct from empty collections or balances.
- Wallet and route values can be absent during hydration, after disconnect and after switching accounts. Transaction entry points validate the inputs they use and signing follows the current wallet connector. Legacy V2 NFT IDs retain decimal strings through selection and transaction preparation to preserve full ERC-721 identifier precision.
- Marketplace metadata and listing state arrive independently. Listings require usable price and market data, token matching includes the collection address, and unpriced or missing records use the existing fallback states.
- Disconnected, pending and failed form state propagated required values through loosely typed props. Components now use explicit inputs and optional actions where the rendered control supports them.
- The removed legacy helpers and UI modules had no incoming imports or reachable routes. The removed unused NFT API route returned hardcoded sample data. Existing collection, farm, auction, prediction, lottery, governance, exchange and V2 pool routes remain available.

## Reproduce the release checks

Use Node 22, the checked-in Yarn lockfile and Chrome. Keep the Solidity project on its existing `pool-management` branch.

```sh
yarn install --frozen-lockfile
yarn typecheck
yarn typecheck:workspaces
yarn lint
yarn test --runInBand --silent
yarn lint:v3
yarn typecheck:v3
yarn test --runInBand --silent src/features/universalRewards src/features/nftPoolManager src/state/nftFarms
yarn build
(cd ../coincollect-smart-contracts/projects/universal-rewards-v3 && npm ci --workspaces=false --ignore-scripts)
node scripts/run-v3-browser-acceptance.cjs ../coincollect-smart-contracts/projects/universal-rewards-v3
```

The browser runner builds the app and starts it with `next start` against a disposable local chain 31337. Its fixture covers Treasury, NFT pool creation and funding, managed ERC-1155, ERC-721 participation, Harvest, expiration, recovery and automation. It also checks connected and disconnected exchange and marketplace screens, token search, wallet network switching and rejected wallet transactions. Sentry sends an application exception to a disposable loopback receiver and filters a wallet rejection. A separate check of the compiled Node instrumentation confirmed server-side registration and exception delivery to loopback. The V2 pinned Polygon fork suite is run separately with an isolated fork, while plain Jest skips that RPC-dependent suite.

The contract release remains at `36a8a57d9ebccd9856c58bd980152b396472e775`. Its [contract and pinned Polygon fork workflow](https://github.com/Coin-Collect/coincollect-smart-contracts/actions/runs/44881672118) passed. The regenerated frontend ABI matches byte-for-byte. Its SHA-256 is `eb39f11b5115de1ed473aeb4c41b251781a40d71b8b2ffc1b1c8d8ab8f3eb72b`.

Jest passed 135 suites, 2,716 tests and 38 snapshots. The isolated V2 Polygon fork test passed separately. The targeted V3 run passed 44 suites and 217 tests. Repository lint finished with zero errors and 223 warnings. The regular Next.js production build generated 107 static pages.

The production build retains React 18.3.1. Next.js 16.4.6 reports that React 18 support is deprecated. This is an upstream migration warning with the existing release versions.
