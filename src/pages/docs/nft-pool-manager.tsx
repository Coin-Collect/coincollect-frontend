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
          <PanelTitle>What is live in Phase 1.5 + 2</PanelTitle>
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
            <li>Save multiple local drafts and produce a dry-run deployment plan without a transaction object.</li>
          </ol>
        </Panel>
        <Panel style={{ marginTop: 16 }}>
          <PanelTitle>Safety boundary</PanelTitle>
          <p>
            Deployment, reward funding, approvals, swaps, collection-weight updates, stopping and recovery actions are
            not available. Saving a draft only writes to this browser&apos;s local storage.
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
