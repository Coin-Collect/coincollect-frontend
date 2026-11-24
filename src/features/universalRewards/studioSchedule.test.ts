import { v3BuildSchedule, v3StartPreset } from './studio'

const clock = BigInt(1_795_519_000)
const duration = BigInt(86_400)
const current = { timestamp: clock, supportsStartNow: true }
const legacy = { ...current, supportsStartNow: false }
const blank = { startLocal: '' }

test('instant start is the default only on ledgers that decode the sentinel', () => {
  expect(v3StartPreset(blank, true)).toBe('now')
  expect(v3BuildSchedule(blank, current, duration)).toEqual({ start: BigInt(0), end: duration })
  expect(v3StartPreset(blank, false)).toBe('15m')
  expect(() => v3BuildSchedule({ ...blank, startPreset: 'now' }, legacy, duration)).toThrow('scheduled start')
})

test.each([
  ['15m', 900],
  ['1h', 3600],
  ['24h', 86400],
] as const)(
  'relative preset %s starts after the later of the wall clock and settlement clock',
  (startPreset, delay) => {
    for (const offset of [-5, 5]) {
      const start = clock + BigInt(Math.max(offset, 0) + delay)
      expect(v3BuildSchedule({ ...blank, startPreset }, current, duration, (Number(clock) + offset) * 1000)).toEqual({
        start,
        end: start + duration,
      })
    }
  },
)

test('explicit dates keep their original meaning and reject starts too close to the settlement clock', () => {
  const start = clock + BigInt(120)
  const date = { startLocal: new Date(Number(start) * 1000).toISOString() }
  expect(v3StartPreset(date, true)).toBe('custom')
  expect(v3BuildSchedule(date, current, duration)).toEqual({ start, end: start + duration })
  expect(() => v3BuildSchedule(date, { ...current, timestamp: start }, duration)).toThrow('at least one minute')
})
