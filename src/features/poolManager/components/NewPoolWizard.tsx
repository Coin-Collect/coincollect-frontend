import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { BigNumber } from '@ethersproject/bignumber'
import { formatUnits } from '@ethersproject/units'
import AdminShell from './AdminShell'
import { usePoolManagerAuthority, usePoolManagerRegistry } from '../hooks'
import {
  calculateRewardPlan,
  estimateBlockTimestamp,
  estimateBlocksForDuration,
  formatDate,
  formatTokenAmount,
  parseTokenAmount,
} from '../calculations'
import { fundPoolAndVerify, deployPoolAndVerify, mapPoolManagerError } from '../transactions'
import { loadRenewalPlan, savePoolManagerDraft, updateStoredRenewalPlanItem } from '../storage'
import { PoolDeploymentParameters, DeploymentVerification, FundingVerification } from '../types'
import { mainnetTokens } from 'config/constants/tokens'
import { POOL_MANAGER_CHAIN_ID, POOL_MANAGER_START_BLOCK_BUFFER } from '../constants'
import useWeb3React from 'hooks/useWeb3React'
import {
  ActionButton,
  ButtonRow,
  Field,
  FormGrid,
  Input,
  LinkText,
  Metric,
  MetricGrid,
  MetricLabel,
  MetricValue,
  Muted,
  Notice,
  Panel,
  PanelTitle,
  Select,
  StatusPill,
} from './styles'

const tokenOptions = Object.values(mainnetTokens)
  .filter((token: any) => token?.chainId === POOL_MANAGER_CHAIN_ID)
  .filter(
    (token: any, index, all) =>
      all.findIndex((candidate: any) => candidate.address.toLowerCase() === token.address.toLowerCase()) === index,
  ) as any[]

export default function NewPoolWizard() {
  const router = useRouter()
  const { data, loading: registryLoading } = usePoolManagerRegistry()
  const authority = usePoolManagerAuthority()
  const { account, chainId, library } = useWeb3React()
  const [sourceAddress, setSourceAddress] = useState<string>('')
  const [stakedToken, setStakedToken] = useState(tokenOptions[0]?.address || '')
  const [rewardToken, setRewardToken] = useState(tokenOptions[1]?.address || '')
  const [durationDays, setDurationDays] = useState('30')
  const [startBlock, setStartBlock] = useState('')
  const [rewardBudget, setRewardBudget] = useState('')
  const [participantThreshold, setParticipantThreshold] = useState('0')
  const [poolLimitPerUser, setPoolLimitPerUser] = useState('0')
  const [numberBlocksForUserLimit, setNumberBlocksForUserLimit] = useState('0')
  const [poolAdmin, setPoolAdmin] = useState('')
  const [deployment, setDeployment] = useState<DeploymentVerification | null>(null)
  const [funding, setFunding] = useState<FundingVerification | null>(null)
  const [fundingAmount, setFundingAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const staking =
    tokenOptions.find((token) => token.address.toLowerCase() === stakedToken.toLowerCase()) || tokenOptions[0]
  const reward =
    tokenOptions.find((token) => token.address.toLowerCase() === rewardToken.toLowerCase()) || tokenOptions[1]
  const currentBlock = data?.currentBlock || 0
  const secondsPerBlock = data?.secondsPerBlock || 2.2
  const start = Number(startBlock || currentBlock + POOL_MANAGER_START_BLOCK_BUFFER)
  const rewardBlocks = useMemo(() => {
    try {
      return estimateBlocksForDuration(Number(durationDays), secondsPerBlock)
    } catch {
      return 0
    }
  }, [durationDays, secondsPerBlock])
  const end = start + rewardBlocks
  const plan = useMemo(() => {
    try {
      return reward?.decimals === undefined || !rewardBudget
        ? null
        : calculateRewardPlan(parseTokenAmount(rewardBudget, reward.decimals), BigNumber.from(rewardBlocks))
    } catch {
      return null
    }
  }, [reward, rewardBudget, rewardBlocks])
  const sourcePool = useMemo(
    () => data?.pools.find((pool) => pool.address.toLowerCase() === sourceAddress.toLowerCase()),
    [data?.pools, sourceAddress],
  )

  useEffect(() => {
    if (router.isReady && typeof router.query.source === 'string' && !sourceAddress) {
      setSourceAddress(router.query.source)
    }
  }, [router.isReady, router.query.source, sourceAddress])

  useEffect(() => {
    if (!data || !sourceAddress) return
    const source = data.pools.find((pool) => pool.address.toLowerCase() === sourceAddress.toLowerCase())
    if (!source) return
    setStakedToken(source.stakingToken.address)
    setRewardToken(source.rewardToken.address)
    setParticipantThreshold(formatTokenAmount(source.participantThreshold, source.stakingToken.decimals))
    setPoolLimitPerUser(formatTokenAmount(source.poolLimitPerUser, source.stakingToken.decimals))
    setNumberBlocksForUserLimit(String(source.numberBlocksForUserLimit))
    setPoolAdmin(source.owner || account || '')
    setStartBlock(String(data.currentBlock + POOL_MANAGER_START_BLOCK_BUFFER))
    try {
      setRewardBudget(formatTokenAmount(source.rewardPerBlock.mul(rewardBlocks), source.rewardToken.decimals))
    } catch {
      // The source remains usable even if its budget preview cannot be formatted.
    }
    setMessage(`Renewal source loaded: ${source.stakingToken.symbol} → ${source.rewardToken.symbol}.`)
  }, [data, sourceAddress, account, rewardBlocks])

  useEffect(() => {
    if (!poolAdmin && account) setPoolAdmin(account)
    if (!startBlock && currentBlock) setStartBlock(String(currentBlock + POOL_MANAGER_START_BLOCK_BUFFER))
  }, [account, currentBlock, poolAdmin, startBlock])

  const parameters = (): PoolDeploymentParameters => ({
    stakedToken,
    rewardToken,
    rewardPerBlock: plan?.rewardPerBlock || BigNumber.from(0),
    startBlock: start,
    bonusEndBlock: end,
    poolLimitPerUser: parseTokenAmount(poolLimitPerUser || '0', staking.decimals),
    numberBlocksForUserLimit: Number(numberBlocksForUserLimit || 0),
    participantThreshold: parseTokenAmount(participantThreshold || '0', staking.decimals),
    admin: poolAdmin,
  })

  const persist = (status: any, extra: any = {}) => {
    const draft = {
      id: sourceAddress ? `renew-${sourceAddress.toLowerCase()}` : `draft-${Date.now()}`,
      sourcePoolAddress: sourceAddress || undefined,
      stakingToken: stakedToken,
      rewardToken,
      durationDays,
      rewardBudget,
      participantThreshold,
      poolLimitPerUser,
      numberBlocksForUserLimit,
      poolAdmin,
      status,
      updatedAt: Date.now(),
      ...extra,
    }
    savePoolManagerDraft(draft)
    const plan = loadRenewalPlan()
    const item = plan?.items.find(
      (candidate) => candidate.sourcePoolAddress.toLowerCase() === sourceAddress.toLowerCase(),
    )
    if (item) {
      updateStoredRenewalPlanItem(item.id, {
        status,
        deployedPoolAddress: extra.deployedPoolAddress,
        deploymentTxHash: extra.deploymentTxHash,
        fundingTxHash: extra.fundingTxHash,
        error: extra.error,
      })
    }
  }

  const deploy = async () => {
    setMessage(null)
    try {
      if (chainId !== POOL_MANAGER_CHAIN_ID) throw new Error('Switch the connected wallet to Polygon before deploying.')
      if (!account || !library) throw new Error('Connect the factory-owner wallet first.')
      if (!authority.authorized)
        throw new Error(authority.error || 'Connected wallet is not authorized as factory owner.')
      if (!plan) throw new Error('Enter a valid reward budget to calculate rewardPerBlock.')
      setBusy(true)
      const result = await deployPoolAndVerify(library.getSigner(), authority.factoryAddress as string, parameters())
      setDeployment(result)
      setFundingAmount(formatUnits(plan.plannedMaximumEmission, reward.decimals))
      persist(result.passed ? 'FUNDING_REQUIRED' : 'FAILED', {
        deployedPoolAddress: result.address,
        deploymentTxHash: result.transactionHash,
        error: result.passed ? undefined : 'Introspection mismatch; do not fund until reviewed.',
      })
      setMessage(
        result.passed
          ? 'Pool deployed and every configured field matched the on-chain introspection. Funding is a separate action.'
          : 'Pool deployed, but verification found a mismatch. Funding is disabled until reviewed.',
      )
    } catch (error) {
      setMessage(mapPoolManagerError(error))
      persist('FAILED', { error: mapPoolManagerError(error) })
    } finally {
      setBusy(false)
    }
  }

  const fund = async () => {
    if (!deployment || !library || !fundingAmount) return
    try {
      setBusy(true)
      const result = await fundPoolAndVerify(
        library.getSigner(),
        deployment.address,
        rewardToken,
        parseTokenAmount(fundingAmount, reward.decimals),
      )
      setFunding(result)
      persist(result.passed ? 'FUNDED' : 'FAILED', {
        deployedPoolAddress: deployment.address,
        fundingTxHash: result.transactionHash,
      })
      setMessage(
        result.passed
          ? 'Funding confirmed: pool balance increased by at least the requested amount.'
          : 'Funding receipt succeeded but the balance delta did not match; review the token transfer.',
      )
    } catch (error) {
      setMessage(mapPoolManagerError(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminShell
      title="New pool"
      subtitle="Five clear inputs become one exact v2 factory deployment. Review first; deploy and fund are always separate wallet actions."
    >
      {sourcePool ? (
        <Notice>
          Renewing{' '}
          <strong>
            {sourcePool.stakingToken.symbol} → {sourcePool.rewardToken.symbol}
          </strong>{' '}
          from {sourcePool.address}. The old pool remains available for withdrawals and harvest.
        </Notice>
      ) : null}
      {message ? (
        <Notice $error={message.toLowerCase().includes('mismatch') || message.toLowerCase().includes('failed')}>
          {message}
        </Notice>
      ) : null}
      <Panel>
        <PanelTitle>Pair</PanelTitle>
        <FormGrid>
          <Field>
            Staking token
            <Select value={stakedToken} onChange={(event) => setStakedToken(event.target.value)}>
              {tokenOptions.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} — {token.address.slice(0, 8)}…
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            Reward token
            <Select value={rewardToken} onChange={(event) => setRewardToken(event.target.value)}>
              {tokenOptions.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} — {token.address.slice(0, 8)}…
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
        <PanelTitle style={{ marginTop: 28 }}>Schedule and rewards</PanelTitle>
        <FormGrid>
          <Field>
            Duration (days)
            <Input
              type="number"
              min="1"
              value={durationDays}
              onChange={(event) => setDurationDays(event.target.value)}
            />
          </Field>
          <Field>
            Start block
            <Input
              type="number"
              min="0"
              value={startBlock}
              onChange={(event) => setStartBlock(event.target.value)}
              placeholder={String(currentBlock + POOL_MANAGER_START_BLOCK_BUFFER)}
            />
          </Field>
          <Field>
            Reward budget ({reward?.symbol})
            <Input
              value={rewardBudget}
              onChange={(event) => setRewardBudget(event.target.value)}
              placeholder="e.g. 1000"
            />
          </Field>
          <Field>
            Pool admin
            <Input
              value={poolAdmin}
              onChange={(event) => setPoolAdmin(event.target.value)}
              placeholder={account || '0x…'}
            />
          </Field>
        </FormGrid>
        <PanelTitle style={{ marginTop: 28 }}>Controls</PanelTitle>
        <FormGrid>
          <Field>
            Participant threshold ({staking?.symbol})
            <Input value={participantThreshold} onChange={(event) => setParticipantThreshold(event.target.value)} />
          </Field>
          <Field>
            Pool limit per user ({staking?.symbol})
            <Input value={poolLimitPerUser} onChange={(event) => setPoolLimitPerUser(event.target.value)} />
          </Field>
          <Field>
            User-limit window (blocks)
            <Input
              type="number"
              min="0"
              value={numberBlocksForUserLimit}
              onChange={(event) => setNumberBlocksForUserLimit(event.target.value)}
            />
          </Field>
          <Field>
            Renewal source (optional)
            <Input
              value={sourceAddress}
              onChange={(event) => setSourceAddress(event.target.value)}
              placeholder="Paste a finished pool address"
            />
          </Field>
        </FormGrid>
      </Panel>

      <Panel style={{ marginTop: 16 }}>
        <PanelTitle>Exact deployment preview</PanelTitle>
        <MetricGrid>
          <Metric>
            <MetricLabel>Network</MetricLabel>
            <MetricValue style={{ fontSize: 18 }}>Polygon 137</MetricValue>
          </Metric>
          <Metric>
            <MetricLabel>Blocks</MetricLabel>
            <MetricValue style={{ fontSize: 18 }}>{rewardBlocks ? rewardBlocks.toLocaleString() : '—'}</MetricValue>
          </Metric>
          <Metric>
            <MetricLabel>Reward / block</MetricLabel>
            <MetricValue style={{ fontSize: 18 }}>
              {plan ? formatTokenAmount(plan.rewardPerBlock, reward.decimals) : '—'}
            </MetricValue>
          </Metric>
          <Metric>
            <MetricLabel>Residual budget</MetricLabel>
            <MetricValue style={{ fontSize: 18 }}>
              {plan ? formatTokenAmount(plan.residual, reward.decimals) : '—'}
            </MetricValue>
          </Metric>
        </MetricGrid>
        <div style={{ lineHeight: 1.8, fontSize: 14 }}>
          <div>
            <Muted>Factory:</Muted> <code>{authority.factoryAddress || 'Unavailable'}</code>
          </div>
          <div>
            <Muted>Factory owner:</Muted> <code>{authority.ownerAddress || 'Reading…'}</code>{' '}
            <StatusPill $status={authority.authorized ? 'ACTIVE' : 'FINISHED'}>{authority.state}</StatusPill>
          </div>
          <div>
            <Muted>Schedule:</Muted> block {start.toLocaleString()} → {end.toLocaleString()} •{' '}
            {formatDate(estimateBlockTimestamp(currentBlock, start, data?.currentTimestamp, secondsPerBlock))} →{' '}
            {formatDate(estimateBlockTimestamp(currentBlock, end, data?.currentTimestamp, secondsPerBlock))}
          </div>
          <div>
            <Muted>Emission cap:</Muted>{' '}
            {plan
              ? `${formatTokenAmount(plan.plannedMaximumEmission, reward.decimals)} ${reward.symbol}`
              : 'Enter budget'}
          </div>
          <div>
            <Muted>Estimated block time:</Muted> {secondsPerBlock.toFixed(2)}s ({data?.blockTimeSource || 'fallback'})
          </div>
        </div>
        <ButtonRow>
          <ActionButton onClick={deploy} disabled={busy || registryLoading || !plan || !authority.authorized}>
            {busy ? 'Waiting for wallet…' : 'Deploy pool'}
          </ActionButton>
          <Muted>Deployment submits only after explicit wallet confirmation.</Muted>
        </ButtonRow>
      </Panel>

      {deployment ? (
        <Panel style={{ marginTop: 16 }}>
          <PanelTitle>Deployment verification</PanelTitle>
          <div>
            <LinkText href={`/admin/pools/${deployment.address}`}>{deployment.address}</LinkText>{' '}
            <StatusPill $status={deployment.passed ? 'ACTIVE' : 'FINISHED'}>
              {deployment.passed ? 'VERIFIED' : 'CHECK FAILED'}
            </StatusPill>
          </div>
          <Muted>Transaction: {deployment.transactionHash}</Muted>
          {deployment.checks.map((check) => (
            <div key={check.label} style={{ marginTop: 8, fontSize: 13 }}>
              {check.ok ? '✓' : '✕'} {check.label}: expected <code>{check.expected}</code>, actual{' '}
              <code>{check.actual}</code>
            </div>
          ))}
          {deployment.passed ? (
            <>
              <Field style={{ maxWidth: 280, marginTop: 18 }}>
                Funding amount ({reward.symbol})
                <Input value={fundingAmount} onChange={(event) => setFundingAmount(event.target.value)} />
              </Field>
              <ButtonRow>
                <ActionButton onClick={fund} disabled={busy || !fundingAmount}>
                  Fund pool
                </ActionButton>
                <Muted>Default is the planned maximum emission, editable before confirmation.</Muted>
              </ButtonRow>
            </>
          ) : null}
          {funding ? (
            <Notice>
              {funding.passed ? 'Funding verified.' : 'Funding verification failed.'} Tx: {funding.transactionHash}
            </Notice>
          ) : null}
        </Panel>
      ) : null}
      <p style={{ marginTop: 18, fontSize: 13 }}>
        <Link href="/admin/pools">Back to pools</Link>
      </p>
    </AdminShell>
  )
}
