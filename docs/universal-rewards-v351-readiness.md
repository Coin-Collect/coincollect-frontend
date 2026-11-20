# Universal Rewards V3.5.1 platform and quality gates

The frontend uses Node 22 and Next.js 16.4.6 Pages Router with webpack. React and React DOM remain at 18.3.1 to preserve the existing UI and wallet stack while it is verified. Next.js 16 accepts React 18 and warns about its removal in the next major. The build uses Sentry 11.16.0, TypeScript 5.9.3 and the single root Yarn 1.22.22 lockfile. Wagmi 2.12.7, Viem 2.20.1, Web3Modal 5.1.4 and styled-components 5.3.11 remain the integration versions. Next.js links render a single anchor, and the Sentry server and client use the Next.js instrumentation entry points. [Next.js support policy](https://nextjs.org/support-policy)

The unified admin, Central Treasury, Polygon rules, 30-day claim period and V3.5 reward accounting are defined by the same Solidity artifacts. The CI browser job pins contracts commit `e744a98fb648ad521591084307aa676e916ea71f` and compares the generated runtime interaction ABI with the frontend source. [Contract release package](https://github.com/Coin-Collect/coincollect-smart-contracts/blob/e744a98fb648ad521591084307aa676e916ea71f/projects/universal-rewards-v3/V3.5.md)

## Required checks

```sh
yarn install --frozen-lockfile
yarn lint
yarn typecheck
yarn test --runInBand
yarn build
node scripts/run-v3-browser-acceptance.cjs ../coincollect-smart-contracts/projects/universal-rewards-v3
```

- **Lint PASS.** The original Pages Router lint policy runs on the app and workspaces through flat config. React Compiler adoption is outside this migration. The original 49 errors were resolved without weakening the existing hook-order, JSX or imports rules. The checked run reported 228 warnings and zero errors.
- **V3 TypeScript and targeted tests PASS.** The previously failing application tests now check the Polygon APR schedule, elapsed-day output and serialized Polygon contract addresses. Pure exchange and updater logic runs without importing live wallet integrations.
- **Full Jest FAIL.** The test runner includes the UI kit and existing configuration tests. UI-kit snapshots were compared against V3.5 rendered with the same test toolchain before updating. The full run reported 2,339 passing tests, 425 failures across farm/pool/token configuration and translation inventory, and 38 passing snapshots. The V2 fork test is run separately with an isolated archive-backed RPC.
- **Full TypeScript FAIL.** The gate checks all application and workspace sources. The full workspace run reported 1,900 diagnostics across 441 files, including older exchange, farm, NFT, prediction, governance and shared components. Common causes are unchecked optional RPC and application state, incompatible model shapes and legacy UI props. The production build enforces this gate directly.
- **Production build FAIL, production browser BLOCKED.** The browser runner builds with the same fixture address, code hash and loopback RPC it uses at runtime. It starts `next start` only after the normal Next.js build succeeds. The development smoke independently verifies real fixture transactions, including NFT ownership, Treasury, claims, managed ERC-1155 quantities and recovery. Production instrumentation and browser-only compatibility still require this gate to pass.

## Dependency security

The frontend moved the framework and reporting SDK to newer versions, patched Swiper, sharp, lodash and affected form-data/ethers transitive paths, and removed unused Lerna and React Moralis dependencies. The npm registry audit of the Yarn lockfile reported zero distinct critical advisories after these changes. The audit still reports 93 distinct high, 75 moderate and 20 low advisories, including Axios and older connector/tooling dependencies. Reachability, safe version updates and production browser verification remain release requirements. Avoid interpreting unique advisory counts as the count of vulnerable production call paths.

The Solidity tooling audit overrides `tmp` to 0.2.7 and `ws` to 8.23.0. Its explicit compiler stays solc 0.8.30 with OpenZeppelin 5.4.0. The standard compiler input, all ten creation/runtime artifact records and all exported frontend ABIs match V3.5. The release uses local HTTP fixtures and HTTPS upstream archive reads. [Deployment and privilege runbook](https://github.com/Coin-Collect/coincollect-smart-contracts/blob/pool-management/projects/universal-rewards-v3/V3.5-operations.md)

**Release status BLOCKED.** The contract artifacts are internally reproduced and ready for review. The frontend is in migration and the repository-wide release gates must pass before a release submission. Contract verification remains separate from independent security review.
