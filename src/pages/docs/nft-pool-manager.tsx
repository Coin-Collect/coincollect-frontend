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
        subtitle="Phase 0 audit findings and the Phase 1 read-only operating boundary."
        authorityScope="nft"
      >
        <Panel>
          <PanelTitle>What is live in Phase 1</PanelTitle>
          <ol>
            <li>Read configured NFT farms, NFT SmartChefFactory events and deployed V2 pool state.</li>
            <li>Keep legacy MasterChef pids 1–4 visible with their ABI limitations.</li>
            <li>Separate on-chain truth from frontend labels, links, images and collection metadata.</li>
            <li>Clone a pool into a local editable draft without reusing deployment or runtime identifiers.</li>
          </ol>
        </Panel>
        <Panel style={{ marginTop: 16 }}>
          <PanelTitle>Safety boundary</PanelTitle>
          <p>
            Deployment, reward funding, approvals, swaps, collection-weight updates, stopping and recovery actions are
            not available. Saving a draft only writes to this browser&apos;s local storage.
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
