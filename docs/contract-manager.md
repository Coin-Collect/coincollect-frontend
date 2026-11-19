# Contract Manager

Open `/contract-manager` from More, or `/admin/contract-manager` from the existing admin panel. The public route supports inspection before a wallet connects. The admin route uses the regular factory-owner gate. The wallet must be connected to Polygon for production withdrawals. In local fork mode the tool stays on the loopback fork and skips external ABI lookup.

Enter a contract address to check native POL, tracked CoinCollect tokens, token addresses exposed by supported contract getters, or up to five manually entered ERC-20 addresses. This is a list of checked assets. It does not enumerate every token on the chain. The page also shows readable ownership, declared roles for the connected wallet, and exact function signatures when the ABI is available.

The withdrawal flow reads the amount for the connected wallet, previews the recipient and fee, rechecks the same withdrawal immediately before the wallet prompt and tracks the transaction receipt. The user signs in their wallet. A change in wallet, amount, calldata, recipient or an increased maximum fee requires a new preview.

| Reviewed runtime                                                   | Enabled withdrawal                                                                                                                                                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Polygon NitroClash at `0xB2e4ab09684a4850d3271C53D39D68C9afA4785E` | Native `withdraw()` to the current owner. The RPC must also prove a single transfer of the exact amount to that wallet in the simulation trace.                                                     |
| Standalone Ownable Receipts fixture                                | Native `withdrawFunds()` to the current owner, for the matching runtime only.                                                                                                                       |
| Standalone OpenZeppelin PaymentSplitter 4.9.6                      | Native `release(address)` or `release(address,address)` for the reviewed Polygon WPOL token. The recipient is the connected payee, and the amount comes from the corresponding `releasable` getter. |

`profiles.ts` pins full runtime bytecode hashes. For Ownable Receipts use the checked-in fixture and solc 0.8.30, Paris, optimizer on with 200 runs, `metadata.bytecodeHash: none`. For PaymentSplitter use the unmodified source tree at the OpenZeppelin v4.9.6 tag, with imports rooted at `contracts/`, solc 0.8.30, Paris or Cancun, optimizer off or on with 200 runs, and the same metadata setting. No deployed template or new service is required by the frontend.

An ABI from [Sourcify](https://docs.sourcify.dev/docs/api/) is accepted for inspection when its deployed bytecode matches the connected chain's bytecode. CoinCollect's existing ABIs can also be shown as project references. ABI names, selectors and ownership alone never activate writes. Unreviewed bytecode, upgradeable variants, reviewed methods with unrecognized arguments or tokens, and missing simulation evidence stay read-only.
