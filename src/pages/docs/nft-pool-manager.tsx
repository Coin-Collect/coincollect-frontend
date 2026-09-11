import Head from 'next/head'
import AdminShell from 'features/poolManager/components/AdminShell'
import { Muted, Panel, PanelTitle } from 'features/poolManager/components/styles'

export default function NftPoolManagerDocs() {
  return (
    <>
      <Head>
        <title>CoinCollect NFT Pool Studio Runbook</title>
      </Head>
      <AdminShell
        title="NFT Pool Studio runbook"
        subtitle="Create, review and operate Polygon NFT reward pools with a guided workflow."
        authorityScope="nft"
      >
        <Panel>
          <PanelTitle>Operator experience</PanelTitle>
          <ol>
            <li>Open NFT Pool Studio and choose Quick Create for the standard one-collection COLLECT pool.</li>
            <li>
              Choose an NFT collection, enter the USDT budget and select a duration. Safe pool defaults are filled in
              automatically.
            </li>
            <li>
              Review the estimate and wallet checks. Advanced Setup remains available for multiple collections, custom
              rewards and pool rules.
            </li>
            <li>Save multiple local drafts and continue a launch session without storing wallet secrets.</li>
            <li>Create, verify, configure and fund the pool with explicit wallet confirmations.</li>
          </ol>
        </Panel>
        <Panel style={{ marginTop: 16 }}>
          <PanelTitle>Safety boundary</PanelTitle>
          <p>
            Every production write is behind an explicit operator button and wallet confirmation. There is no automatic
            approval, swap, stop, emergency recovery or ownership transfer. Tests and preflight are read-only.
          </p>
          <p>
            The launch session freezes a plan hash after the first submitted hash. Deployment addresses come only from
            the confirmed <code>NewSmartChefContract</code> event. Funding transfers only the current missing amount and
            verifies the pool balance afterward, so closing the browser does not require blind resubmission.
          </p>
          <p>
            <strong>Runbook:</strong> connect the Polygon factory-owner wallet, review the setup checks and confirm each
            requested wallet action. Setup and funding gas are freshly simulated before each confirmation. A saved
            launch route can be resumed after an RPC error or browser restart.
          </p>
          <p>
            The safety gate re-reads the connected signer network/account, factory or pool owner, bytecode, pool
            fingerprint, token mapping, current block and native POL immediately before every write. A stale check,
            changed frozen plan, failed verification, started pool, unknown receipt or missing read blocks without a
            wallet popup.
          </p>
          <p>
            <strong>First-canary checklist:</strong> factory-owner wallet connected; Polygon selected; enough POL and
            reward token; correct NFT collection; intentionally tiny reward; no side reward; no performance fee; start
            buffer and plan hash reviewed; fresh preflight. After deployment, review the emitted address and every
            deployment, NFT power, funding and final verification PASS before using the admin registry.
          </p>
          <p>
            Quotes are explicitly fresh, stale or expired. Same-token budgets use an exact identity quote, and every
            router quote receives only its allocated budget amount. Manual reward amounts stay usable for planning but
            are marked for review because they do not prove a budget valuation.
          </p>
          <p>
            Side rewards are calculated from paid primary pending rewards, not from an independent side-reward emission
            schedule. The review shows maximum implied side funding; fragmented claims can pay less because the contract
            truncates each payout.
          </p>
          <p>
            <strong>Weight warning:</strong> the V2 contract allows the owner to change collection weights after a pool
            starts. Existing deposits keep their snapshots while later deposits can use the new weight. Review this
            policy before any future write workflow.
          </p>
          <p>
            <Muted>Full version-controlled details are in docs/nft-pool-manager.md.</Muted>
          </p>
        </Panel>
      </AdminShell>
    </>
  )
}
