import { useEffect, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import type { PublicV2Pool } from 'features/nftPoolManager/publication'
import { getLocalForkStorageKey, isLocalForkMode } from 'config/localFork'

const FALLBACK_SECONDS_PER_BLOCK = 2.2
const COUNTDOWN_STORAGE_KEY = getLocalForkStorageKey('coincollect.nft-pool-countdown-estimates.v1')

export interface CountdownStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface StoredCountdownEstimate {
  targetBlock: number
  deadlineMs: number
}

export type ScheduleCountdownPhase = 'countdown' | 'awaiting-block' | 'finished' | 'unavailable'

export interface ScheduleCountdownEstimate {
  label: 'Starts in' | 'Ends in' | 'Schedule'
  phase: ScheduleCountdownPhase
  secondsRemaining?: number
  blocksRemaining?: number
}

function getSchedule(pool: PublicV2Pool) {
  const { snapshot } = pool
  if (snapshot.status === 'FINISHED') return { label: 'Ends in' as const, phase: 'finished' as const }
  if (snapshot.status !== 'UPCOMING' && snapshot.status !== 'ACTIVE')
    return { label: 'Schedule' as const, phase: 'unavailable' as const }

  const isUpcoming = snapshot.status === 'UPCOMING'
  const secondsPerBlock =
    Number.isFinite(snapshot.secondsPerBlock) && (snapshot.secondsPerBlock || 0) > 0
      ? snapshot.secondsPerBlock!
      : FALLBACK_SECONDS_PER_BLOCK
  return {
    label: isUpcoming ? ('Starts in' as const) : ('Ends in' as const),
    phase: isUpcoming ? ('start' as const) : ('end' as const),
    targetBlock: isUpcoming ? snapshot.startBlock : snapshot.endBlock,
    secondsPerBlock,
  }
}

/** Keep the estimate stable across page reloads; chain state remains authoritative. */
export function getOrCreateScheduleDeadline(
  pool: PublicV2Pool,
  nowMs: number,
  storage?: CountdownStorage,
): number | undefined {
  const schedule = getSchedule(pool)
  if (schedule.phase !== 'start' && schedule.phase !== 'end') return undefined

  const { targetBlock, secondsPerBlock, phase } = schedule
  const key = `${pool.chainId}:${pool.address.toLowerCase()}:${phase}:${targetBlock}`
  const blocksAtRead = Math.max(0, targetBlock - pool.snapshot.currentBlock)
  const createDeadline = () => nowMs + blocksAtRead * secondsPerBlock * 1000

  let browserStorage: CountdownStorage | undefined
  try {
    browserStorage = storage || (typeof window !== 'undefined' ? window.localStorage : undefined)
  } catch {
    return createDeadline()
  }

  if (!browserStorage) return createDeadline()

  try {
    const parsed = JSON.parse(browserStorage.getItem(COUNTDOWN_STORAGE_KEY) || '{}') as Record<
      string,
      StoredCountdownEstimate
    >
    const existing = parsed[key]
    if (
      existing &&
      existing.targetBlock === targetBlock &&
      Number.isFinite(existing.deadlineMs) &&
      existing.deadlineMs > 0
    ) {
      return existing.deadlineMs
    }

    const deadlineMs = createDeadline()
    parsed[key] = { targetBlock, deadlineMs }
    browserStorage.setItem(COUNTDOWN_STORAGE_KEY, JSON.stringify(parsed))
    return deadlineMs
  } catch {
    // Storage can be unavailable in private browsing or when the quota is full.
    return createDeadline()
  }
}

export function estimateScheduleCountdown(
  pool: PublicV2Pool,
  nowMs: number,
  persistedDeadlineMs?: number,
): ScheduleCountdownEstimate {
  const schedule = getSchedule(pool)
  if (schedule.phase === 'finished' || schedule.phase === 'unavailable')
    return { label: schedule.label, phase: schedule.phase }

  const { targetBlock, secondsPerBlock } = schedule
  const blocksAtRead = Math.max(0, targetBlock - pool.snapshot.currentBlock)
  const elapsedSeconds = Math.max(0, nowMs - pool.snapshot.checkedAt) / 1000
  const secondsRemaining = Math.max(
    0,
    persistedDeadlineMs === undefined
      ? blocksAtRead * secondsPerBlock - elapsedSeconds
      : (persistedDeadlineMs - nowMs) / 1000,
  )

  if (secondsRemaining <= 0) return { label: schedule.label, phase: 'awaiting-block', secondsRemaining: 0 }

  return {
    label: schedule.label,
    phase: 'countdown',
    secondsRemaining: Math.ceil(secondsRemaining),
    blocksRemaining: Math.ceil(secondsRemaining / secondsPerBlock),
  }
}

export function formatEstimatedCountdown(seconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(seconds))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60

  if (days) return `${days}d ${hours}h`
  if (hours) return `${hours}h ${minutes}m`
  if (minutes) return `${minutes}m ${remainingSeconds}s`
  return `${remainingSeconds}s`
}

const livePulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.48; transform: scale(0.78); }
`

const CountdownPill = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  padding: 5px 9px;
  border: 1px solid ${({ theme }) => theme.colors.inputSecondary};
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.input};
  color: ${({ theme }) => theme.colors.text};
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  white-space: nowrap;
`

const CountdownMain = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 700;
`

const CountdownMeta = styled.span`
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 10px;
  font-weight: 500;
`

const PulseDot = styled.span`
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  box-shadow: 0 0 0 3px ${({ theme }) => `${theme.colors.primary}22`};
  animation: ${livePulse} 1.8s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export function ScheduleCountdown({ pool }: { pool: PublicV2Pool }) {
  const { snapshot } = pool
  const shouldTick = snapshot.status === 'UPCOMING' || snapshot.status === 'ACTIVE'
  const [now, setNow] = useState(snapshot.checkedAt)
  const [deadlineMs, setDeadlineMs] = useState<number>()

  useEffect(() => {
    if (!shouldTick) {
      setDeadlineMs(undefined)
      return
    }

    const timestamp = Date.now()
    setNow(timestamp)
    setDeadlineMs(getOrCreateScheduleDeadline(pool, timestamp))
  }, [
    pool.address,
    pool.chainId,
    shouldTick,
    snapshot.currentBlock,
    snapshot.endBlock,
    snapshot.startBlock,
    snapshot.status,
  ])

  useEffect(() => {
    if (!shouldTick) return undefined

    const tick = () => setNow(Date.now())
    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [shouldTick, snapshot.checkedAt])

  const estimate = estimateScheduleCountdown(pool, now, deadlineMs)
  const mainText =
    estimate.phase === 'countdown'
      ? `≈ ${formatEstimatedCountdown(estimate.secondsRemaining || 0)}`
      : estimate.phase === 'awaiting-block'
      ? 'Awaiting block'
      : estimate.phase === 'finished'
      ? 'Finished'
      : 'Unavailable'
  const metaText =
    estimate.phase === 'countdown'
      ? isLocalForkMode
        ? `${Math.max(
            0,
            (snapshot.status === 'UPCOMING' ? snapshot.startBlock : snapshot.endBlock) - snapshot.currentBlock,
          ).toLocaleString('en-US')} blocks · local fork paused`
        : `~${estimate.blocksRemaining?.toLocaleString('en-US')} blocks · estimate`
      : estimate.phase === 'awaiting-block'
      ? isLocalForkMode
        ? snapshot.status === 'UPCOMING'
          ? 'Mine the fork to activate'
          : 'Mine the fork to finish'
        : 'Waiting for next block'
      : undefined

  return (
    <CountdownPill
      aria-live="off"
      aria-label={`${estimate.label}: ${mainText}${metaText ? `, ${metaText}` : ''}`}
      data-testid="published-pool-schedule-countdown"
    >
      <CountdownMain>
        {shouldTick && <PulseDot aria-hidden="true" />}
        {mainText}
      </CountdownMain>
      {metaText && <CountdownMeta>{metaText}</CountdownMeta>}
    </CountdownPill>
  )
}
