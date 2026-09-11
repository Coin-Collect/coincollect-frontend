import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { BigNumber } from '@ethersproject/bignumber'
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
import { loadNftPoolLaunchSession } from '../launch/storage'
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
  validateLaunchSessionInvariant,
  updateNftLaunchSession,
} from '../launch/orchestrator'
import type { LaunchEligibility } from '../launch/orchestrator'
import { NftLaunchPoolSnapshot, NftPoolLaunchSession, LaunchCheck, LaunchStage } from '../launch/types'
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
  }, [library, session?.sessionId, session?.updatedAt, account])

  useEffect(() => {
    const deployHash = session?.transactionHashes.deploy
    if (
      !session ||
      !library ||
      !deployHash ||
      reconciledDeployRef.current === `${session.sessionId}:${deployHash}` ||
      (session.poolAddress && session.verification.deployment?.fingerprint && session.poolFingerprint)
    )
      return
    let active = true
    library
      .getTransactionReceipt(deployHash)
      .then(async (receipt: any) => {
        if (!active || !receipt) return
        reconciledDeployRef.current = `${session.sessionId}:${deployHash}`
        if (receipt.status !== 1) {
          setSession(
            updateNftLaunchSession(session, {
              currentStage: 'FAILED',
              retryable: false,
              error: 'Deployment transaction failed on Polygon. Review the receipt before starting a new session.',
            }),
          )
          return
        }
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
            currentStage: session.poolAddress ? session.currentStage : 'DEPLOY_CONFIRMED',
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
            currentStage: session.poolAddress
              ? session.currentStage
              : verified.passed
              ? 'DEPLOY_VERIFIED'
              : 'DEPLOY_CONFIRMED',
            error: verified.passed
              ? undefined
              : 'Pool deployed — setup incomplete. Deployment verification did not pass.',
          })
          setSession(
            verified.passed && !session.poolAddress
              ? updateNftLaunchSession(verifiedSession, {
                  currentStage: nextNftLaunchStageAfterDeploy(verifiedSession),
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
        const sideSnapshot = await readFreshSnapshot(sessionRef.current || current)
        const sideGate = canFund(sessionRef.current || current, sideSnapshot)
        if (!sideGate.allowed) throw gateError(sideGate)
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
    try {
      if (currentSession.transactionHashes.deploy) {
        const receipt = await library.getTransactionReceipt(currentSession.transactionHashes.deploy)
        if (!receipt) {
          setMessage('Deployment transaction is still pending. No duplicate deployment will be sent.')
          return
        }
        if (receipt.status !== 1) {
          update({
            currentStage: 'FAILED',
            retryable: false,
            error: 'Deployment transaction failed on Polygon. Review the receipt before starting a new session.',
          })
          return
        }
        let poolAddress: string
        try {
          poolAddress = parseNftPoolAddress(receipt, currentSession.factoryAddress)
        } catch (reason) {
          update({
            currentStage: 'CORRUPTED',
            retryable: false,
            error: mapNftLaunchError(reason),
          })
          return
        }
        if (currentSession.poolAddress && currentSession.poolAddress.toLowerCase() !== poolAddress.toLowerCase()) {
          update({
            currentStage: 'CORRUPTED',
            retryable: false,
            error: 'Stored pool address differs from the deployment receipt. No transactions are allowed.',
          })
          return
        }
        const withDeployment =
          update({ poolAddress, currentStage: 'DEPLOY_CONFIRMED', error: undefined }) || currentSession
        const verified = await verifyDeployedNftPool(
          simplePolygonRpcProvider,
          withDeployment.plan,
          withDeployment.schedule!,
          poolAddress,
        )
        const verifiedSession = update({
          verification: { ...withDeployment.verification, deployment: verified },
          poolFingerprint: verified.fingerprint,
          currentStage: verified.passed ? 'DEPLOY_VERIFIED' : 'DEPLOY_CONFIRMED',
          error: verified.passed ? undefined : 'Pool deployed — setup incomplete.',
        })
        if (verified.passed && verifiedSession) update({ currentStage: nextNftLaunchStageAfterDeploy(verifiedSession) })
        return
      }
      const refreshed = sessionRef.current || currentSession
      if (refreshed.transactionHashes.scheduleUpdate && refreshed.pendingSchedule && refreshed.poolAddress) {
        const receipt = await library.getTransactionReceipt(refreshed.transactionHashes.scheduleUpdate)
        if (!receipt) {
          setMessage('Schedule update transaction is still pending. The canonical schedule remains unchanged.')
          return
        }
        if (receipt.status !== 1) {
          update({
            pendingSchedule: undefined,
            error: 'Schedule update transaction failed; the canonical schedule remains unchanged.',
          })
          return
        }
        const confirmed = await readFreshSnapshot(refreshed)
        if (
          confirmed.startBlock !== refreshed.pendingSchedule.startBlock ||
          confirmed.endBlock !== refreshed.pendingSchedule.endBlock
        ) {
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
          refreshed.pendingSchedule,
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
          schedule: refreshed.pendingSchedule,
          pendingSchedule: undefined,
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
      if (
        refreshed.currentStage === 'WEIGHTS_SUBMITTED' &&
        refreshed.transactionHashes.weights &&
        refreshed.poolAddress
      ) {
        const receipt = await library.getTransactionReceipt(refreshed.transactionHashes.weights)
        if (!receipt) {
          setMessage('NFT power transaction is still pending.')
          return
        }
        if (receipt.status !== 1) {
          update({
            currentStage: 'WEIGHTS_REQUIRED',
            error: 'NFT power transaction failed; review the receipt before retrying.',
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
          currentStage: verified.passed ? 'WEIGHTS_VERIFIED' : 'WEIGHTS_REQUIRED',
          error: verified.passed ? undefined : 'NFT power verification failed.',
        })
        if (verified.passed && verifiedSession)
          update({ currentStage: nextNftLaunchStageAfterWeights(verifiedSession) })
        return
      }
      if (refreshed.currentStage === 'FEE_SUBMITTED' && refreshed.transactionHashes.fee && refreshed.poolAddress) {
        const receipt = await library.getTransactionReceipt(refreshed.transactionHashes.fee)
        if (!receipt) {
          setMessage('Fee configuration transaction is still pending.')
          return
        }
        if (receipt.status !== 1) {
          update({
            currentStage: 'FEE_CONFIG_REQUIRED',
            error: 'Fee configuration transaction failed; review the receipt before retrying.',
          })
          return
        }
        const verified = await verifyNftPerformanceFee(simplePolygonRpcProvider, refreshed.plan, refreshed.poolAddress)
        const verifiedSession = update({
          verification: { ...refreshed.verification, fee: verified },
          currentStage: verified.passed ? 'FEE_VERIFIED' : 'FEE_CONFIG_REQUIRED',
          error: verified.passed ? undefined : 'Fee configuration verification failed.',
        })
        if (verified.passed && verifiedSession) update({ currentStage: 'FUNDING_REQUIRED' })
        return
      }
      if (refreshed.currentStage === 'FUNDING_IN_PROGRESS') {
        setBusy(false)
        await fund()
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
      const nextSchedule = moveNftLaunchScheduleLater(currentSession.schedule, current.currentBlock)
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

  return (
    <AdminShell
      title="Launch NFT pool"
      subtitle="Preflight, deploy, verify, configure, fund, verify — one explicit step at a time."
      authorityScope="nft"
    >
      {message ? <Notice>{message}</Notice> : null}
      {error || session.error ? <Notice $error>{error || session.error}</Notice> : null}
      {invariantErrors.length && session.currentStage !== 'CORRUPTED' ? (
        <Notice $error>Launch session safety invariant failed: {invariantErrors[0]}</Notice>
      ) : null}
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
          {session.currentStage === 'PREFLIGHT_READY' ? (
            <ActionButton onClick={() => setConfirmDeploy(true)} disabled={busy || !canLaunch}>
              Launch pool
            </ActionButton>
          ) : null}
          {session.poolAddress && needsWeights && session.currentStage === 'WEIGHTS_REQUIRED' ? (
            <ActionButton onClick={configureWeights} disabled={busy || !weightsEligibility.allowed}>
              Configure NFT powers
            </ActionButton>
          ) : null}
          {session.poolAddress && needsFee && session.currentStage === 'FEE_CONFIG_REQUIRED' ? (
            <ActionButton onClick={configureFee} disabled={busy || !feeEligibility.allowed}>
              Configure fee
            </ActionButton>
          ) : null}
          {session.poolAddress && ['FUNDING_REQUIRED', 'FUNDING_IN_PROGRESS'].includes(session.currentStage) ? (
            <ActionButton onClick={fund} disabled={busy || !fundingEligibility.allowed}>
              Fund rewards
            </ActionButton>
          ) : null}
          {session.poolAddress && session.currentStage !== 'COMPLETE' ? (
            <ActionButton $secondary onClick={finalVerify} disabled={busy || !finalEligibility.allowed}>
              Final verification
            </ActionButton>
          ) : null}
          {session.poolAddress && session.currentStage !== 'COMPLETE' ? (
            <ActionButton $secondary onClick={moveStartLater} disabled={busy || !moveScheduleEligibility.allowed}>
              Move start later
            </ActionButton>
          ) : null}
          {canRetryLaunch(session) && session.currentStage !== 'PREFLIGHT_READY' && session.currentStage !== 'DRAFT' ? (
            <ActionButton $secondary onClick={resume} disabled={busy}>
              Resume
            </ActionButton>
          ) : null}
        </ButtonRow>
        {activeGateReason ? (
          <Muted style={{ display: 'block', marginTop: 10 }}>Safety gate: {activeGateReason}</Muted>
        ) : null}
      </Panel>
      {session.currentStage === 'COMPLETE' && chainSnapshot && !finalEligibility.allowed ? (
        <Notice $error style={{ marginTop: 16 }}>
          Completed session no longer matches expected on-chain state.
        </Notice>
      ) : null}
      <Panel style={{ marginTop: 16 }}>
        <PanelTitle>Canary readiness</PanelTitle>
        <Muted>{getNftCanaryRecommendation(session.plan).message}</Muted>
        <Muted style={{ display: 'block', marginTop: 8 }}>
          First canary: one collection, primary reward only, no fee, a deliberately tiny reward and a short test
          duration.
        </Muted>
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
              <Muted>Deployment gas estimate</Muted>
              <div>{session.preflight.deploymentGas ? `${session.preflight.deploymentGas.safetyCost} wei` : '—'}</div>
            </div>
            <div>
              <Muted>Preflight validity</Muted>
              <div>
                block {session.preflight.currentBlockAtPreflight.toLocaleString()} · expires at{' '}
                {session.preflight.expiresAtBlock.toLocaleString()}
              </div>
            </div>
          </FormGrid>
          <div style={{ marginTop: 16 }}>
            <CheckTable checks={session.preflight.checks} />
          </div>
          <Muted style={{ display: 'block', marginTop: 14 }}>
            Deployment gas estimated. Setup and funding gas will be freshly simulated and checked immediately before
            each wallet confirmation.
          </Muted>
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
