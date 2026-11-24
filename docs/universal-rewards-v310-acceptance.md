# V3.10 release candidate acceptance

The candidate keeps existing immutable ledgers, Treasuries, positions and claims in place. Studio switches the ledger context, checks the configured chain and both runtime hashes, and verifies the Treasury-to-ledger relationship in both directions. Pool IDs, public links, presentation documents and writes are scoped to the selected deployment. The default address and hash remain explicit. V2 routes continue to use their existing contracts.

## Deployment registry

Set `NEXT_PUBLIC_V3_LEDGER_ADDRESS` and `NEXT_PUBLIC_V3_LEDGER_CODE_HASH` for the default. Optionally supply `NEXT_PUBLIC_V3_DEPLOYMENT_REGISTRY` as a JSON array of records with `id`, `chainId`, `address`, `runtimeHash` and `treasury: {address, runtimeHash}`. IDs form stable links and must identify one ledger each. All entries belong to the same runtime chain. The default must exist in the array. Publish presentation manifests as `v3-pools-<lowercase-ledger-address>.json` when using a registry. Existing presentation data is accepted from the old URL only if the document identifies the selected ledger.

The checked-in local example is activated only for the protected chain checkpoint and a known default deployment. It points to the existing V3.7, V3.9 and V3.10 ledgers. V3.8 uses the same ledger implementation as the V3.9 deployment and has no separate local address. Use `node scripts/verify-v3-deployments.cjs 366` to compare holdings, funding and reward reserves, positions and entitlement digests at the protected block. The script reads only. GitHub CI uses its own fixtures.

The automation endpoint retains its existing explicitly configured default ledger and executor. Before a production default changes, schedule the operations required for any legacy pool still relying on automation. A Studio selection cannot authorize worker writes.

## Reproducibility and release gates

- The frontend release lock records the contracts commit, committed release manifest, compiler input digest and runtime size. CI compares the V3.10 interfaces used by the frontend to the compiled ledger, Treasury, route planner, registry and batch adapter. The pairing artifact records exact frontend and contracts commits.
- The release workflow also runs the existing V2 factory and user lifecycle suite on an isolated Anvil fork of the pinned Polygon block. The suite exercises approval, staking, harvest, partial exit and emergency recovery with fixture funds.
- The V3.10 ledger is 24,538 bytes with 38 bytes of EIP-170 headroom. The compiled bytecode is versioned separately from the checked local deployment. The contracts pipeline enforces the size limit.
- Mainnet remains blocked pending independent audit, production role and token/route approval, verified deployment parameters and addresses, automation and monitoring rehearsal, real wallet extension acceptance, and explicit approval for merge and release.
