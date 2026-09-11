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
        subtitle="The read-only Polygon builder, economics model and Phase 3 safety boundary."
        authorityScope="nft"
      >
        <Panel>
          <PanelTitle>What is live in Phase 3</PanelTitle>
          <ol>
            <li>
              Read factory provenance, original capacity, current capacity and dynamically indexed collections/rewards.
            </li>
            <li>
              Build new or cloned pools through the same NFTs → Rewards → Budget → Duration → Appearance → Review flow.
            </li>
            <li>
              Calculate exact BigNumber emissions, allocation-sized quotes and Solidity-compatible side reward
              percentages.
            </li>
            <li>Save multiple local drafts and continue a launch session without storing wallet secrets.</li>
            <li>Run a fresh Polygon preflight, then deploy, verify, configure, fund and verify again.</li>
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
            <strong>Runbook:</strong> connect the Polygon factory-owner wallet, run preflight, review the 15-minute
            setup buffer and gas/balance checks, confirm each requested wallet action, then run final verification. A
            saved launch route can be resumed after an RPC error or browser restart.
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
