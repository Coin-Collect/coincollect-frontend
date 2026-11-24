# CoinCollect local testing

- On a workstation with `~/.config/coincollect/test-environment.json`, run `npm run fork:status` before testing. Use the Studio URL and wallet RPC it reports for every local integration test. The workstation currently serving the shared test environment uses Studio `http://127.0.0.1:3028/admin/nft-pools/v3`, RPC `http://127.0.0.1:49379`, and chain ID `31337`.
- Preserve the existing node, chain history, contract addresses, wallet settings, and test balances. Do not start an alternate local preview, reset or replace the chain, restore an older snapshot, reseed existing state, or change ports or chain ID. Use the existing Studio and ordinary on-chain actions for requested tests. The old cutover and repair scripts are historical tools and must not be rerun.
- If `fork:status` fails, diagnose read-only. Stop before any recovery that would change the node, chain state, or wallet configuration, and report the problem. Keep the current state files intact.
