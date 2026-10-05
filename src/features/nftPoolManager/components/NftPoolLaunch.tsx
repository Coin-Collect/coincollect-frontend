import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { formatUnits } from '@ethersproject/units'
import { mainnetTokens } from 'config/constants/tokens'
import AdminShell from 'features/poolManager/components/AdminShell'
import {
  ActionButton,
  ButtonRow,
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
import { loadNftPoolLaunchSession } from '../launch/storage'
import { launchStageLabel } from '../launch/presentation'
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
import { moveNftLaunchScheduleLater, remainingNftLaunchSetupWriteCount } from '../launch/schedule'
import {
  verifyDeployedNftPool,
  verifyNftCollectionWeights,
  verifyNftPerformanceFee,
  verifyNftFunding,
  verifyFinalNftLaunch,
} from '../launch/verification'
import { readNftLaunchChainSnapshot } from '../launch/fingerprint'
import {
  canConfigureFee,
  canConfigureWeights,
  canDeploy,
  canFinalVerify,
  canFund,
  canMoveSchedule,
  canRetryLaunch,
  getNftCanaryRecommendation,
  nextNftLaunchStageAfterDeploy,
  nextNftLaunchStageAfterWeights,
  nextUnverifiedSetupStep,
  validateLaunchSessionInvariant,
  updateNftLaunchSession,
} from '../launch/orchestrator'
import type { LaunchEligibility } from '../launch/orchestrator'
import { advanceLaunchStage, nextPendingLaunchOperation, reconcileTransaction } from '../launch/reconciliation'
import { NftLaunchPoolSnapshot, NftPoolLaunchSession, LaunchCheck, LaunchStage } from '../launch/types'
import {
  LaunchActionHeader,
  LaunchCheckDisclosure,
  LaunchCheckList,
  LaunchCheckRow,
  LaunchFact,
  LaunchFacts,
  LaunchHero,
  LaunchHeroEyebrow,
  LaunchHeroMeta,
  LaunchMainColumn,
  LaunchPill,
  LaunchProgressPanel,
  LaunchProgressSummary,
  LaunchProgressTitle,
  LaunchSideColumn,
  LaunchSnapshotLine,
  LaunchSnapshotValue,
  LaunchStep,
  LaunchStepState,
  LaunchSteps,
  LaunchSummaryGrid,
  LaunchSummaryItem,
  LaunchWorkspace,
} from './styles'

const steps: Array<{ key: string; title: string }> = [
  { key: 'preflight', title: 'Check setup' },
  { key: 'deploy', title: 'Create contract' },
  { key: 'verify', title: 'Verify setup' },
  { key: 'weights', title: 'Configure NFT staking' },
  { key: 'fee', title: 'Configure fee' },
  { key: 'funding', title: 'Fund rewards' },
  { key: 'final', title: 'Final check' },
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

function CheckTable({ checks }: { checks: LaunchCheck[] }) {
  const attention = checks.filter((item) => item.status !== 'PASS')
  const passed = checks.filter((item) => item.status === 'PASS')

  const rows = (items: LaunchCheck[]) => (
    <LaunchCheckList>
      {items.map((item) => (
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

  return (
    <>
      {attention.length ? rows(attention) : null}
      {passed.length ? (
        <LaunchCheckDisclosure>
          <summary>
            <span>{passed.length} passed checks</span>
            <LaunchPill $tone="good">Verified</LaunchPill>
          </summary>
          {rows(passed)}
        </LaunchCheckDisclosure>
      ) : null}
    </>
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
  const [chainSnapshot, setChainSnapshot] = useState<NftLaunchPoolSnapshot | null>(null)
  const [snapshotError, setSnapshotError] = useState('')
  const sessionRef = useRef<NftPoolLaunchSession | null>(null)
  const reconciledDeployRef = useRef<string>()

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    if (!router.isReady || !sessionId) return
    setSession(loadNftPoolLaunchSession(sessionId) || null)
  }, [router.isReady, sessionId])

  const exportPresentationMetadata = () => {
    if (!session?.poolAddress || typeof window === 'undefined') return
    const metadata = session.publicationMetadata
    const entry = {
      id: `137:${session.poolAddress.toLowerCase()}`,
      name: metadata?.name || 'NFT pool',
      banner: metadata?.banner,
      avatar: metadata?.avatar,
      projectUrl: metadata?.projectUrl,
      getNftUrl: metadata?.getNftUrl,
      description: metadata?.description,
      category: metadata?.isCommunity === false ? 'PARTNER' : 'COMMUNITY',
    }
    const document = { schemaVersion: 1, updatedAt: new Date().toISOString(), pools: [entry] }
    const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }))
    const anchor = window.document.createElement('a')
    anchor.href = blobUrl
    anchor.download = `nft-pool-${session.poolAddress.toLowerCase()}.json`
    anchor.click()
    URL.revokeObjectURL(blobUrl)
  }

  const refreshPublicDiscovery = () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('coincollect:nft-pool-discovery-refresh'))
  }

  useEffect(() => {
    if (!session || !library) {
      setChainSnapshot(null)
      return
    }
    let active = true
    const refresh = async () => {
      try {
        const [walletNetwork, actualAccount] = await Promise.all([
          library.getNetwork(),
          library.getSigner().getAddress(),
        ])
        const snapshot = await readNftLaunchChainSnapshot(simplePolygonRpcProvider, session, actualAccount)
        snapshot.chainId = walletNetwork.chainId
        if (active) {
          setChainSnapshot(snapshot)
          setSnapshotError(snapshot.readError || '')
        }
      } catch (reason: any) {
        if (active) setSnapshotError(reason?.message || 'Required chain reads are unavailable.')
      }
    }
    void refresh()
    return () => {
      active = false
    }
  }, [library, session, account])

  useEffect(() => {
    const deployHash = session?.transactionHashes.deploy
    const pendingOperation = session ? nextPendingLaunchOperation(session) : null
    if (
      !session ||
      !library ||
      !deployHash ||
      (pendingOperation && pendingOperation !== 'deploy') ||
      reconciledDeployRef.current === `${session.sessionId}:${deployHash}` ||
      (session.poolAddress && session.verification.deployment?.fingerprint && session.poolFingerprint)
    )
      return
    let active = true
    reconcileTransaction(library, deployHash)
      .then(async (reconciled) => {
        if (!active || reconciled.state === 'PENDING') return
        reconciledDeployRef.current = `${session.sessionId}:${deployHash}`
        if (reconciled.state === 'FAILED' || !reconciled.receipt) {
          setSession(
            updateNftLaunchSession(session, {
              currentStage: 'FAILED',
              retryable: false,
              error: 'Deployment transaction failed on Polygon. Review the receipt before starting a new session.',
            }),
          )
          return
        }
        const receipt = reconciled.receipt
        try {
          const poolAddress = parseNftPoolAddress(receipt, session.factoryAddress)
          if (session.poolAddress && session.poolAddress.toLowerCase() !== poolAddress.toLowerCase()) {
            setSession(
              updateNftLaunchSession(session, {
                currentStage: 'CORRUPTED',
                retryable: false,
                error: 'Stored pool address differs from the deployment receipt. No transactions are allowed.',
              }),
            )
            return
          }
          const withDeployment = updateNftLaunchSession(session, {
            poolAddress,
            currentStage: advanceLaunchStage(session, 'DEPLOY_CONFIRMED'),
            transactionHashes: { ...session.transactionHashes, deploy: reconciled.hash },
            retryable: true,
            error: session.poolAddress ? session.error : 'Deployment confirmed. Resume verification and setup.',
          })
          const verified = await verifyDeployedNftPool(
            simplePolygonRpcProvider,
            withDeployment.plan,
            withDeployment.schedule!,
            poolAddress,
          )
          const verifiedSession = updateNftLaunchSession(withDeployment, {
            verification: { ...withDeployment.verification, deployment: verified },
            poolFingerprint: verified.fingerprint,
            currentStage: advanceLaunchStage(withDeployment, verified.passed ? 'DEPLOY_VERIFIED' : 'DEPLOY_CONFIRMED'),
            error: verified.passed
              ? undefined
              : 'Pool deployed — setup incomplete. Deployment verification did not pass.',
          })
          setSession(
            verified.passed && !session.poolAddress
              ? updateNftLaunchSession(verifiedSession, {
                  currentStage: advanceLaunchStage(verifiedSession, nextNftLaunchStageAfterDeploy(verifiedSession)),
                })
              : verifiedSession,
          )
        } catch (reason: any) {
          if (active) {
            setSession(
              updateNftLaunchSession(session, {
                currentStage: 'CORRUPTED',
                retryable: false,
                error: reason?.message || 'Deployment receipt could not be reconciled safely.',
              }),
            )
          }
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

  const readFreshSnapshot = async (current: NftPoolLaunchSession): Promise<NftLaunchPoolSnapshot> => {
    if (!library) throw new Error('Connect the operator wallet before continuing.')
    const [walletNetwork, actualAccount] = await Promise.all([library.getNetwork(), library.getSigner().getAddress()])
    const snapshot = await readNftLaunchChainSnapshot(simplePolygonRpcProvider, current, actualAccount)
    snapshot.chainId = walletNetwork.chainId
    setChainSnapshot(snapshot)
    setSnapshotError(snapshot.readError || '')
    return snapshot
  }

  const gateError = (gate: LaunchEligibility): Error =>
    new Error(gate.reasons[0] || 'Safety gate did not allow this action.')

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
        walletChainId: (await library.getNetwork()).chainId,
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

  useEffect(() => {
    if (!router.isReady || !session || !library || !account || busy || session.currentStage !== 'DRAFT') return
    void runPreflight()
    // A newly created session gets one automatic preflight. Later retries stay
    // explicit so a user can review the failed checks before running again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, busy, library, router.isReady, session?.currentStage, session?.sessionId])

  const deploy = async () => {
    const currentSession = sessionRef.current || session
    if (!currentSession || !library || !currentSession.schedule || currentSession.poolAddress) return
    setError('')
    setMessage('Revalidating Polygon, factory ownership, wallet and schedule before signing…')
    try {
      const snapshot = await readFreshSnapshot(currentSession)
      const gate = canDeploy(currentSession, snapshot)
      if (!gate.allowed) {
        setMessage(gate.reasons[0] || 'Deployment safety gate blocked the wallet action.')
        setConfirmDeploy(false)
        return
      }
    } catch (reason: any) {
      setError(mapNftLaunchError(reason))
      setConfirmDeploy(false)
      return
    }
    setBusy(true)
    setMessage('Confirm the deployment in your wallet…')
    const current =
      update({ currentStage: 'AWAITING_DEPLOY_SIGNATURE', error: undefined, retryable: true }) || currentSession
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
        poolFingerprint: verified.fingerprint,
        currentStage: verified.passed ? 'DEPLOY_VERIFIED' : 'DEPLOY_CONFIRMED',
        error: verified.passed ? undefined : 'Pool deployed — setup incomplete. Deployment verification did not pass.',
        retryable: true,
      })
      if (verified.passed)
        update({
          currentStage: nextNftLaunchStageAfterDeploy({
            ...withDeployment,
            verification: { ...withDeployment.verification, deployment: verified },
          }),
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
    const currentSession = sessionRef.current || session
    if (!currentSession || !library || !currentSession.poolAddress) return
    if (currentSession.transactionHashes.weights && !currentSession.verification.weights?.passed) {
      const reconciled = await reconcileTransaction(library, currentSession.transactionHashes.weights)
      if (reconciled.state === 'PENDING') {
        setError('NFT power transaction is still pending. No duplicate configuration will be sent.')
        return
      }
      if (reconciled.state === 'FAILED' || !reconciled.receipt) {
        update({
          transactionHashes: { ...currentSession.transactionHashes, weights: undefined },
          currentStage: 'WEIGHTS_REQUIRED',
          error: 'The previous NFT power transaction failed. It is safe to retry now.',
        })
        return
      }
      const reconciledVerification = await verifyNftCollectionWeights(
        simplePolygonRpcProvider,
        currentSession.plan,
        currentSession.poolAddress,
      )
      if (!reconciledVerification.passed) {
        update({
          currentStage: 'CORRUPTED',
          retryable: false,
          error: 'NFT power receipt was confirmed but the on-chain read-back did not match. No duplicate was sent.',
        })
        return
      }
      const confirmedSession = update({
        verification: { ...currentSession.verification, weights: reconciledVerification },
        transactionHashes: { ...currentSession.transactionHashes, weights: reconciled.hash },
        currentStage: nextNftLaunchStageAfterWeights(currentSession),
        error: undefined,
      })
      if (confirmedSession) update({ currentStage: nextNftLaunchStageAfterWeights(confirmedSession) })
      return
    }
    try {
      const snapshot = await readFreshSnapshot(currentSession)
      const gate = canConfigureWeights(currentSession, snapshot)
      if (!gate.allowed) {
        setError(gate.reasons[0] || 'NFT power configuration was blocked by the safety gate.')
        return
      }
    } catch (reason) {
      setError(mapNftLaunchError(reason))
      return
    }
    setBusy(true)
    setError('')
    setMessage('Confirm the NFT power configuration in your wallet…')
    const current = update({ currentStage: 'AWAITING_WEIGHTS_SIGNATURE', error: undefined }) || currentSession
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
      const verifiedSession = update({
        verification: { ...current.verification, weights: verified },
        transactionHashes: { ...current.transactionHashes, weights: receipt.transactionHash },
        currentStage: verified.passed ? 'WEIGHTS_VERIFIED' : 'WEIGHTS_REQUIRED',
        error: verified.passed ? undefined : 'NFT power verification failed; no later step was started.',
      })
      if (verified.passed && verifiedSession) update({ currentStage: nextNftLaunchStageAfterWeights(verifiedSession) })
      setMessage(verified.passed ? 'NFT powers verified.' : 'NFT powers were not verified.')
    } catch (reason) {
      update({ currentStage: 'WEIGHTS_REQUIRED', error: mapNftLaunchError(reason), retryable: true })
      setError(mapNftLaunchError(reason))
    } finally {
      setBusy(false)
    }
  }

  const configureFee = async () => {
    const currentSession = sessionRef.current || session
    if (
      !currentSession ||
      !library ||
      !currentSession.poolAddress ||
      !currentSession.plan.postDeploy.feeTo ||
      !currentSession.plan.postDeploy.performanceFee
    )
      return
    if (currentSession.transactionHashes.fee && !currentSession.verification.fee?.passed) {
      const reconciled = await reconcileTransaction(library, currentSession.transactionHashes.fee)
      if (reconciled.state === 'PENDING') {
        setError('Fee configuration transaction is still pending. No duplicate configuration will be sent.')
        return
      }
      if (reconciled.state === 'FAILED' || !reconciled.receipt) {
        update({
          transactionHashes: { ...currentSession.transactionHashes, fee: undefined },
          currentStage: 'FEE_CONFIG_REQUIRED',
          error: 'The previous fee transaction failed. It is safe to retry now.',
        })
        return
      }
      const reconciledVerification = await verifyNftPerformanceFee(
        simplePolygonRpcProvider,
        currentSession.plan,
        currentSession.poolAddress,
      )
      if (!reconciledVerification.passed) {
        update({
          currentStage: 'CORRUPTED',
          retryable: false,
          error: 'Fee receipt was confirmed but the on-chain read-back did not match. No duplicate was sent.',
        })
        return
      }
      const confirmedSession = update({
        verification: { ...currentSession.verification, fee: reconciledVerification },
        transactionHashes: { ...currentSession.transactionHashes, fee: reconciled.hash },
        currentStage: 'FUNDING_REQUIRED',
        error: undefined,
      })
      if (confirmedSession) update({ currentStage: 'FUNDING_REQUIRED' })
      return
    }
    try {
      const snapshot = await readFreshSnapshot(currentSession)
      const gate = canConfigureFee(currentSession, snapshot)
      if (!gate.allowed) {
        setError(gate.reasons[0] || 'Fee configuration was blocked by the safety gate.')
        return
      }
    } catch (reason) {
      setError(mapNftLaunchError(reason))
      return
    }
    setBusy(true)
    setError('')
    setMessage('Confirm the performance fee configuration in your wallet…')
    const current = update({ currentStage: 'AWAITING_FEE_SIGNATURE', error: undefined }) || currentSession
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
      const verifiedSession = update({
        verification: { ...current.verification, fee: verified },
        transactionHashes: { ...current.transactionHashes, fee: receipt.transactionHash },
        currentStage: verified.passed ? 'FEE_VERIFIED' : 'FEE_CONFIG_REQUIRED',
        error: verified.passed ? undefined : 'Fee configuration verification failed.',
      })
      if (verified.passed && verifiedSession) update({ currentStage: 'FUNDING_REQUIRED' })
      setMessage(verified.passed ? 'Performance fee verified.' : 'Performance fee was not verified.')
    } catch (reason) {
      update({ currentStage: 'FEE_CONFIG_REQUIRED', error: mapNftLaunchError(reason), retryable: true })
      setError(mapNftLaunchError(reason))
    } finally {
      setBusy(false)
    }
  }

  const fund = async () => {
    const currentSession = sessionRef.current || session
    if (!currentSession || !library || !currentSession.poolAddress) return
    try {
      const snapshot = await readFreshSnapshot(currentSession)
      const gate = canFund(currentSession, snapshot)
      if (!gate.allowed) {
        setError(gate.reasons[0] || 'Reward funding was blocked by the safety gate.')
        return
      }
    } catch (reason) {
      setError(mapNftLaunchError(reason))
      return
    }
    setBusy(true)
    setError('')
    setMessage('Funding is sequential and verifies each pool balance after confirmation…')
    const current = update({ currentStage: 'FUNDING_IN_PROGRESS', error: undefined }) || currentSession
    try {
      const pendingHash = sessionRef.current?.transactionHashes.primaryFunding
      if (pendingHash) {
        const reconciled = await reconcileTransaction(library, pendingHash)
        if (reconciled.state === 'PENDING')
          throw new Error('Primary funding transaction is still pending. The workflow will not send a duplicate.')
        update({
          transactionHashes: {
            ...(sessionRef.current || current).transactionHashes,
            primaryFunding: reconciled.state === 'CONFIRMED' ? reconciled.hash : undefined,
          },
          ...(reconciled.state === 'FAILED'
            ? {
                funding: {
                  ...(sessionRef.current || current).funding,
                  primary: {
                    ...(sessionRef.current || current).funding.primary,
                    status: 'FAILED' as const,
                    tokenAddress: current.plan.fundingRequirements.primary.tokenAddress,
                    requiredAmount: primaryFundingAmount(current.plan).toString(),
                    error: 'Previous primary funding transaction failed; retrying the missing balance.',
                  },
                },
              }
            : {}),
        })
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
        const sideSnapshot = await readFreshSnapshot(sessionRef.current || current)
        const sideGate = canFund(sessionRef.current || current, sideSnapshot)
        if (!sideGate.allowed) throw gateError(sideGate)
        const existingSideHash = sessionRef.current?.transactionHashes.sideFunding[side.tokenAddress.toLowerCase()]
        if (existingSideHash) {
          const reconciled = await reconcileTransaction(library, existingSideHash)
          if (reconciled.state === 'PENDING')
            throw new Error(
              `Side funding transaction for ${side.tokenAddress} is still pending. No duplicate was sent.`,
            )
          update({
            transactionHashes: {
              ...(sessionRef.current || current).transactionHashes,
              sideFunding: {
                ...(sessionRef.current || current).transactionHashes.sideFunding,
                ...(reconciled.state === 'CONFIRMED'
                  ? { [side.tokenAddress.toLowerCase()]: reconciled.hash }
                  : (() => {
                      const nextSideFunding = { ...(sessionRef.current || current).transactionHashes.sideFunding }
                      delete nextSideFunding[side.tokenAddress.toLowerCase()]
                      return nextSideFunding
                    })()),
              },
            },
            ...(reconciled.state === 'FAILED'
              ? {
                  funding: {
                    ...(sessionRef.current || current).funding,
                    side: {
                      ...(sessionRef.current || current).funding.side,
                      [side.tokenAddress.toLowerCase()]: {
                        ...(sessionRef.current || current).funding.side[side.tokenAddress.toLowerCase()],
                        status: 'FAILED' as const,
                        tokenAddress: side.tokenAddress,
                        requiredAmount: sideFundingAmount(current.plan, side.tokenAddress).toString(),
                        error: 'Previous side funding transaction failed; retrying the missing balance.',
                      },
                    },
                  },
                }
              : {}),
          })
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
      const fundingVerified = await verifyNftFunding(simplePolygonRpcProvider, current.plan, current.poolAddress!)
      const finalVerified = await verifyFinalNftLaunch(
        simplePolygonRpcProvider,
        current.plan,
        current.schedule!,
        current.poolAddress!,
      )
      const nextSession = {
        ...(sessionRef.current || current),
        verification: {
          ...(sessionRef.current || current).verification,
          funding: fundingVerified,
          final: finalVerified,
        },
        currentStage:
          fundingVerified.passed && finalVerified.passed ? ('COMPLETE' as const) : ('FUNDING_REQUIRED' as const),
      }
      const invariantErrors = validateLaunchSessionInvariant(nextSession)
      if (nextSession.currentStage === 'COMPLETE' && invariantErrors.length) throw new Error(invariantErrors[0])
      update({
        verification: nextSession.verification,
        currentStage: nextSession.currentStage,
        error:
          fundingVerified.passed && finalVerified.passed
            ? undefined
            : 'Final verification did not pass. Funding/setup remains incomplete.',
      })
      setMessage(
        fundingVerified.passed && finalVerified.passed
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
    const currentSession = sessionRef.current || session
    if (!currentSession || !currentSession.poolAddress || !currentSession.schedule) return
    try {
      const snapshot = await readFreshSnapshot(currentSession)
      const gate = canFinalVerify(currentSession, snapshot)
      if (!gate.allowed) {
        setError(gate.reasons[0] || 'Final verification was blocked by the safety gate.')
        return
      }
    } catch (reason) {
      setError(mapNftLaunchError(reason))
      return
    }
    setBusy(true)
    setError('')
    const current = update({ currentStage: 'FINAL_VERIFYING', error: undefined }) || currentSession
    try {
      const fundingVerified = await verifyNftFunding(simplePolygonRpcProvider, current.plan, current.poolAddress!)
      const verified = await verifyFinalNftLaunch(
        simplePolygonRpcProvider,
        current.plan,
        current.schedule!,
        current.poolAddress!,
      )
      const nextSession = {
        ...current,
        verification: { ...current.verification, funding: fundingVerified, final: verified },
        currentStage: fundingVerified.passed && verified.passed ? ('COMPLETE' as const) : ('FUNDING_REQUIRED' as const),
      }
      const invariantErrors = validateLaunchSessionInvariant(nextSession)
      if (nextSession.currentStage === 'COMPLETE' && invariantErrors.length) throw new Error(invariantErrors[0])
      update({
        verification: nextSession.verification,
        currentStage: nextSession.currentStage,
        error: fundingVerified.passed && verified.passed ? undefined : 'Final verification did not pass.',
      })
    } catch (reason) {
      update({ currentStage: 'FUNDING_REQUIRED', error: mapNftLaunchError(reason) })
      setError(mapNftLaunchError(reason))
    } finally {
      setBusy(false)
    }
  }

  const resume = async () => {
    const currentSession = sessionRef.current || session
    if (!currentSession || !library) return
    if (!currentSession.transactionHashes.deploy && !currentSession.poolAddress) {
      await runPreflight()
      return
    }
    setBusy(true)
    setError('')
    setMessage('Checking the saved launch state…')
    try {
      let refreshed = sessionRef.current || currentSession
      const operation = nextPendingLaunchOperation(refreshed)

      if (
        operation === 'schedule' &&
        refreshed.transactionHashes.scheduleUpdate &&
        refreshed.pendingSchedule &&
        refreshed.poolAddress
      ) {
        const pendingSchedule = refreshed.pendingSchedule
        const reconciled = await reconcileTransaction(library, refreshed.transactionHashes.scheduleUpdate)
        if (reconciled.state === 'PENDING') {
          setMessage('Schedule update transaction is still pending. The canonical schedule remains unchanged.')
          return
        }
        if (reconciled.state === 'FAILED' || !reconciled.receipt) {
          update({
            pendingSchedule: undefined,
            transactionHashes: { ...refreshed.transactionHashes, scheduleUpdate: undefined },
            error: 'Schedule update transaction failed; the canonical schedule remains unchanged. You can retry it.',
          })
          return
        }
        const confirmed = await readFreshSnapshot(refreshed)
        if (confirmed.startBlock !== pendingSchedule.startBlock || confirmed.endBlock !== pendingSchedule.endBlock) {
          update({
            currentStage: 'CORRUPTED',
            pendingSchedule: undefined,
            retryable: false,
            error:
              'Schedule update receipt did not match the confirmed on-chain schedule. No transactions are allowed.',
          })
          return
        }
        const deploymentVerified = await verifyDeployedNftPool(
          simplePolygonRpcProvider,
          refreshed.plan,
          pendingSchedule,
          refreshed.poolAddress,
        )
        if (!deploymentVerified.passed) {
          update({
            currentStage: 'CORRUPTED',
            pendingSchedule: undefined,
            retryable: false,
            error:
              'Schedule update changed the pool, but deployment verification did not pass. No transactions are allowed.',
          })
          return
        }
        update({
          schedule: pendingSchedule,
          pendingSchedule: undefined,
          transactionHashes: { ...refreshed.transactionHashes, scheduleUpdate: reconciled.hash },
          poolFingerprint: deploymentVerified.fingerprint,
          verification: {
            ...refreshed.verification,
            deployment: deploymentVerified,
            final: undefined,
          },
          error: undefined,
        })
        setMessage('Schedule update confirmed and read back exactly. The later start is now canonical.')
        return
      }
      refreshed = sessionRef.current || refreshed
      if (operation === 'weights' && refreshed.transactionHashes.weights && refreshed.poolAddress) {
        const reconciled = await reconcileTransaction(library, refreshed.transactionHashes.weights)
        if (reconciled.state === 'PENDING') {
          setMessage('NFT power transaction is still pending.')
          return
        }
        if (reconciled.state === 'FAILED' || !reconciled.receipt) {
          update({
            transactionHashes: { ...refreshed.transactionHashes, weights: undefined },
            currentStage: 'WEIGHTS_REQUIRED',
            error: 'NFT power transaction failed; review the receipt before retrying. The failed hash was cleared.',
          })
          return
        }
        const verified = await verifyNftCollectionWeights(
          simplePolygonRpcProvider,
          refreshed.plan,
          refreshed.poolAddress,
        )
        const verifiedSession = update({
          verification: { ...refreshed.verification, weights: verified },
          transactionHashes: { ...refreshed.transactionHashes, weights: reconciled.hash },
          currentStage: verified.passed ? 'WEIGHTS_VERIFIED' : 'WEIGHTS_REQUIRED',
          error: verified.passed ? undefined : 'NFT power verification failed.',
        })
        if (verified.passed && verifiedSession)
          update({ currentStage: nextNftLaunchStageAfterWeights(verifiedSession) })
        return
      }
      refreshed = sessionRef.current || refreshed
      if (operation === 'fee' && refreshed.transactionHashes.fee && refreshed.poolAddress) {
        const reconciled = await reconcileTransaction(library, refreshed.transactionHashes.fee)
        if (reconciled.state === 'PENDING') {
          setMessage('Fee configuration transaction is still pending.')
          return
        }
        if (reconciled.state === 'FAILED' || !reconciled.receipt) {
          update({
            transactionHashes: { ...refreshed.transactionHashes, fee: undefined },
            currentStage: 'FEE_CONFIG_REQUIRED',
            error:
              'Fee configuration transaction failed; review the receipt before retrying. The failed hash was cleared.',
          })
          return
        }
        const verified = await verifyNftPerformanceFee(simplePolygonRpcProvider, refreshed.plan, refreshed.poolAddress)
        const verifiedSession = update({
          verification: { ...refreshed.verification, fee: verified },
          transactionHashes: { ...refreshed.transactionHashes, fee: reconciled.hash },
          currentStage: verified.passed ? 'FEE_VERIFIED' : 'FEE_CONFIG_REQUIRED',
          error: verified.passed ? undefined : 'Fee configuration verification failed.',
        })
        if (verified.passed && verifiedSession) update({ currentStage: 'FUNDING_REQUIRED' })
        return
      }
      refreshed = sessionRef.current || refreshed
      const missingSetupStep = nextUnverifiedSetupStep(refreshed)
      if (missingSetupStep === 'weights' && refreshed.poolAddress) {
        setMessage('Reading the pool’s NFT power settings before unlocking reward funding…')
        const verification = await verifyNftCollectionWeights(
          simplePolygonRpcProvider,
          refreshed.plan,
          refreshed.poolAddress,
        )
        const verificationSnapshot = { ...refreshed.verification, weights: verification }
        update({
          verification: verificationSnapshot,
          currentStage: verification.passed
            ? nextNftLaunchStageAfterWeights({ ...refreshed, verification: verificationSnapshot })
            : 'WEIGHTS_REQUIRED',
          error: undefined,
        })
        setMessage(
          verification.passed
            ? 'NFT power settings already match the frozen plan. No wallet transaction was sent; continue to the next step.'
            : 'NFT power settings are not verified. Review the read-back below, then choose Confirm NFT setup to request any required wallet transaction.',
        )
        return
      }
      if (missingSetupStep === 'fee' && refreshed.poolAddress) {
        setMessage('Reading the pool’s fee settings before unlocking reward funding…')
        const verification = await verifyNftPerformanceFee(
          simplePolygonRpcProvider,
          refreshed.plan,
          refreshed.poolAddress,
        )
        update({
          verification: { ...refreshed.verification, fee: verification },
          currentStage: verification.passed ? 'FUNDING_REQUIRED' : 'FEE_CONFIG_REQUIRED',
          error: undefined,
        })
        setMessage(
          verification.passed
            ? 'Fee settings already match the frozen plan. No wallet transaction was sent; continue to reward funding.'
            : 'Fee settings are not verified. Review the read-back and use Confirm fee setup if the values need updating.',
        )
        return
      }
      if (operation === 'funding' || refreshed.currentStage === 'FUNDING_IN_PROGRESS') {
        setBusy(false)
        await fund()
        return
      }
      refreshed = sessionRef.current || refreshed
      if (nextPendingLaunchOperation(refreshed) === 'deploy' && refreshed.transactionHashes.deploy) {
        const reconciled = await reconcileTransaction(library, refreshed.transactionHashes.deploy)
        if (reconciled.state === 'PENDING') {
          setMessage('Deployment transaction is still pending. No duplicate deployment will be sent.')
          return
        }
        if (reconciled.state === 'FAILED' || !reconciled.receipt) {
          update({
            currentStage: 'FAILED',
            retryable: false,
            error: 'Deployment transaction failed on Polygon. Review the receipt before starting a new session.',
          })
          return
        }
        let poolAddress: string
        try {
          poolAddress = parseNftPoolAddress(reconciled.receipt, refreshed.factoryAddress)
        } catch (reason) {
          update({ currentStage: 'CORRUPTED', retryable: false, error: mapNftLaunchError(reason) })
          return
        }
        if (refreshed.poolAddress && refreshed.poolAddress.toLowerCase() !== poolAddress.toLowerCase()) {
          update({
            currentStage: 'CORRUPTED',
            retryable: false,
            error: 'Stored pool address differs from the deployment receipt. No transactions are allowed.',
          })
          return
        }
        const withDeployment =
          update({
            poolAddress,
            currentStage: advanceLaunchStage(refreshed, 'DEPLOY_CONFIRMED'),
            transactionHashes: { ...refreshed.transactionHashes, deploy: reconciled.hash },
            error: undefined,
          }) || refreshed
        const verified = await verifyDeployedNftPool(
          simplePolygonRpcProvider,
          withDeployment.plan,
          withDeployment.schedule!,
          poolAddress,
        )
        const verifiedSession = update({
          verification: { ...withDeployment.verification, deployment: verified },
          poolFingerprint: verified.fingerprint,
          currentStage: advanceLaunchStage(withDeployment, verified.passed ? 'DEPLOY_VERIFIED' : 'DEPLOY_CONFIRMED'),
          error: verified.passed ? undefined : 'Pool deployed — setup incomplete.',
        })
        if (verified.passed && verifiedSession)
          update({ currentStage: advanceLaunchStage(verifiedSession, nextNftLaunchStageAfterDeploy(verifiedSession)) })
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
    const currentSession = sessionRef.current || session
    if (!currentSession || !library || !currentSession.poolAddress || !currentSession.schedule) return
    try {
      const snapshot = await readFreshSnapshot(currentSession)
      const gate = canMoveSchedule(currentSession, snapshot)
      if (!gate.allowed) {
        setError(gate.reasons[0] || 'Schedule update was blocked by the safety gate.')
        return
      }
    } catch (reason) {
      setError(mapNftLaunchError(reason))
      return
    }
    setBusy(true)
    setError('')
    setMessage('Reading the current pool schedule before requesting a later start…')
    try {
      const current = await readFreshSnapshot(currentSession)
      if (current.startBlock === undefined) throw new Error('Pool start block could not be read.')
      // The schedule-update transaction itself and every still-unverified
      // setup write consume blocks before funding's safety gate can pass.
      const nextSchedule = moveNftLaunchScheduleLater(
        currentSession.schedule,
        current.currentBlock,
        currentSession.schedule.measuredSecondsPerBlock,
        currentSession.schedule.bufferSeconds,
        1 + remainingNftLaunchSetupWriteCount(currentSession),
      )
      const receipt = await updateNftPoolSchedule(
        library.getSigner(),
        currentSession.poolAddress,
        nextSchedule.startBlock,
        nextSchedule.endBlock,
        (hash) =>
          update({
            transactionHashes: { ...(sessionRef.current || currentSession).transactionHashes, scheduleUpdate: hash },
            pendingSchedule: nextSchedule,
          }),
      )
      const confirmed = await readFreshSnapshot(sessionRef.current || currentSession)
      if (confirmed.startBlock !== nextSchedule.startBlock || confirmed.endBlock !== nextSchedule.endBlock)
        throw new Error('Schedule update receipt did not match the confirmed on-chain schedule.')
      const deploymentVerified = await verifyDeployedNftPool(
        simplePolygonRpcProvider,
        currentSession.plan,
        nextSchedule,
        currentSession.poolAddress,
      )
      if (!deploymentVerified.passed)
        throw new Error('Schedule update changed the pool, but deployment verification did not pass.')
      update({
        schedule: nextSchedule,
        pendingSchedule: undefined,
        poolFingerprint: deploymentVerified.fingerprint,
        verification: {
          ...(sessionRef.current || currentSession).verification,
          deployment: deploymentVerified,
          final: undefined,
        },
        transactionHashes: {
          ...(sessionRef.current || currentSession).transactionHashes,
          scheduleUpdate: receipt.transactionHash,
        },
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
  const blockedUntilRead: LaunchEligibility = {
    allowed: false,
    reasons: [snapshotError || 'Refreshing the read-only chain safety snapshot…'],
  }
  const launchEligibility = session && chainSnapshot ? canDeploy(session, chainSnapshot) : blockedUntilRead
  const weightsEligibility = session && chainSnapshot ? canConfigureWeights(session, chainSnapshot) : blockedUntilRead
  const feeEligibility = session && chainSnapshot ? canConfigureFee(session, chainSnapshot) : blockedUntilRead
  const fundingEligibility = session && chainSnapshot ? canFund(session, chainSnapshot) : blockedUntilRead
  const finalEligibility = session && chainSnapshot ? canFinalVerify(session, chainSnapshot) : blockedUntilRead
  const moveScheduleEligibility = session && chainSnapshot ? canMoveSchedule(session, chainSnapshot) : blockedUntilRead
  const canLaunch = launchEligibility.allowed
  const activeGateReason =
    session?.currentStage === 'PREFLIGHT_READY'
      ? launchEligibility.reasons[0]
      : session?.currentStage === 'WEIGHTS_REQUIRED'
      ? weightsEligibility.reasons[0]
      : session?.currentStage === 'FEE_CONFIG_REQUIRED'
      ? feeEligibility.reasons[0]
      : session?.currentStage === 'FUNDING_REQUIRED' || session?.currentStage === 'FUNDING_IN_PROGRESS'
      ? fundingEligibility.reasons[0]
      : undefined
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
  const invariantErrors = session ? validateLaunchSessionInvariant(session) : []

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

  const tokenBalances = session.preflight?.tokenBalances || []
  const tokenDetails = (address: string) => {
    const normalizedAddress = address.toLowerCase()
    const live = tokenBalances.find((token) => token.tokenAddress.toLowerCase() === normalizedAddress)
    const configured = Object.values(mainnetTokens).find((token) => token.address?.toLowerCase() === normalizedAddress)
    return { symbol: live?.symbol || configured?.symbol, decimals: live?.decimals ?? configured?.decimals }
  }
  const tokenLabel = (address: string) => tokenDetails(address).symbol || short(address)
  const tokenAmount = (address: string, rawAmount: string) => {
    const decimals = tokenDetails(address).decimals
    if (decimals === undefined) return `${rawAmount} base units`
    try {
      const [whole, fraction = ''] = formatUnits(rawAmount, decimals).split('.')
      const cleanFraction = fraction.slice(0, 5).replace(/0+$/, '')
      return cleanFraction ? `${whole}.${cleanFraction}` : whole
    } catch {
      return `${rawAmount} base units`
    }
  }
  const stageDescription =
    (error
      ? `Could not continue: ${error}`
      : message
      ? message
      : activeGateReason
      ? `This step is blocked: ${activeGateReason}`
      : session.error
      ? `Launch needs attention: ${session.error}`
      : message) ||
    (session.currentStage === 'COMPLETE'
      ? 'All required on-chain checks passed. This browser can now list the pool locally.'
      : session.currentStage === 'PREFLIGHT_READY'
      ? 'Review the frozen plan, then continue with the separate wallet-confirmed deployment.'
      : session.currentStage === 'FUNDING_REQUIRED' || session.currentStage === 'FUNDING_IN_PROGRESS'
      ? 'Only missing reward-token balances are transferred; each pool balance is checked afterward.'
      : 'Continue one verified setup step at a time. Every write requires its own wallet confirmation.')
  const canaryRecommendation = getNftCanaryRecommendation(session.plan)
  const attentionMessages = [
    error || session.error,
    invariantErrors.length && session.currentStage !== 'CORRUPTED'
      ? `Safety invariant: ${invariantErrors[0]}`
      : undefined,
    session.currentStage === 'COMPLETE' && chainSnapshot && !finalEligibility.allowed
      ? 'Completed session no longer matches expected on-chain state.'
      : undefined,
  ].filter((item): item is string => Boolean(item))

  return (
    <AdminShell
      title="Create NFT pool"
      subtitle="Review the checks, create the contract and finish the pool setup."
      authorityScope="nft"
    >
      {attentionMessages.length ? (
        <Notice $error role="alert">
          <strong>Launch needs attention</strong>
          {attentionMessages.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </Notice>
      ) : null}
      <LaunchHero>
        <div>
          <LaunchHeroEyebrow>NFT POOL LAUNCH · SESSION {short(session.sessionId)}</LaunchHeroEyebrow>
          <h2 style={{ margin: '8px 0 6px' }}>
            {session.currentStage === 'COMPLETE'
              ? `${session.publicationMetadata?.name || 'NFT pool'} is ready`
              : session.publicationMetadata?.name || 'Create your NFT pool'}
          </h2>
          <Muted>Guided deployment · {summary} · each on-chain step is confirmed separately in your wallet.</Muted>
          <LaunchHeroMeta>
            <span>Chain {chainSnapshot?.chainId ?? session.chainId}</span>
            <span>{session.plan.scheduleIntent.durationDays} day schedule</span>
            <span>{session.plan.collectionConfiguration.communityCollections.length + 1} NFT collections</span>
          </LaunchHeroMeta>
        </div>
        <LaunchPill $tone={session.currentStage === 'COMPLETE' ? 'good' : error || session.error ? 'bad' : 'warn'}>
          {launchStageLabel(session.currentStage)}
        </LaunchPill>
      </LaunchHero>

      <LaunchProgressPanel>
        <LaunchProgressTitle>
          <PanelTitle style={{ margin: 0 }}>Launch path</PanelTitle>
          <LaunchProgressSummary>
            {session.currentStage === 'COMPLETE' ? steps.length : activeIndex + 1} / {steps.length} steps
          </LaunchProgressSummary>
        </LaunchProgressTitle>
        <LaunchSteps aria-label="NFT pool launch progress" role="list">
          {steps.map((item, index) => {
            const done = activeIndex > index || session.currentStage === 'COMPLETE'
            const current = activeIndex === index && session.currentStage !== 'COMPLETE'
            return (
              <LaunchStep
                key={item.key}
                $active={current}
                $done={done}
                $blocked={Boolean((error || session.error) && current)}
                aria-current={current ? 'step' : undefined}
                role="listitem"
              >
                <strong>{item.title}</strong>
                <LaunchStepState>{done ? 'Done' : current ? 'In progress' : 'Next'}</LaunchStepState>
              </LaunchStep>
            )
          })}
        </LaunchSteps>
      </LaunchProgressPanel>

      <LaunchWorkspace>
        <LaunchMainColumn>
          <Panel>
            <LaunchActionHeader>
              <div>
                <PanelTitle style={{ marginBottom: 6 }}>Next action</PanelTitle>
                <Muted role="status" aria-live="polite">
                  {stageDescription}
                </Muted>
              </div>
            </LaunchActionHeader>
            <ButtonRow>
              {!session.poolAddress &&
              ['DRAFT', 'PREFLIGHT_FAILED', 'PREFLIGHT_READY'].includes(session.currentStage) ? (
                <ActionButton onClick={runPreflight} disabled={busy || !account}>
                  {busy && session.currentStage === 'PREFLIGHT_RUNNING' ? 'Checking…' : 'Check setup'}
                </ActionButton>
              ) : null}
              {session.currentStage === 'PREFLIGHT_READY' ? (
                <ActionButton onClick={() => setConfirmDeploy(true)} disabled={busy || !canLaunch}>
                  Create Pool
                </ActionButton>
              ) : null}
              {session.poolAddress && needsWeights && session.currentStage === 'WEIGHTS_REQUIRED' ? (
                <ActionButton onClick={configureWeights} disabled={busy || !weightsEligibility.allowed}>
                  Confirm NFT setup
                </ActionButton>
              ) : null}
              {session.poolAddress && needsFee && session.currentStage === 'FEE_CONFIG_REQUIRED' ? (
                <ActionButton onClick={configureFee} disabled={busy || !feeEligibility.allowed}>
                  Confirm fee setup
                </ActionButton>
              ) : null}
              {session.poolAddress && ['FUNDING_REQUIRED', 'FUNDING_IN_PROGRESS'].includes(session.currentStage) ? (
                <ActionButton onClick={fund} disabled={busy || !fundingEligibility.allowed}>
                  Fund rewards
                </ActionButton>
              ) : null}
              {session.poolAddress && session.currentStage !== 'COMPLETE' ? (
                <ActionButton $secondary onClick={finalVerify} disabled={busy || !finalEligibility.allowed}>
                  Run final check
                </ActionButton>
              ) : null}
              {session.poolAddress && session.currentStage !== 'COMPLETE' ? (
                <ActionButton $secondary onClick={moveStartLater} disabled={busy || !moveScheduleEligibility.allowed}>
                  Move start later
                </ActionButton>
              ) : null}
              {canRetryLaunch(session) &&
              session.currentStage !== 'PREFLIGHT_READY' &&
              session.currentStage !== 'DRAFT' ? (
                <ActionButton $secondary onClick={resume} disabled={busy}>
                  Continue setup
                </ActionButton>
              ) : null}
            </ButtonRow>
            {activeGateReason ? (
              <Muted style={{ display: 'block', marginTop: 12 }}>Safety gate: {activeGateReason}</Muted>
            ) : null}
          </Panel>

          {confirmDeploy ? (
            <Panel style={{ borderColor: '#D97706' }}>
              <PanelTitle>Confirm pool creation</PanelTitle>
              <Muted>Review the final details one more time before opening your wallet.</Muted>
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
                This cannot be undone. The factory deployment will create a new on-chain pool and requires a separate
                wallet confirmation.
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
            <Panel>
              <LaunchActionHeader>
                <PanelTitle style={{ marginBottom: 0 }}>Readiness check</PanelTitle>
                <LaunchPill $tone={session.preflight.ok ? 'good' : 'bad'}>
                  {session.preflight.ok ? 'Ready' : 'Needs attention'}
                </LaunchPill>
              </LaunchActionHeader>
              <LaunchFacts>
                <LaunchFact>
                  <Muted>Current block</Muted>
                  <strong>{session.preflight.currentBlock.toLocaleString()}</strong>
                </LaunchFact>
                <LaunchFact>
                  <Muted>Prepared schedule</Muted>
                  <strong>
                    {session.preflight.schedule.startBlock.toLocaleString()} →{' '}
                    {session.preflight.schedule.endBlock.toLocaleString()}
                  </strong>
                </LaunchFact>
                <LaunchFact>
                  <Muted>Setup buffer</Muted>
                  <strong>
                    {session.preflight.schedule.setupBufferBlocks.toLocaleString()} blocks ·{' '}
                    {Math.round(session.preflight.schedule.bufferSeconds / 60)} min
                  </strong>
                </LaunchFact>
                <LaunchFact>
                  <Muted>Deployment gas estimate</Muted>
                  <strong>
                    {session.preflight.deploymentGas
                      ? `${session.preflight.deploymentGas.safetyCost} wei`
                      : 'Not available'}
                  </strong>
                </LaunchFact>
                <LaunchFact>
                  <Muted>Preflight expires</Muted>
                  <strong>
                    Block {session.preflight.expiresAtBlock.toLocaleString()} · checked at{' '}
                    {session.preflight.currentBlockAtPreflight.toLocaleString()}
                  </strong>
                </LaunchFact>
              </LaunchFacts>
              <CheckTable checks={session.preflight.checks} />
              <Muted style={{ display: 'block', marginTop: 12 }}>
                Setup and funding gas are simulated again immediately before each wallet confirmation.
              </Muted>
            </Panel>
          ) : null}

          {session.poolAddress ? (
            <Panel>
              <PanelTitle>Confirmed deployment</PanelTitle>
              <Muted>Pool address comes from the confirmed factory deployment event.</Muted>
              <TableWrap style={{ marginTop: 12 }}>
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
                <div style={{ marginTop: 14 }}>
                  <CheckTable checks={session.verification.deployment.checks} />
                </div>
              ) : null}
            </Panel>
          ) : null}

          {session.poolAddress && needsWeights ? (
            <Panel>
              <LaunchActionHeader>
                <PanelTitle style={{ marginBottom: 0 }}>NFT power verification</PanelTitle>
                <LaunchPill
                  $tone={session.verification.weights?.passed ? 'good' : session.verification.weights ? 'bad' : 'warn'}
                >
                  {session.verification.weights?.passed
                    ? 'Verified'
                    : session.verification.weights
                    ? 'Needs setup'
                    : 'Not checked'}
                </LaunchPill>
              </LaunchActionHeader>
              {session.verification.weights ? (
                <CheckTable checks={session.verification.weights.checks} />
              ) : (
                <Muted style={{ display: 'block', marginTop: 10 }}>
                  Green preflight checks validate the launch plan, not the deployed collection powers. Continue setup
                  reads the pool values first; if they do not match, Confirm NFT setup is the separate wallet-confirmed
                  action.
                </Muted>
              )}
            </Panel>
          ) : null}

          {session.currentStage === 'COMPLETE' ? (
            <Panel>
              <LaunchPill $tone="good">Launch complete</LaunchPill>
              <h3>Deployment, configuration and funding checks are complete.</h3>
              <p role="status">Factory discovery and chain readiness control public catalogue admission.</p>
              {session.poolAddress ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <Link href={`/nftpools/pool/${session.poolAddress}`}>View pool</Link>
                  <ActionButton onClick={refreshPublicDiscovery}>Refresh factory discovery</ActionButton>
                  <ActionButton onClick={exportPresentationMetadata}>Export presentation metadata</ActionButton>
                </div>
              ) : null}
              <Muted>
                Required deployment, configuration and funding read-backs passed. No automatic swap or hidden
                transaction was performed. A pool that still needs on-chain setup remains in the admin discovery view.
              </Muted>
            </Panel>
          ) : null}
        </LaunchMainColumn>

        <LaunchSideColumn>
          <Panel>
            <PanelTitle>Pool snapshot</PanelTitle>
            <LaunchSummaryGrid>
              <LaunchSummaryItem>
                <Muted>Collections</Muted>
                <strong>{session.plan.collectionConfiguration.communityCollections.length + 1}</strong>
              </LaunchSummaryItem>
              <LaunchSummaryItem>
                <Muted>Reward tokens</Muted>
                <strong>{session.plan.fundingRequirements.side.length + 1}</strong>
              </LaunchSummaryItem>
              <LaunchSummaryItem>
                <Muted>Duration</Muted>
                <strong>{session.plan.scheduleIntent.durationDays} days</strong>
              </LaunchSummaryItem>
              <LaunchSummaryItem>
                <Muted>Min. effective power</Muted>
                <strong>{session.plan.factoryParameters.participantThreshold}</strong>
              </LaunchSummaryItem>
            </LaunchSummaryGrid>
            <LaunchSnapshotLine>
              <Muted>Primary reward</Muted>
              <LaunchSnapshotValue>
                {tokenLabel(session.plan.fundingRequirements.primary.tokenAddress)}
              </LaunchSnapshotValue>
            </LaunchSnapshotLine>
            {session.plan.fundingRequirements.side.map((side) => (
              <LaunchSnapshotLine key={side.tokenAddress}>
                <Muted>Side reward</Muted>
                <LaunchSnapshotValue>{tokenLabel(side.tokenAddress)}</LaunchSnapshotValue>
              </LaunchSnapshotLine>
            ))}
            <LaunchSnapshotLine>
              <Muted>Primary funding cap</Muted>
              <LaunchSnapshotValue>
                {tokenAmount(
                  session.plan.fundingRequirements.primary.tokenAddress,
                  session.plan.fundingRequirements.primary.maximumScheduledFunding,
                )}{' '}
                {tokenLabel(session.plan.fundingRequirements.primary.tokenAddress)}
              </LaunchSnapshotValue>
            </LaunchSnapshotLine>
            <LaunchSnapshotLine>
              <Muted>Admin wallet</Muted>
              <LaunchSnapshotValue title={session.intendedAdmin}>{short(session.intendedAdmin)}</LaunchSnapshotValue>
            </LaunchSnapshotLine>
            {session.poolAddress ? (
              <LaunchSnapshotLine>
                <Muted>Pool contract</Muted>
                <LaunchSnapshotValue title={session.poolAddress}>{short(session.poolAddress)}</LaunchSnapshotValue>
              </LaunchSnapshotLine>
            ) : null}
          </Panel>

          <Panel>
            <LaunchActionHeader>
              <PanelTitle style={{ marginBottom: 0 }}>Canary recommendation</PanelTitle>
              <LaunchPill $tone={canaryRecommendation.status === 'PASS' ? 'good' : 'warn'}>
                {canaryRecommendation.status === 'PASS' ? 'Simple' : 'Review'}
              </LaunchPill>
            </LaunchActionHeader>
            <Muted>{canaryRecommendation.message}</Muted>
            <Muted style={{ display: 'block', marginTop: 10 }}>
              For a first live canary, use one collection, primary reward only, no fee and a deliberately small budget.
            </Muted>
          </Panel>

          <details>
            <summary>Advanced exact parameters</summary>
            <pre style={{ overflowX: 'auto', fontSize: 11, lineHeight: 1.5 }}>
              {JSON.stringify(session.plan, null, 2)}
            </pre>
          </details>
        </LaunchSideColumn>
      </LaunchWorkspace>

      <p style={{ marginTop: 18 }}>
        <Link href="/admin/nft-pools">Back to NFT pools</Link>
        {' · '}
        <LinkText href="/docs/nft-pool-manager">Read the architecture notes</LinkText>
      </p>
    </AdminShell>
  )
}
