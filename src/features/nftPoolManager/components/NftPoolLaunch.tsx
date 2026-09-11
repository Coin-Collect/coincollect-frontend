import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import AdminShell from 'features/poolManager/components/AdminShell'
import {
  ActionButton,
  ButtonRow,
  FormGrid,
  LinkText,
  Muted,
  Notice,
  Panel,
  PanelTitle,
  Table,
  TableWrap,
} from 'features/poolManager/components/styles'
import useWeb3React from 'hooks/useWeb3React'
import { simplePolygonRpcProvider } from 'utils/providers'
import { loadNftPoolLaunchSession, saveNftPoolLaunchSession } from '../launch/storage'
import {
  mapNftLaunchError,
  configureNftCollectionWeights,
  configureNftPerformanceFee,
  deployNftPool,
  updateNftPoolSchedule,
  parseNftPoolAddress,
} from '../launch/transactions'
import { runNftPoolPreflight } from '../launch/preflight'
import { fundNftPoolTokenIfNeeded, primaryFundingAmount, sideFundingAmount } from '../launch/funding'
import { moveNftLaunchScheduleLater } from '../launch/schedule'
import {
  verifyDeployedNftPool,
  verifyNftCollectionWeights,
  verifyNftPerformanceFee,
  verifyFinalNftLaunch,
} from '../launch/verification'
import {
  canRetryLaunch,
  nextNftLaunchStageAfterDeploy,
  nextNftLaunchStageAfterWeights,
  updateNftLaunchSession,
} from '../launch/orchestrator'
import { nftPoolAbi } from '../launch/abi'
import { NftPoolLaunchSession, LaunchCheck, LaunchStage } from '../launch/types'
import { LaunchCheckList, LaunchCheckRow, LaunchHero, LaunchPill, LaunchStep, LaunchSteps } from './styles'

const steps: Array<{ key: string; title: string }> = [
  { key: 'preflight', title: 'Preflight' },
  { key: 'deploy', title: 'Deploy pool' },
  { key: 'verify', title: 'Verify deployment' },
  { key: 'weights', title: 'Configure NFT powers' },
  { key: 'fee', title: 'Configure fee' },
  { key: 'funding', title: 'Fund rewards' },
  { key: 'final', title: 'Final verification' },
]

function short(value?: string): string {
  return value && value.length > 15 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value || '—'
}

function stageIndex(stage: LaunchStage): number {
  if (stage.startsWith('PREFLIGHT') || stage === 'DRAFT') return 0
  if (stage.startsWith('DEPLOY') || stage === 'AWAITING_DEPLOY_SIGNATURE') return 1
  if (stage.startsWith('WEIGHTS') || stage === 'AWAITING_WEIGHTS_SIGNATURE') return 3
  if (stage.startsWith('FEE') || stage === 'AWAITING_FEE_SIGNATURE') return 4
  if (stage.startsWith('FUNDING')) return 5
  if (stage === 'FINAL_VERIFYING' || stage === 'COMPLETE') return 6
  return 2
}

function stageLabel(stage: LaunchStage): string {
  return stage.replace(/_/g, ' ')
}

function CheckTable({ checks }: { checks: LaunchCheck[] }) {
  return (
    <LaunchCheckList>
      {checks.map((item) => (
        <LaunchCheckRow key={`${item.key}-${item.label}`} $status={item.status}>
          <LaunchPill $tone={item.status === 'PASS' ? 'good' : item.status === 'BLOCK' ? 'bad' : 'warn'}>
            {item.status}
          </LaunchPill>
          <div>
            <strong>{item.label}</strong>
            {item.detail ? <Muted style={{ display: 'block', marginTop: 3 }}>{item.detail}</Muted> : null}
            {item.expected || item.actual ? (
              <Muted style={{ display: 'block', marginTop: 3, fontSize: 11 }}>
                expected {item.expected || '—'} · actual {item.actual || '—'}
              </Muted>
            ) : null}
          </div>
        </LaunchCheckRow>
      ))}
    </LaunchCheckList>
  )
}

export default function NftPoolLaunch() {
  const router = useRouter()
  const { account, library } = useWeb3React()
  const sessionId = typeof router.query.sessionId === 'string' ? router.query.sessionId : ''
  const [session, setSession] = useState<NftPoolLaunchSession | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [confirmDeploy, setConfirmDeploy] = useState(false)
  const sessionRef = useRef<NftPoolLaunchSession | null>(null)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    if (!router.isReady || !sessionId) return
    setSession(loadNftPoolLaunchSession(sessionId) || null)
  }, [router.isReady, sessionId])

  useEffect(() => {
    if (!session || !library || !session.transactionHashes.deploy || session.poolAddress) return
    let active = true
    library
      .getTransactionReceipt(session.transactionHashes.deploy)
      .then((receipt: any) => {
        if (!active || !receipt || receipt.status !== 1) return
        try {
          const poolAddress = parseNftPoolAddress(receipt, session.factoryAddress)
          setSession(
            updateNftLaunchSession(session, {
              poolAddress,
              currentStage: 'DEPLOY_CONFIRMED',
              retryable: true,
              error: 'Deployment confirmed. Resume verification and setup.',
            }),
          )
        } catch {
          // The receipt may still be pending or may belong to a replacement transaction.
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [library, session])

  const update = (patch: Partial<NftPoolLaunchSession>) => {
    const current = sessionRef.current
    if (!current) return null
    const next = updateNftLaunchSession(current, patch)
    sessionRef.current = next
    setSession(next)
    return next
  }

  const runPreflight = async () => {
    if (!session || !library || !account) return
    if (session.transactionHashes.deploy && !session.poolAddress) {
      setMessage(
        'Deployment transaction already exists. Resume after its receipt is available; no duplicate deploy will be sent.',
      )
      return
    }
    setBusy(true)
    setError('')
    setMessage('Refreshing Polygon block, authority, balances and deployment simulation…')
    update({ currentStage: 'PREFLIGHT_RUNNING', error: undefined, retryable: true })
    try {
      const preflight = await runNftPoolPreflight({
        provider: simplePolygonRpcProvider,
        signer: library.getSigner(),
        plan: session.plan,
        account,
      })
      update({
        preflight,
        schedule: preflight.schedule,
        currentStage: preflight.ok ? 'PREFLIGHT_READY' : 'PREFLIGHT_FAILED',
        error: preflight.ok ? undefined : preflight.error,
        retryable: true,
      })
      setMessage(
        preflight.ok
          ? 'Preflight passed. The final schedule is ready for review.'
          : 'Preflight is blocked; resolve the failed checks before signing.',
      )
    } catch (reason) {
      setError(mapNftLaunchError(reason))
    } finally {
      setBusy(false)
    }
  }

  const deploy = async () => {
    if (!session || !library || !session.preflight?.ok || !session.schedule || session.poolAddress) return
    setBusy(true)
    setError('')
    setMessage('Confirm the deployment in your wallet…')
    const current = update({ currentStage: 'AWAITING_DEPLOY_SIGNATURE', error: undefined, retryable: true }) || session
    try {
      const deployment = await deployNftPool(
        library.getSigner(),
        current.factoryAddress,
        current.plan,
        current.schedule!,
        (hash) => {
          update({
            currentStage: 'DEPLOY_SUBMITTED',
            transactionHashes: { ...current.transactionHashes, deploy: hash },
            retryable: true,
          })
        },
      )
      const withDeployment =
        update({
          currentStage: 'DEPLOY_CONFIRMED',
          poolAddress: deployment.poolAddress,
          transactionHashes: { ...current.transactionHashes, deploy: deployment.transactionHash },
          retryable: true,
        }) || current
      const verified = await verifyDeployedNftPool(
        simplePolygonRpcProvider,
        withDeployment.plan,
        withDeployment.schedule!,
        deployment.poolAddress,
      )
      update({
        verification: { ...withDeployment.verification, deployment: verified },
        currentStage: verified.passed ? nextNftLaunchStageAfterDeploy(withDeployment) : 'DEPLOY_CONFIRMED',
        error: verified.passed ? undefined : 'Pool deployed — setup incomplete. Deployment verification did not pass.',
        retryable: true,
      })
      setMessage(
        verified.passed
          ? 'Pool deployed and verified. Continue with the remaining setup.'
          : 'Pool deployed, but verification stopped the workflow.',
      )
    } catch (reason) {
      update({
        currentStage: sessionRef.current?.transactionHashes.deploy ? 'DEPLOY_SUBMITTED' : 'PREFLIGHT_READY',
        error: mapNftLaunchError(reason),
        retryable: true,
      })
      setError(mapNftLaunchError(reason))
    } finally {
      setBusy(false)
    }
  }

  const configureWeights = async () => {
    if (!session || !library || !session.poolAddress) return
    setBusy(true)
    setError('')
    setMessage('Confirm the NFT power configuration in your wallet…')
    const current = update({ currentStage: 'AWAITING_WEIGHTS_SIGNATURE', error: undefined }) || session
    try {
      const receipt = await configureNftCollectionWeights(
        library.getSigner(),
        current.poolAddress!,
        current.plan,
        (hash) =>
          update({
            currentStage: 'WEIGHTS_SUBMITTED',
            transactionHashes: { ...current.transactionHashes, weights: hash },
          }),
      )
      const verified = await verifyNftCollectionWeights(simplePolygonRpcProvider, current.plan, current.poolAddress!)
      update({
        verification: { ...current.verification, weights: verified },
        transactionHashes: { ...current.transactionHashes, weights: receipt.transactionHash },
        currentStage: verified.passed ? nextNftLaunchStageAfterWeights(current) : 'WEIGHTS_REQUIRED',
        error: verified.passed ? undefined : 'NFT power verification failed; no later step was started.',
      })
      setMessage(verified.passed ? 'NFT powers verified.' : 'NFT powers were not verified.')
    } catch (reason) {
      update({ currentStage: 'WEIGHTS_REQUIRED', error: mapNftLaunchError(reason), retryable: true })
      setError(mapNftLaunchError(reason))
    } finally {
      setBusy(false)
    }
  }

  const configureFee = async () => {
    if (
      !session ||
      !library ||
      !session.poolAddress ||
      !session.plan.postDeploy.feeTo ||
      !session.plan.postDeploy.performanceFee
    )
      return
    setBusy(true)
    setError('')
    setMessage('Confirm the performance fee configuration in your wallet…')
    const current = update({ currentStage: 'AWAITING_FEE_SIGNATURE', error: undefined }) || session
    try {
      const receipt = await configureNftPerformanceFee(
        library.getSigner(),
        current.poolAddress!,
        current.plan.postDeploy.feeTo!,
        current.plan.postDeploy.performanceFee!,
        (hash) =>
          update({ currentStage: 'FEE_SUBMITTED', transactionHashes: { ...current.transactionHashes, fee: hash } }),
      )
      const verified = await verifyNftPerformanceFee(simplePolygonRpcProvider, current.plan, current.poolAddress!)
      update({
        verification: { ...current.verification, fee: verified },
        transactionHashes: { ...current.transactionHashes, fee: receipt.transactionHash },
        currentStage: verified.passed ? 'FUNDING_REQUIRED' : 'FEE_CONFIG_REQUIRED',
        error: verified.passed ? undefined : 'Fee configuration verification failed.',
      })
      setMessage(verified.passed ? 'Performance fee verified.' : 'Performance fee was not verified.')
    } catch (reason) {
      update({ currentStage: 'FEE_CONFIG_REQUIRED', error: mapNftLaunchError(reason), retryable: true })
      setError(mapNftLaunchError(reason))
    } finally {
      setBusy(false)
    }
  }

  const fund = async () => {
    if (!session || !library || !session.poolAddress) return
    setBusy(true)
    setError('')
    setMessage('Funding is sequential and verifies each pool balance after confirmation…')
    const current = update({ currentStage: 'FUNDING_IN_PROGRESS', error: undefined }) || session
    try {
      const pendingHash = sessionRef.current?.transactionHashes.primaryFunding
      if (pendingHash && !(await library.getTransactionReceipt(pendingHash))) {
        throw new Error('Primary funding transaction is still pending. The workflow will not send a duplicate.')
      }
      const primaryToken = current.plan.fundingRequirements.primary.tokenAddress
      const primary = await fundNftPoolTokenIfNeeded(
        library.getSigner(),
        current.poolAddress!,
        primaryToken,
        primaryFundingAmount(current.plan),
        (hash) =>
          update({
            transactionHashes: { ...(sessionRef.current || current).transactionHashes, primaryFunding: hash },
            funding: {
              ...(sessionRef.current || current).funding,
              primary: {
                status: 'SUBMITTED',
                tokenAddress: primaryToken,
                requiredAmount: primaryFundingAmount(current.plan).toString(),
                txHash: hash,
              },
            },
          }),
      )
      update({
        transactionHashes: {
          ...(sessionRef.current || current).transactionHashes,
          primaryFunding: primary.transactionHash || (sessionRef.current || current).transactionHashes.primaryFunding,
        },
        funding: {
          ...(sessionRef.current || current).funding,
          primary: {
            status: primary.status,
            tokenAddress: primaryToken,
            requiredAmount: primary.requiredAmount.toString(),
            beforePoolBalance: primary.beforePoolBalance.toString(),
            afterPoolBalance: primary.afterPoolBalance.toString(),
            walletBalance: primary.walletBalance.toString(),
            txHash: primary.transactionHash,
          },
        },
      })
      for (const side of current.plan.fundingRequirements.side) {
        const existingSideHash = sessionRef.current?.transactionHashes.sideFunding[side.tokenAddress.toLowerCase()]
        if (existingSideHash && !(await library.getTransactionReceipt(existingSideHash))) {
          throw new Error(`Side funding transaction for ${side.tokenAddress} is still pending. No duplicate was sent.`)
        }
        const amount = sideFundingAmount(current.plan, side.tokenAddress)
        const sideResult = await fundNftPoolTokenIfNeeded(
          library.getSigner(),
          current.poolAddress!,
          side.tokenAddress,
          amount,
          (hash) =>
            update({
              transactionHashes: {
                ...(sessionRef.current || current).transactionHashes,
                sideFunding: {
                  ...(sessionRef.current || current).transactionHashes.sideFunding,
                  [side.tokenAddress.toLowerCase()]: hash,
                },
              },
              funding: {
                ...(sessionRef.current || current).funding,
                side: {
                  ...(sessionRef.current || current).funding.side,
                  [side.tokenAddress.toLowerCase()]: {
                    status: 'SUBMITTED',
                    tokenAddress: side.tokenAddress,
                    requiredAmount: amount.toString(),
                    txHash: hash,
                  },
                },
              },
            }),
        )
        update({
          transactionHashes: {
            ...(sessionRef.current || current).transactionHashes,
            sideFunding: {
              ...(sessionRef.current || current).transactionHashes.sideFunding,
              [side.tokenAddress.toLowerCase()]:
                sideResult.transactionHash ||
                (sessionRef.current || current).transactionHashes.sideFunding[side.tokenAddress.toLowerCase()],
            },
          },
          funding: {
            ...(sessionRef.current || current).funding,
            side: {
              ...(sessionRef.current || current).funding.side,
              [side.tokenAddress.toLowerCase()]: {
                status: sideResult.status,
                tokenAddress: side.tokenAddress,
                requiredAmount: amount.toString(),
                beforePoolBalance: sideResult.beforePoolBalance.toString(),
                afterPoolBalance: sideResult.afterPoolBalance.toString(),
                walletBalance: sideResult.walletBalance.toString(),
                txHash: sideResult.transactionHash,
              },
            },
          },
        })
      }
      update({ currentStage: 'FINAL_VERIFYING', retryable: true })
      const verified = await verifyFinalNftLaunch(
        simplePolygonRpcProvider,
        current.plan,
        current.schedule!,
        current.poolAddress!,
      )
      update({
        verification: { ...(sessionRef.current || current).verification, final: verified },
        currentStage: verified.passed ? 'COMPLETE' : 'FUNDING_REQUIRED',
        error: verified.passed ? undefined : 'Final verification did not pass. Funding/setup remains incomplete.',
      })
      setMessage(
        verified.passed
          ? 'NFT pool launch is complete.'
          : 'Funding completed, but final verification still has blockers.',
      )
    } catch (reason) {
      update({ currentStage: 'FUNDING_REQUIRED', error: mapNftLaunchError(reason), retryable: true })
      setError(mapNftLaunchError(reason))
    } finally {
      setBusy(false)
    }
  }

  const finalVerify = async () => {
    if (!session || !session.poolAddress || !session.schedule) return
    setBusy(true)
    setError('')
    const current = update({ currentStage: 'FINAL_VERIFYING', error: undefined }) || session
    try {
      const verified = await verifyFinalNftLaunch(
        simplePolygonRpcProvider,
        current.plan,
        current.schedule!,
        current.poolAddress!,
      )
      update({
        verification: { ...current.verification, final: verified },
        currentStage: verified.passed ? 'COMPLETE' : 'FUNDING_REQUIRED',
        error: verified.passed ? undefined : 'Final verification did not pass.',
      })
    } catch (reason) {
      update({ currentStage: 'FUNDING_REQUIRED', error: mapNftLaunchError(reason) })
      setError(mapNftLaunchError(reason))
    } finally {
      setBusy(false)
    }
  }

  const resume = async () => {
    if (!session || !library) return
    if (!session.transactionHashes.deploy && !session.poolAddress) {
      await runPreflight()
      return
    }
    setBusy(true)
    setError('')
    try {
      if (session.transactionHashes.deploy && !session.poolAddress) {
        const receipt = await library.getTransactionReceipt(session.transactionHashes.deploy)
        if (!receipt) {
          setMessage('Deployment transaction is still pending. No duplicate deployment will be sent.')
          return
        }
        if (receipt.status !== 1) throw new Error('Deployment transaction failed on Polygon.')
        const poolAddress = parseNftPoolAddress(receipt, session.factoryAddress)
        const withDeployment = update({ poolAddress, currentStage: 'DEPLOY_CONFIRMED', error: undefined }) || session
        const verified = await verifyDeployedNftPool(
          simplePolygonRpcProvider,
          withDeployment.plan,
          withDeployment.schedule!,
          poolAddress,
        )
        update({
          verification: { ...withDeployment.verification, deployment: verified },
          currentStage: verified.passed ? nextNftLaunchStageAfterDeploy(withDeployment) : 'DEPLOY_CONFIRMED',
          error: verified.passed ? undefined : 'Pool deployed — setup incomplete.',
        })
        return
      }
      if (session.currentStage === 'WEIGHTS_SUBMITTED' && session.transactionHashes.weights && session.poolAddress) {
        const receipt = await library.getTransactionReceipt(session.transactionHashes.weights)
        if (!receipt) {
          setMessage('NFT power transaction is still pending.')
          return
        }
        const verified = await verifyNftCollectionWeights(simplePolygonRpcProvider, session.plan, session.poolAddress)
        update({
          verification: { ...session.verification, weights: verified },
          currentStage: verified.passed ? nextNftLaunchStageAfterWeights(session) : 'WEIGHTS_REQUIRED',
          error: verified.passed ? undefined : 'NFT power verification failed.',
        })
        return
      }
      if (session.currentStage === 'FEE_SUBMITTED' && session.transactionHashes.fee && session.poolAddress) {
        const receipt = await library.getTransactionReceipt(session.transactionHashes.fee)
        if (!receipt) {
          setMessage('Fee configuration transaction is still pending.')
          return
        }
        const verified = await verifyNftPerformanceFee(simplePolygonRpcProvider, session.plan, session.poolAddress)
        update({
          verification: { ...session.verification, fee: verified },
          currentStage: verified.passed ? 'FUNDING_REQUIRED' : 'FEE_CONFIG_REQUIRED',
          error: verified.passed ? undefined : 'Fee configuration verification failed.',
        })
        return
      }
      setMessage('Session is ready to continue from its current verified checkpoint.')
    } catch (reason) {
      setError(mapNftLaunchError(reason))
    } finally {
      setBusy(false)
    }
  }

  const moveStartLater = async () => {
    if (!session || !library || !session.poolAddress || !session.schedule) return
    setBusy(true)
    setError('')
    setMessage('Reading the current pool schedule before requesting a later start…')
    try {
      const pool = new Contract(session.poolAddress, nftPoolAbi, simplePolygonRpcProvider)
      const [owner, currentBlock, oldStart] = await Promise.all([
        pool.owner(),
        simplePolygonRpcProvider.getBlockNumber(),
        pool.startBlock(),
      ])
      if (!account || owner.toLowerCase() !== account.toLowerCase())
        throw new Error('Connected wallet is not the deployed pool owner.')
      if (currentBlock >= Number(oldStart)) throw new Error('The pool start block has already passed.')
      const nextSchedule = moveNftLaunchScheduleLater(session.schedule, currentBlock)
      const receipt = await updateNftPoolSchedule(
        library.getSigner(),
        session.poolAddress,
        nextSchedule.startBlock,
        nextSchedule.endBlock,
        (hash) =>
          update({ transactionHashes: { ...session.transactionHashes, scheduleUpdate: hash }, schedule: nextSchedule }),
      )
      update({
        schedule: nextSchedule,
        transactionHashes: { ...session.transactionHashes, scheduleUpdate: receipt.transactionHash },
        currentStage: session.currentStage === 'COMPLETE' ? 'FUNDING_REQUIRED' : session.currentStage,
        error: undefined,
      })
      setMessage('Start moved later. Run final verification again when setup is ready.')
    } catch (reason) {
      setError(mapNftLaunchError(reason))
    } finally {
      setBusy(false)
    }
  }

  const activeIndex = session ? stageIndex(session.currentStage) : 0
  const needsWeights = Boolean(session?.plan.collectionConfiguration.collectionWeightConfigurationRequired)
  const needsFee = Boolean(session?.plan.postDeploy.performanceFee || session?.plan.postDeploy.feeTo)
  const canLaunch = Boolean(
    session?.preflight?.ok &&
      session.schedule &&
      !session.poolAddress &&
      !session.transactionHashes.deploy &&
      session.currentStage === 'PREFLIGHT_READY',
  )
  const poolScan = session?.poolAddress ? `https://polygonscan.com/address/${session.poolAddress}` : ''
  const deployScan = session?.transactionHashes.deploy
    ? `https://polygonscan.com/tx/${session.transactionHashes.deploy}`
    : ''
  const summary = useMemo(
    () =>
      session?.plan.fundingRequirements.side.length
        ? `${session.plan.fundingRequirements.side.length} side reward`
        : 'No side reward',
    [session],
  )

  if (!session)
    return (
      <AdminShell
        title="Launch NFT pool"
        subtitle="Controlled, resumable Polygon launch workflow."
        authorityScope="nft"
      >
        <Notice $error>
          Launch session not found. <Link href="/admin/nft-pools/new">Return to the builder.</Link>
        </Notice>
      </AdminShell>
    )

  return (
    <AdminShell
      title="Launch NFT pool"
      subtitle="Preflight, deploy, verify, configure, fund, verify — one explicit step at a time."
      authorityScope="nft"
    >
      {message ? <Notice>{message}</Notice> : null}
      {error || session.error ? <Notice $error>{error || session.error}</Notice> : null}
      <LaunchHero>
        <div>
          <Muted>Frozen plan · {short(session.planHash)}</Muted>
          <h2 style={{ margin: '8px 0 6px' }}>
            {session.plan.factoryParameters.rewardTokenAddress ? 'NFT pool launch' : 'Launch session'}
          </h2>
          <Muted>
            {session.plan.draftId} · {summary} · stage: {stageLabel(session.currentStage)}
          </Muted>
        </div>
        <LaunchPill $tone={session.currentStage === 'COMPLETE' ? 'good' : session.error ? 'bad' : 'warn'}>
          {stageLabel(session.currentStage)}
        </LaunchPill>
      </LaunchHero>
      <Panel style={{ marginTop: 16 }}>
        <PanelTitle>Launch workflow</PanelTitle>
        <LaunchSteps>
          {steps.map((item, index) => (
            <LaunchStep
              key={item.key}
              $active={activeIndex === index}
              $done={activeIndex > index || session.currentStage === 'COMPLETE'}
              $blocked={Boolean(session.error && activeIndex === index)}
            >
              <strong>{item.title}</strong>
              <Muted>
                {index === 0
                  ? 'Fresh reads and simulation'
                  : index === 1
                  ? 'Wallet-signed factory write'
                  : index === 5
                  ? 'Missing-only token funding'
                  : 'Confirmed read-back'}
              </Muted>
              <Muted>
                {activeIndex > index || session.currentStage === 'COMPLETE'
                  ? 'Done'
                  : activeIndex === index
                  ? 'Current'
                  : 'Next'}
              </Muted>
            </LaunchStep>
          ))}
        </LaunchSteps>
        <ButtonRow>
          <ActionButton
            onClick={runPreflight}
            disabled={Boolean(
              busy ||
                !account ||
                session.poolAddress ||
                (session.currentStage !== 'DRAFT' &&
                  session.currentStage !== 'PREFLIGHT_FAILED' &&
                  session.currentStage !== 'PREFLIGHT_READY'),
            )}
          >
            {busy && session.currentStage === 'PREFLIGHT_RUNNING' ? 'Running…' : 'Run preflight'}
          </ActionButton>
          {canLaunch ? (
            <ActionButton onClick={() => setConfirmDeploy(true)} disabled={busy}>
              Launch pool
            </ActionButton>
          ) : null}
          {session.poolAddress &&
          needsWeights &&
          ['WEIGHTS_REQUIRED', 'DEPLOY_VERIFIED', 'DEPLOY_CONFIRMED'].includes(session.currentStage) ? (
            <ActionButton onClick={configureWeights} disabled={busy}>
              Configure NFT powers
            </ActionButton>
          ) : null}
          {session.poolAddress && needsFee && ['FEE_CONFIG_REQUIRED'].includes(session.currentStage) ? (
            <ActionButton onClick={configureFee} disabled={busy}>
              Configure fee
            </ActionButton>
          ) : null}
          {session.poolAddress && ['FUNDING_REQUIRED', 'FUNDING_IN_PROGRESS'].includes(session.currentStage) ? (
            <ActionButton onClick={fund} disabled={busy}>
              Fund rewards
            </ActionButton>
          ) : null}
          {session.poolAddress && session.currentStage !== 'COMPLETE' ? (
            <ActionButton $secondary onClick={finalVerify} disabled={busy}>
              Final verification
            </ActionButton>
          ) : null}
          {session.poolAddress && session.currentStage !== 'COMPLETE' ? (
            <ActionButton $secondary onClick={moveStartLater} disabled={busy}>
              Move start later
            </ActionButton>
          ) : null}
          {canRetryLaunch(session) && session.currentStage !== 'PREFLIGHT_READY' && session.currentStage !== 'DRAFT' ? (
            <ActionButton $secondary onClick={resume} disabled={busy}>
              Resume
            </ActionButton>
          ) : null}
        </ButtonRow>
      </Panel>
      {confirmDeploy ? (
        <Panel style={{ marginTop: 16, borderColor: '#D97706' }}>
          <PanelTitle>Confirm deployment</PanelTitle>
          <Muted>Review the exact values one more time before opening your wallet.</Muted>
          <TableWrap style={{ marginTop: 12 }}>
            <Table>
              <tbody>
                <tr>
                  <td>Staked NFT</td>
                  <td>{short(session.plan.factoryParameters.stakedTokenAddress)}</td>
                </tr>
                <tr>
                  <td>Primary funding cap</td>
                  <td>{session.plan.fundingRequirements.primary.maximumScheduledFunding} base units</td>
                </tr>
                {session.plan.fundingRequirements.side.map((side) => (
                  <tr key={side.tokenAddress}>
                    <td>Side funding cap · {short(side.tokenAddress)}</td>
                    <td>{side.maximumImpliedSideFunding} base units</td>
                  </tr>
                ))}
                <tr>
                  <td>Start → end</td>
                  <td>
                    {session.schedule
                      ? `${session.schedule.startBlock.toLocaleString()} → ${session.schedule.endBlock.toLocaleString()}`
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </Table>
          </TableWrap>
          <Notice style={{ marginTop: 14 }}>
            This cannot be undone. The factory deployment will create a new on-chain pool and requires a separate wallet
            confirmation.
          </Notice>
          <ButtonRow>
            <ActionButton
              onClick={() => {
                setConfirmDeploy(false)
                void deploy()
              }}
              disabled={busy}
            >
              Confirm in wallet
            </ActionButton>
            <ActionButton $secondary onClick={() => setConfirmDeploy(false)} disabled={busy}>
              Cancel
            </ActionButton>
          </ButtonRow>
        </Panel>
      ) : null}
      {session.preflight ? (
        <Panel style={{ marginTop: 16 }}>
          <PanelTitle>Preflight result</PanelTitle>
          <FormGrid>
            <div>
              <Muted>Current block</Muted>
              <div>{session.preflight.currentBlock.toLocaleString()}</div>
            </div>
            <div>
              <Muted>Final schedule</Muted>
              <div>
                {session.preflight.schedule.startBlock.toLocaleString()} →{' '}
                {session.preflight.schedule.endBlock.toLocaleString()}
              </div>
            </div>
            <div>
              <Muted>Setup buffer</Muted>
              <div>
                {session.preflight.schedule.setupBufferBlocks.toLocaleString()} blocks ·{' '}
                {Math.round(session.preflight.schedule.bufferSeconds / 60)} min
              </div>
            </div>
            <div>
              <Muted>Deployment gas safety</Muted>
              <div>{session.preflight.deploymentGas ? `${session.preflight.deploymentGas.safetyCost} wei` : '—'}</div>
            </div>
          </FormGrid>
          <div style={{ marginTop: 16 }}>
            <CheckTable checks={session.preflight.checks} />
          </div>
        </Panel>
      ) : null}
      {session.poolAddress ? (
        <Panel style={{ marginTop: 16 }}>
          <PanelTitle>Confirmed deployment</PanelTitle>
          <Muted>Pool address is sourced from the confirmed NewSmartChefContract event.</Muted>
          <TableWrap>
            <Table>
              <tbody>
                <tr>
                  <td>Pool</td>
                  <td>
                    <a href={poolScan} target="_blank" rel="noreferrer">
                      {session.poolAddress}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>Deploy tx</td>
                  <td>
                    <a href={deployScan} target="_blank" rel="noreferrer">
                      {short(session.transactionHashes.deploy)}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>Admin</td>
                  <td>{short(session.intendedAdmin)}</td>
                </tr>
                <tr>
                  <td>Start → end</td>
                  <td>
                    {session.schedule
                      ? `${session.schedule.startBlock.toLocaleString()} → ${session.schedule.endBlock.toLocaleString()}`
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </Table>
          </TableWrap>
          {session.verification.deployment ? (
            <div style={{ marginTop: 16 }}>
              <CheckTable checks={session.verification.deployment.checks} />
            </div>
          ) : null}
        </Panel>
      ) : null}
      {session.currentStage === 'COMPLETE' ? (
        <Panel style={{ marginTop: 16 }}>
          <LaunchPill $tone="good">Launch complete</LaunchPill>
          <h3>Pool is ready for its upcoming start block.</h3>
          <Muted>
            All required deployment, configuration and funding read-backs passed. The workflow never performs an
            automatic swap or a hidden transaction.
          </Muted>
        </Panel>
      ) : null}
      <details style={{ marginTop: 16 }}>
        <summary>Advanced exact parameters</summary>
        <pre style={{ overflowX: 'auto', fontSize: 11, lineHeight: 1.5 }}>{JSON.stringify(session.plan, null, 2)}</pre>
      </details>
      <p style={{ marginTop: 18 }}>
        <Link href="/admin/nft-pools">Back to NFT pools</Link>
        {' · '}
        <LinkText href="/docs/nft-pool-manager">Read the architecture notes</LinkText>
      </p>
    </AdminShell>
  )
}
