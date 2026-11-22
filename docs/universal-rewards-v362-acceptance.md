# V3.6.2 final acceptance

The Solidity audit candidate remains V3.6.1. Use the [contract handoff](https://github.com/Coin-Collect/coincollect-smart-contracts/blob/a68421dc32b69a71d4625a9ffb69f0cd79788c03/projects/universal-rewards-v3/V3.6.2-audit-handoff.md), the [dependency risk register](universal-rewards-v362-dependencies.md) and the [wallet evidence](universal-rewards-v362-wallet-evidence.json). The V3.6 browser job uploads the pair of exact source commits, the compiler-input hash, and desktop and mobile Treasury screenshots.

## Production acceptance findings

On Chrome for Testing with MetaMask 13.57.0.0, the disposable account connected, stayed authorized after reload, and switched from Ethereum to the isolated network. A rejected transaction left the nonce unchanged. The retry produced an ERC-721 Join receipt and ownership stayed with the wallet. Harvest increased the on-chain reward balance. ERC-721 Unstake confirmed with a deliberate delay between estimate and signature.

The app rejected a wallet RPC pointing to a different history at the same chain ID and block height, before requesting a signature. Returning the RPC proxy to its first upstream did not immediately restore the wallet session. Reject and retry were verified separately with a stable RPC. Record an explicit app disconnect and reconnect separately from reload when signing off.

During genuine Unstake testing, an estimate taken just after Harvest missed the cost of a reward transfer at the later execution block. One local transaction reverted. The frontend now budgets additional gas for ledger `claim`, `claimReward` and `exit`. The delayed Unstake passed after the correction. In controlled-provider Chrome, a confirmed native POL withdrawal reached the correct balance before Treasury history caught up. History refresh now reads the latest block without reusing the previous block-number cache.

Uniswap Wallet 1.87.0.5 stopped in `onboarding.html` with “Something went wrong” before connecting to the app. The extension's registration requests aborted. Its public support list omits chain 31337. Treat this acceptance as BLOCKED and follow the founder checklist before signing off. [Uniswap supported networks](https://support.uniswap.org/hc/en-us/articles/40074184880525-Networks-on-Uniswap/)

| Genuine wallet check | Result | Evidence or next acceptance step |
| --- | --- | --- |
| MetaMask connect, reload, Ethereum to local switch | PASS | Approved the actual site and network prompts. Verified the authorized account and settlement chain. |
| MetaMask explicit disconnect and reconnect | BLOCKED | Reload preserved the session. The automated attempt found the connected account label outside the viewport and did not activate Disconnect. Verify the interaction through the visible account menu in founder step 1. |
| MetaMask two independent histories on chain 31337 | PASS for rejection | App detected the wrong history before signing. Confirm same-origin session recovery after restoring the production test RPC in founder step 3. |
| MetaMask rejection and retry | PASS | Cancel left the nonce unchanged. A subsequent approval produced the Join receipt. |
| MetaMask ERC-721 Join, Harvest, Unstake | PASS | Three successful receipts, unchanged NFT ownership after Join, and reward balance increased after Harvest. |
| MetaMask Treasury deposit, token registration, protected swap, WPOL and POL withdrawals, pool creation and funding | PASS | Genuine receipts for deposits, both withdrawals, a protected swap, review and approval, and atomic pool funding. Checked the available and allocated balances, reward-token eligibility and the pool reward asset on the local chain. |
| MetaMask ERC-1155 quantity, partial transfer, Harvest and partial exit | PASS for signed operations | Genuine receipts for six-unit Join, two-unit ownership transfer, one-unit exit and reward payout. Checked retained units, participation, power and the increased reward balance. |
| MetaMask ERC-1155 expiry and recovery | PASS | An overdue claim reverted with `ClaimPeriodEnded()`. In a separate run the app displayed expiry and MetaMask signed the exact recovery call from the app origin. Studio's recovery controls passed separately in controlled-provider Chrome. |
| Uniswap Wallet on chain 31337 | BLOCKED | The extension stopped during onboarding. Verify a supported local RPC and complete founder step 9. |

## Isolated production wallet session

Use a clean paired checkout and a fresh Chrome profile for each wallet. The role accounts are the first two funded accounts of a disposable Anvil instance. Import only accounts created for this isolated instance. Never use an everyday wallet or a mainnet RPC for these steps.

In a terminal start Anvil on loopback. The fee flags were used in the successful MetaMask receipt runs.

```sh
anvil --host 127.0.0.1 --port 18545 --chain-id 31337 \
  --base-fee 1000000000 --gas-price 1500000000
```

In the pinned contracts checkout, execute the fixture from `projects/universal-rewards-v3`. Keep the returned JSON local and note `operator`, `participant`, `ledger`, `runtimeHash`, `managed`, and `dynamic`.

```sh
npm ci --workspaces=false --ignore-scripts
COINCOLLECT_V36_FIXTURE=1 COINCOLLECT_V3_LOCAL_RPC=http://127.0.0.1:18545 \
  node scripts/deploy-browser-fixture.cjs > /tmp/coincollect-v362-founder-fixture.json
```

In a separate terminal from the frontend checkout, keep the same environment for both the production build and server.

```sh
corepack yarn install --frozen-lockfile
export NEXT_PUBLIC_LOCAL_FORK=1 NEXT_PUBLIC_LOCAL_FORK_CHAIN_ID=31337
export NEXT_PUBLIC_LOCAL_FORK_RPC=http://127.0.0.1:18545 NEXT_PUBLIC_FORK_BLOCK=0
export NEXT_PUBLIC_FORK_SESSION_ID=v362-wallet-acceptance
export NEXT_PUBLIC_V3_LEDGER_ADDRESS="$(node -p "require('/tmp/coincollect-v362-founder-fixture.json').ledger")"
export NEXT_PUBLIC_V3_LEDGER_CODE_HASH="$(node -p "require('/tmp/coincollect-v362-founder-fixture.json').runtimeHash")"
export COINCOLLECT_NEXT_DIST_DIR=.next-verification/v362-wallet-acceptance
export COINCOLLECT_V3_ENABLE_POLYGON_EXECUTION=0
corepack yarn build
corepack yarn next start -H 127.0.0.1 -p 3017
```

### Founder checklist

1. At `http://127.0.0.1:3017/nftpools`, open Connect Wallet, verify the extension, reject one connection request and retry. Reload, then disconnect through the account menu and reconnect. Record which account the app and extension display.
2. While connected to another network, click Switch network. Confirm the loopback origin, RPC URL and chain ID 31337. If MetaMask shows 4100, open the site's permissions in the extension, grant the disposable account and local network to the exact origin, and reconnect. A visible address alone does not prove permission to submit a transaction. [MetaMask permissions](https://support.metamask.io/more-web3/dapps/manage-dapp-permissions/)
3. For the same-chain negative test, configure a second Anvil chain on another port with chain ID 31337. Verify that the two instances return different hashes at a common block height. Point only the wallet at the second history. The app must show the local RPC mismatch and leave the nonce unchanged. Restore the original RPC and reload before retrying.
4. In `/admin/nft-pools/v3`, open Treasury as the fixture operator. Deposit test POL as WPOL, then withdraw separately as WPOL and native POL. Compare the available amount and the confirmed history to each local receipt.
5. Check the fixture's next token, review the decimals and runtime hash, enter a local evidence hash and one base unit as the probe. Enable Deposit and Reward. Confirm the exact approval and registration, then deposit and verify balances. In Manage token permissions, check that Reward and Swap can be controlled separately.
6. Use WPOL and the fixture stable asset for a protected Treasury swap. From a separate disposable observer account, seed two permissionless adapter observations at least 1,800 seconds apart before requesting the quote. Keep Studio writes on the wallet's own transaction sequence. Reject once, obtain a fresh quote when required, then sign and verify available in/out, swap totals and untouched allocated funds. Capture mobile and desktop review screens.
7. Create a pool with the next token and eligible fixture ERC-721 collection, and reserve its funded budget from Treasury. Verify the pool identifier, token allocation and actual debit before switching to the participant. Join, advance the isolated clock, Harvest, and Unstake selected NFTs. Verify successful receipts, rewards and unchanged NFT ownership on Join.
8. Use a pool bound to the fixture ERC-1155 adapter. Join with a quantity, transfer a subset to the other disposable account, then use a partial exit and Harvest. Verify holdings, participation and reward balance on chain. Finish and verify every Harvest confirmation before advancing the isolated time. Advance to pool end plus 30 days, confirm expired claims stay disabled, then execute recovery and verify the Treasury receipt.
9. Complete the same sign-off with the genuine Uniswap Extension when onboarding and a correct isolated RPC are available. Install from the Chrome Web Store in a fresh profile, open its sidebar, create a new disposable wallet, then verify that it can select the exact local RPC. Record the onboarding error or unsupported network if it blocks. [Uniswap installation](https://support.uniswap.org/hc/en-us/articles/25811961063821-How-to-download-the-Uniswap-Extension/) · [Supported networks](https://support.uniswap.org/hc/en-us/articles/40074184880525-Networks-on-Uniswap/)

For each write, save the extension version, local chain ID, confirmation outcome, receipt hash/status and the expected balance or position delta. Keep wallet keys and recovery phrases out of screenshots and logs. Review all wallet alerts and verify the expected target before confirming.

## Release boundaries

Automated production Chrome uses a controlled provider. The production-code verification run passed full TypeScript, workspace TypeScript, lint with zero errors, 2,742 Jest tests, the Next.js 16 production build, frozen and V3.6 production Chrome, and both generated ABI comparisons. The one environment-gated V2 lifecycle test also passed in a separate isolated Polygon fork run. [Frontend verification and screenshots](https://github.com/Coin-Collect/coincollect-frontend/actions/runs/45020373878)

Contracts CI passed 43 Solidity tests and both pinned fork suites, including all 12 V3.6.1 swap directions. The compiled source artifact contains all 34 standard-JSON source inputs and the checked V3.5.4 diff. [Contracts verification and compiled sources](https://github.com/Coin-Collect/coincollect-smart-contracts/actions/runs/45020330653)

The contract package is suitable for independent review with the open items listed. Mainnet remains NO-GO pending the independent audit, completion of wallet sign-off, fresh production route and asset approvals, and an operational pause/recovery/executor drill.
