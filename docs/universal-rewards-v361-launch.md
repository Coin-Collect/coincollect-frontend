# Universal Rewards V3.6.1 frontend acceptance

The contracts workflow builds the candidate from [31ff0617b60aaafcbe155f4a266eab9e62455c8a](https://github.com/Coin-Collect/coincollect-smart-contracts/commit/31ff0617b60aaafcbe155f4a266eab9e62455c8a). The frontend workflow compares the generated interfaces byte for byte and runs production Chrome acceptance against the frozen and hardened ledgers. The contracts handoff, release manifest, route evidence, accounting invariants and operational runbook are in the [V3.6.1 handoff](https://github.com/Coin-Collect/coincollect-smart-contracts/blob/31ff0617b60aaafcbe155f4a266eab9e62455c8a/projects/universal-rewards-v3/V3.6.1.md).

## What changed and what to verify

Treasury quotes expire on the chain deadline or after two minutes in the UI. Confirmation rechecks the selected path and its original minimum against the latest block. An expired quote or changed route requires a new quote. Transaction preparation verifies the settlement address, chain, ledger runtime, simulation, gas reserve and wallet account. In local mode, the wallet RPC must also agree on a numbered block hash with the selected fork. The UI waits for a successful receipt before clearing a confirmed swap.

The acceptance harness serves `next build` with `next start`, a local Sentry capture endpoint and a disposable 31337 chain. Its controlled EIP-1193 provider covers account change, wrong network, another 31337 history, rejection, a reverted receipt and retry. Verify Treasury review and permissions, stale quotes, protected swap, native withdrawal, newly approved reward selection, Auto-Swap and recovery. Check FarmCard and Treasury at 390 px, dialog focus, wallet reconnection, NFT Marketplace, Swap and Liquidity. A genuine MetaMask test uncovered a local-only notice intercepting clicks on the fixed Connect Wallet button. The notice now sits in page content, and Chrome tests click the header by pointer at desktop and mobile widths. The V2 real-factory test runs separately on an isolated Polygon fork. Registry references and runtime hashes are absent from unreviewed mainnet deployment configuration.

```sh
corepack yarn install --frozen-lockfile
corepack yarn typecheck
corepack yarn typecheck:workspaces
corepack yarn lint
corepack yarn test --runInBand --silent
corepack yarn build
COINCOLLECT_V36_FIXTURE=1 V3_BROWSER_TREASURY_SCREENSHOT=/tmp/coincollect-v361-treasury.png \
  node scripts/run-v3-browser-acceptance.cjs ../coincollect-smart-contracts/projects/universal-rewards-v3
COINCOLLECT_V36_FIXTURE=0 \
  node scripts/run-v3-browser-acceptance.cjs ../coincollect-smart-contracts/projects/universal-rewards-v3
```

Use the paired contracts commit in a pristine checkout. The browser harness prints its logs directory, generates the fixture at a loopback RPC and tears down automatically. It never requires existing wallet account data or production credentials.

## Manual wallet acceptance

Sign off each extension version in a fresh profile using disposable wallets funded only on the isolated chain. For a persistent manual session start a loopback Anvil chain with ID 31337, run the paired contracts' `COINCOLLECT_V36_FIXTURE=1 COINCOLLECT_V3_LOCAL_RPC=http://127.0.0.1:18545 node scripts/deploy-browser-fixture.cjs` and use its ledger address and runtime hash. Set `NEXT_PUBLIC_LOCAL_FORK=1`, `NEXT_PUBLIC_LOCAL_FORK_CHAIN_ID=31337`, `NEXT_PUBLIC_LOCAL_FORK_RPC=http://127.0.0.1:18545`, `NEXT_PUBLIC_FORK_BLOCK=0`, `NEXT_PUBLIC_FORK_SESSION_ID=v361-manual`, `NEXT_PUBLIC_V3_LEDGER_ADDRESS`, `NEXT_PUBLIC_V3_LEDGER_CODE_HASH` and `COINCOLLECT_V3_ENABLE_POLYGON_EXECUTION=0` for the isolated build and server. Use a unique `COINCOLLECT_NEXT_DIST_DIR`, run `corepack yarn build` and serve it with `corepack yarn next start -H 127.0.0.1 -p 3017`. Fixture admin and participant are the first two funded local accounts. For new wallets, provision only the disposable local accounts before testing.

1. Open `/nftpools`, select MetaMask or Uniswap Wallet, reject the first connection and retry. Start from a wrong network and verify the switch prompt before signing. Use the exact local RPC and chain 31337 where supported. Record an unsupported custom chain or unrecognized network as BLOCKED.
2. Reload the page and switch the active account while a Treasury confirmation is pending. Verify the account and privileges before a retry. If MetaMask responds with 4100, use its site permissions to authorize both the disposable account and the local network for this exact origin, then reconnect and review the transaction again. Switch the wallet to a distinct local RPC using chain 31337, and check that CoinCollect refuses the write. [MetaMask site permissions](https://support.metamask.io/more-web3/dapps/manage-dapp-permissions/).
3. On `/admin/nft-pools/v3`, use the local admin to deposit test WPOL, inspect the three permission toggles, review a fixture token and capture the exact confirmation addresses. Check Available, Allocated, Total and confirmed history. Withdraw available WPOL and native POL.
4. Request a Treasury quote for a route with two fixture observations. Review input, path, fee, minimum and deadline. Reject and confirm on separate attempts. Advance time for a stale quote and verify the old quote cannot be submitted. Check the on-chain receipt and exact deltas under the local RPC.
5. Create a Treasury-backed pool. Switch to the participant, join with ERC-721 and managed ERC-1155, transfer or release a partial quantity, Harvest and exit. Confirm both token balances and positions using receipts. Advance to the end of claims and verify recovery in Studio.
6. Repeat at mobile width. Record browser and wallet versions, route, local chain ID, screenshot of the confirmation and local receipt hash. Redact secrets and omit profile data. Confirm the gas-only executor cannot perform admin writes.

Real extension screens count only for the portions executed through the genuine provider. Injected-provider browser acceptance is its own check. Neither result substitutes for independent security review of the intended Polygon deployment.

On a fresh Chrome for Testing profile, MetaMask 13.57 detected CoinCollect, approved its connection, retained the authorized account after reload and switched to the loopback chain 31337. A subsequent Join request returned the wallet's 4100 permission error before broadcast. Uniswap Wallet 1.86 and 1.87 stopped at an onboarding error in fresh profiles. Sign off extension transaction receipts using the manual checks above.

## Dependency disposition

The existing production advisory gate remains mandatory and fails on critical or unreviewed production highs. The scoped WebSocket patches to 7.5.14 cover WalletConnect JSON-RPC, the webpack analyzer and jsdom. The previous WebSocket exception has been removed. The local Yarn registry audit went from 39 to 38 distinct high advisories. Counts include dev dependencies and repeated dependency paths. The audit still records every finding. [WebSocket advisory](https://github.com/advisories/GHSA-96hv-2xvq-fx4p).

| Remaining production-root high | Reachability and disposition |
| --- | --- |
| decode-uri-component via Wagmi/Web3Modal | Browser WalletConnect URL/callback parsing is reachable. Browser availability is a residual risk. The patched decoder is ESM while the locked query-string consumer uses CommonJS. Require a compatible SDK upgrade or a reviewed upstream repair and genuine-wallet acceptance before mainnet sign-off. |
| Zod via Web3Modal | Wallet frame validation is reachable. The reviewed frame schemas showed no vulnerable constrained collection. Keep frame-origin and input-bound checks in the independent review. |
| picomatch via WalletConnect storage tooling | The remaining path uses the Node file watcher. CoinCollect's wallet browser transport has no application route exposing that watcher. Recheck if server-side connector usage changes. |
| lodash.set via Snapshot | The vulnerable multicaller helper is unused by the active application. The direct wallet signing and Treasury code do not import it. Recheck on Snapshot SDK changes. |

The exact advisory IDs and earlier mitigation sources remain in the [V3.5.4 security report](universal-rewards-v354-security.md). Before launch, require specific approved token, router, pair and collection evidence, fresh on-chain observations, genuine wallet sign-off and an independent protocol audit. Keep Polygon execution disabled pending authorization.
