import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ThemeProvider } from 'styled-components'
import type { PublicV2Pool } from 'features/nftPoolManager/publication'
import {
  estimateScheduleCountdown,
  formatEstimatedCountdown,
  getOrCreateScheduleDeadline,
  ScheduleCountdown,
} from './ScheduleCountdown'

const pool = {
  chainId: 137,
  address: '0x0000000000000000000000000000000000000001',
  snapshot: {
    checkedAt: 1_000_000,
    currentBlock: 100,
    status: 'UPCOMING',
    startBlock: 1300,
    endBlock: 4000,
    secondsPerBlock: 2,
  },
} as PublicV2Pool

describe('published pool schedule countdown', () => {
  it('estimates a live start countdown from the verified block snapshot', () => {
    expect(estimateScheduleCountdown(pool, 1_000_000)).toEqual({
      label: 'Starts in',
      phase: 'countdown',
      secondsRemaining: 2400,
      blocksRemaining: 1200,
    })
    expect(estimateScheduleCountdown(pool, 1_001_000).secondsRemaining).toBe(2399)
  })

  it('uses the end block after chain status becomes active', () => {
    const active = {
      ...pool,
      snapshot: { ...pool.snapshot, status: 'ACTIVE', currentBlock: 1000 },
    } as PublicV2Pool

    expect(estimateScheduleCountdown(active, 1_000_000)).toEqual({
      label: 'Ends in',
      phase: 'countdown',
      secondsRemaining: 6000,
      blocksRemaining: 3000,
    })
  })

  it('waits for on-chain status instead of claiming the pool started when the estimate expires', () => {
    const estimate = estimateScheduleCountdown(pool, 3_401_000)
    expect(estimate.label).toBe('Starts in')
    expect(estimate.phase).toBe('awaiting-block')
  })

  it('keeps the same estimate after a page reload and a fresh chain snapshot', () => {
    const values: Record<string, string> = {}
    const storage = {
      getItem: (key: string) => values[key] ?? null,
      setItem: (key: string, value: string) => {
        values[key] = value
      },
    }
    const firstDeadline = getOrCreateScheduleDeadline(pool, 1_000_000, storage)
    const reloadedPool = {
      ...pool,
      snapshot: { ...pool.snapshot, checkedAt: 1_500_000, currentBlock: 150 },
    } as PublicV2Pool

    expect(firstDeadline).toBe(3_400_000)
    expect(getOrCreateScheduleDeadline(reloadedPool, 1_500_000, storage)).toBe(firstDeadline)
    expect(estimateScheduleCountdown(reloadedPool, 2_000_000, firstDeadline)).toMatchObject({
      phase: 'countdown',
      secondsRemaining: 1400,
      blocksRemaining: 700,
    })
  })

  it('creates a separate estimate when the chain schedule changes', () => {
    const values: Record<string, string> = {}
    const storage = {
      getItem: (key: string) => values[key] ?? null,
      setItem: (key: string, value: string) => {
        values[key] = value
      },
    }
    const firstDeadline = getOrCreateScheduleDeadline(pool, 1_000_000, storage)
    const movedPool = {
      ...pool,
      snapshot: { ...pool.snapshot, startBlock: 1400 },
    } as PublicV2Pool

    expect(getOrCreateScheduleDeadline(movedPool, 1_000_000, storage)).toBe(3_600_000)
    expect(getOrCreateScheduleDeadline(pool, 1_000_000, storage)).toBe(firstDeadline)
  })

  it('shows terminal and unknown schedules without a ticking estimate', () => {
    expect(
      estimateScheduleCountdown({ ...pool, snapshot: { ...pool.snapshot, status: 'FINISHED' } } as PublicV2Pool, 0),
    ).toMatchObject({ label: 'Ends in', phase: 'finished' })
    expect(
      estimateScheduleCountdown({ ...pool, snapshot: { ...pool.snapshot, status: 'UNKNOWN' } } as PublicV2Pool, 0),
    ).toMatchObject({ label: 'Schedule', phase: 'unavailable' })
  })

  it('formats compact durations for a small card detail row', () => {
    expect(formatEstimatedCountdown(898)).toBe('14m 58s')
    expect(formatEstimatedCountdown(90061)).toBe('1d 1h')
    expect(formatEstimatedCountdown(42)).toBe('42s')
  })

  it('renders a compact, accessible countdown pill with an estimated block pace', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ThemeProvider,
        {
          theme: {
            colors: {
              input: '#25232b',
              inputSecondary: '#413b49',
              text: '#f5f2fb',
              textSubtle: '#b9accd',
              primary: '#ed1b5b',
            },
          } as any,
        },
        React.createElement(ScheduleCountdown, { pool }),
      ),
    )

    expect(html).toContain('≈ 40m 0s')
    expect(html).toContain('~1,200 blocks · estimate')
    expect(html).toContain('aria-live="off"')
  })
})
