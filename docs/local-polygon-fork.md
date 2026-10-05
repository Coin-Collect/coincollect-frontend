# CoinCollect local Polygon fork

This is an isolated manual-development environment. Anvil forks Polygon state for reads, but exposes a different local chain ID (`31337`). The app’s fork mode uses only `127.0.0.1:18545`; if Anvil stops, Polygon RPC reads fail closed. Local transactions are never broadcast to Polygon mainnet.

The fork uses the real Polygon NFT SmartChef factory, token contracts and WPOL contract at the selected fork block. The seed command transfers that forked factory’s ownership to a deterministic local test account. It also clears an inherited EIP-7702 delegation record from that known test account on the loopback fork only, so the UI can correctly treat the signer as an EOA. If available, it impersonates a token holder **inside Anvil only** to copy real COLLECT/USDT balances into the local account. Otherwise it mints clearly-labelled fork-only COLLECT/USDT fixtures. No private key or signed transaction is sent to the upstream Polygon RPC.

## Install once

From the repository root:

```sh
npm run fork:install
```

Fork tools install under `scripts/local-fork-tool/`; this intentionally avoids reinstalling or modifying the frontend dependency tree.

## Start and seed

Terminal 1 — start the Polygon fork and leave this terminal running:

```sh
npm run fork:start
```

Terminal 2 — seed the deterministic wallet and check readiness:

```sh
npm run fork:seed
npm run fork:status
```

Terminal 3 — start the fork-only frontend:

```sh
npm run dev:fork
```

Open [http://localhost:3001](http://localhost:3001). Do not use `localhost:3000` for this fork flow: the existing development server there is left untouched. The fork frontend has a visible **LOCAL FORK · Chain 31337** banner, accepts only the local chain, and does not fall back to a public Polygon RPC when the fork is unavailable.

## MetaMask

Add this network manually:

| Setting         | Value                            |
| --------------- | -------------------------------- |
| Network name    | CoinCollect Polygon Fork (LOCAL) |
| RPC URL         | `http://127.0.0.1:18545`         |
| Chain ID        | `31337`                          |
| Currency symbol | `POL`                            |
| Block explorer  | Leave empty                      |

Import the deterministic Anvil account **#0** only into a local-development MetaMask profile:

- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Public deterministic development key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- The key is intentionally public and is also Anvil’s documented default account #0 key. It is not a secret, has no legitimate mainnet funds, and must never be reused or imported as a real account. Do not enter your real seed phrase or private key.

For user staking tests, also import the separate deterministic Anvil account **#2**:

- Address: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- Public local-development key: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`
- This is another public Anvil development key only. Never use it as a real account or on Polygon mainnet.

After connecting, confirm MetaMask still shows **CoinCollect Polygon Fork (LOCAL)** and chain `31337`. Native **POL** is gas. **WPOL** is a separate ERC-20 reward token.

## Prepared assets and ownership

`npm run fork:status` prints the current local balances and addresses. Every reset reseeds them.

- Both imported test wallets (admin account #0 and NFT user account #2) are seeded to at least 5,000,000 canonical Polygon COLLECT when a fork holder can provide it; otherwise a fork-only COLLECT faucet token fills the target. For USDT, the seed tries known Polygon holders first and uses the fork-only USDT faucet token when canonical funding is unavailable. `npm run fork:status` prints canonical and fork-only balances and addresses separately.
- Both test wallets receive 1,000,000 WPOL at the real Polygon WPOL contract address, wrapped from synthetic native POL on this fork. About 10,000 native POL remains separately available for gas.
- A local ERC-721 test collection with at least two wallet-owned token IDs. Status prints the contract and IDs. It supports the ERC-721 approval and transfer methods.
- A second local user account with 10,000 native POL and three IDs in each test NFT collection. `fork:status` prints this wallet address and IDs; use it to test staking from a non-admin wallet.
- The configured Polygon NFT SmartChef factory, forked at its real address, with its owner transferred to the test account **on the local fork only**.

Fork-only mock token balances are not real Polygon assets. When selecting these in Card Studio, add them by the addresses printed by `fork:status`; known-token entries still point to their canonical Polygon addresses.

## Manual Card Studio flow

1. Confirm `npm run fork:status` says `ready for manual UI testing: YES`.
2. Open `http://localhost:3001`, connect the test wallet and verify the local-fork label.
3. Go to **Admin → NFT Pools → Create Pool**. The test account is the fork-local factory owner, so the Admin item appears only after connecting it.
4. Add the test NFT collection by its status-printed address. Select token ID `1` (or another wallet-owned ID shown by status).
5. Select WPOL, or add the fork-only COLLECT/USDT reward address as a custom token. Set budget/duration, then **Review Pool**.
6. Click **Create Pool** and approve the guided deployment, NFT power configuration and funding transactions in MetaMask. These confirmations target only chain `31337` through the local RPC.
7. Wait for **COMPLETE** and local publication confirmation. Open **NFT Pools** or `http://localhost:3001/nftpools`; the upcoming V2 pool card should be visible.

### Stake, harvest and withdraw as a user

Keep the same browser profile and local-fork origin so the locally published card remains visible. Use the pool address shown on the completed launch screen or its PolygonScan-style local card link.

1. In MetaMask, switch from account **#0** (pool administrator) to account **#2** (NFT user). Confirm chain `31337` and native POL in the wallet.
2. In Terminal 2, activate the pool on the local chain:

   ```sh
   npm run fork:advance -- --pool <pool-address> --to start --blocks 1
   ```

3. Reload `/nftpools`, find the pool, and press **Stake NFT**. Choose an ID printed for account #2 by `fork:status`.
4. Approve each selected NFT collection in its own MetaMask confirmation. After approvals confirm, press **Stake NFTs** separately.
5. Mine local blocks to accrue rewards, then harvest:

   ```sh
   npm run fork:advance -- --pool <pool-address> --to start --blocks 20
   ```

   Press **Harvest rewards** on the pool card. You can then test **Stake more** and **Unstake** with another/selected ID.

6. To test the finished-pool exit, mine beyond its end block and use **Finished** (or **Staked only**) to find the card:

   ```sh
   npm run fork:advance -- --pool <pool-address> --to end --blocks 1
   ```

   Press **Withdraw staked NFTs**. The separate **Emergency withdraw all** path explicitly forfeits pending rewards and should only be used when testing that behavior.

The frontend test uses a distinct origin (`localhost:3001`) and namespaced local storage, separate from the ordinary app at `localhost:3000`.

## Automated fork verification

With the fork running and seeded, the launch-engine fork integration test uses the real factory and deploys/configures/funds/verifies a pool on the local fork, then tests address-native publication and the complete user lifecycle: NFT discovery, collection approvals, multi-collection stake, harvest of primary and side tokens, stake-more, partial normal withdraw, explicit emergency recovery, and a finished-pool withdraw. It reverts its Anvil snapshot afterward:

```sh
npm run test:fork
```

This is local-fork verification, not a production launch. It does not test MetaMask UI interaction.

## Reset

With Terminal 1 (Anvil) still running:

1. Stop Terminal 3 with `Ctrl+C`.
2. Run in Terminal 2:

   ```sh
   npm run fork:reset
   npm run fork:status
   ```

3. Restart the frontend in Terminal 3 with `npm run dev:fork`.

Reset restores the pinned fork block, removes local deployments/funding/ownership changes, reseeds the test assets and rotates the browser’s fork-local storage namespace. If you instead stop Anvil and run `fork:start` again, it creates a fresh fork from the latest Polygon block.

## Troubleshooting

- **MetaMask is on the wrong network:** select CoinCollect Polygon Fork (LOCAL), chain `31337`; do not switch to Polygon mainnet (`137`).
- **No native POL:** run `npm run fork:seed`, then inspect `npm run fork:status`.
- **No COLLECT/USDT/WPOL:** `fork:status` distinguishes canonical Polygon token balances from faucet-token balances. Add the fork-only token’s printed address as a custom reward. Native POL is not WPOL.
- **No NFT:** add the test collection address shown by `fork:status`; use an ID in “wallet-owned test NFT IDs”. If needed, rerun `npm run fork:seed`.
- **Factory owner mismatch / Admin item missing:** seed transfers ownership on this fork only. Run `npm run fork:status`. A contract-owned factory is explicitly reported as unsupported by this browser-wallet flow.
- **Fork RPC stopped:** restart Terminal 1. The fork app shows RPC errors and does not use public RPC fallback. Restart Terminal 3 only if Next reports that its port is occupied.
- **Frontend looks like mainnet or is on port 3000:** stop and use `npm run dev:fork`; the fork flow is on port `3001` and must display the LOCAL FORK banner.
- **Port 18545 or 3001 is occupied:** the fork commands refuse to take over or kill another process. Identify and stop the process yourself before retrying.
- **Fork source unavailable:** Anvil needs read access to a Polygon HTTPS RPC when starting/resetting. Set `COINCOLLECT_FORK_UPSTREAM` to an HTTPS Polygon RPC endpoint for both the start and reset command. It is used only as the read-only fork source.

The fork does not auto-mine background blocks; transactions mine locally on demand. This keeps the fork quiet and leaves a new pool in its expected **Upcoming** state. The automated lifecycle test explicitly mines blocks to verify upcoming/active/finished transitions. Never run this workflow on chain `137`, and never use a real wallet account for the fork UI.
