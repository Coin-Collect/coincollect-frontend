import styled from 'styled-components'
import { shortAmount } from './presentation'
import type { V3Preview } from './studio'
import { V3Metrics, V3Muted } from './styles'

const TableRegion = styled.div`
  overflow-x: auto;
  max-inline-size: 100%;
  margin: 16px 0;
  table {
    inline-size: 100%;
    border-collapse: collapse;
  }
  caption,
  th,
  td {
    text-align: start;
    padding: 8px;
  }
  caption {
    font-weight: 700;
  }
  thead,
  tbody tr {
    border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  }
`

const WarningList = styled.ul`
  padding-inline-start: 20px;
  margin: 12px 0;
  color: ${({ theme }) => theme.colors.text};
  list-style: disc;
`

export default function V3EconomicPreflight({ preview }: { preview: V3Preview }) {
  const { economics, fundingAsset, funding } = preview
  const fundingAmount = (amount: bigint) => `${shortAmount(amount, fundingAsset.decimals)} ${fundingAsset.symbol}`
  const fee = (pol?: bigint, equivalent?: bigint) => {
    if (pol === undefined) return 'Gas price unavailable'
    return `${shortAmount(pol, 18)} POL${equivalent === undefined ? '' : ` · about ${fundingAmount(equivalent)}`}`
  }
  const warnings = [
    economics.purchases.some(({ guardExceeded }) => guardExceeded) &&
      'At the current gas price, at least one purchase is estimated to exceed the automation fee limit and may be deferred.',
    economics.expensiveAutomation &&
      'Estimated lifetime automation costs reach at least 10% of the reward budget at the current quote.',
    economics.hasMissingValuation &&
      'A protected funding-to-POL quote is unavailable for at least one trade size. Treasury purchases at that size may be deferred.',
    economics.gasPriceUnavailable && 'Fee estimates require a live Polygon gas price.',
    economics.scenarios.some(({ fits, feeExceedsShare }) => fits && feeExceedsShare) &&
      'For at least one participation scenario, joining and claiming could cost more than the estimated reward share.',
  ].filter(Boolean)
  const showPower = economics.minPower !== economics.maxPower

  return (
    <section aria-label="Economic preflight">
      <h3>Economic preflight</h3>
      <V3Metrics>
        <div>
          <dt>Lifetime funding</dt>
          <dd>{fundingAmount(funding.budget)}</dd>
        </div>
        <div>
          <dt>Purchase schedule</dt>
          <dd>
            {preview.consolidated
              ? 'One purchase per reward asset'
              : `Up to ${economics.windows} modeled windows per asset · every ${funding.interval / 3600}h`}
          </dd>
        </div>
        <div>
          <dt>Lifetime automation estimate</dt>
          <dd>{fee(economics.automationFee, economics.automationInFunding)}</dd>
          <dd>{economics.purchaseGas.toLocaleString('en-US')} purchase gas</dd>
          <dd>
            {economics.observationGas.toLocaleString('en-US')} TWAP gas · {economics.observations} modeled observations
          </dd>
        </div>
        <div>
          <dt>Join and harvest one NFT</dt>
          <dd>{fee(economics.participantFee, economics.participantInFunding)}</dd>
          <dd>{economics.participantGas.toLocaleString('en-US')} gas</dd>
        </div>
      </V3Metrics>
      {warnings.length > 0 && (
        <WarningList aria-label="Economic warnings">
          {warnings.map((warning) => (
            <li key={String(warning)}>{warning}</li>
          ))}
        </WarningList>
      )}
      <TableRegion tabIndex={0} role="region" aria-label="Participation scenarios">
        <table>
          <caption>Lifetime reward share by participation</caption>
          <thead>
            <tr>
              <th scope="col">Positions</th>
              <th scope="col">Wallets</th>
              <th scope="col">Equal power per NFT</th>
              {showPower && <th scope="col">Highest-power NFT</th>}
            </tr>
          </thead>
          <tbody>
            {economics.scenarios.map(({ positions, wallets, equalShare, weightedShare, fits }) => (
              <tr key={positions}>
                <th scope="row">{positions.toLocaleString('en-US')}</th>
                <td>{fits ? wallets : 'Outside pool limits'}</td>
                <td>{fits ? fundingAmount(equalShare) : '—'}</td>
                {showPower && <td>{fits ? fundingAmount(weightedShare) : '—'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </TableRegion>
      <V3Muted>
        Scenarios assume continuous enrollment, available rewards and as many distinct wallets as the pool permits.
        {showPower &&
          ` The weighted case gives one NFT ${economics.maxPower} power and all others ${economics.minPower}.`}{' '}
        Shares use the funding asset as a reference. Actual payouts are in reward tokens. Gas uses pinned Polygon
        measurements and the current gas price with two TWAP samples per route leg per modeled window. Retries, extra
        claims, exits and recovery transactions can add cost.
      </V3Muted>
    </section>
  )
}
