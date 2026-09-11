import Head from 'next/head'
import AdminShell from 'features/poolManager/components/AdminShell'
import { LinkText, Muted, Panel, PanelTitle } from 'features/poolManager/components/styles'

export default function PoolManagerDocs() {
  return (
    <>
      <Head>
        <title>CoinCollect Pool Manager Runbook</title>
      </Head>
      <AdminShell
        title="Pool Manager runbook"
        subtitle="Operational notes for the browser-wallet Polygon CoinStake v2 lifecycle."
      >
        <Panel>
          <PanelTitle>Safe sequence</PanelTitle>
          <ol>
            <li>Connect the factory-owner EOA on Polygon 137.</li>
            <li>Review the exact pair, decimals, schedule, reward budget and controls.</li>
            <li>
              Deploy, wait for the receipt, parse <code>NewSmartChefContract</code>, then verify every field.
            </li>
            <li>
              Fund separately with the explicit ERC20 transfer action. The default amount is the planned schedule
              maximum.
            </li>
            <li>Keep the old pool available for withdrawals and harvest when renewing.</li>
          </ol>
        </Panel>
        <Panel style={{ marginTop: 16 }}>
          <PanelTitle>Important facts</PanelTitle>
          <p>
            Configured factory: <code>0x3C5B3a8e324bD13D4F74aA2c1932DFF81e646394</code> on Polygon.
          </p>
          <p>
            Pool identity is canonical <code>chainId:address</code>. Discovery reads factory events in bounded chunks
            and can use a read-only indexer fallback. A pool is accepted only when its immutable{' '}
            <code>SMART_CHEF_FACTORY</code> matches the configured factory.
          </p>
          <p>
            Reward math uses base-unit integer arithmetic: <code>floor(budget / blocks)</code>, then reports planned
            maximum and residual. Block time is sampled from recent blocks; a fallback is labeled in the UI.
          </p>
          <p>
            <Muted>The full version-controlled notes are in </Muted>
            <LinkText
              href="https://github.com/Coin-Collect/coincollect-frontend/blob/main/docs/pool-manager.md"
              target="_blank"
              rel="noreferrer"
            >
              docs/pool-manager.md
            </LinkText>
            .
          </p>
        </Panel>
      </AdminShell>
    </>
  )
}
