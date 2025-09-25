import { useEffect, useMemo, useRef, useState } from 'react'
import BigNumber from 'bignumber.js'
import { BIG_ZERO } from 'utils/bigNumber'
import formatRewardAmount from 'utils/formatRewardAmount'

export const DEFAULT_ANIMATION_DURATION_MS = 1000

interface Options {
  expandedDecimals?: number
  formatValue?: (value: BigNumber) => string
  durationMs?: number
  disabled?: boolean
  keyDecimals?: number
}

const useAnimatedRewardValue = (value?: BigNumber | null, options: Options = {}) => {
  const {
    expandedDecimals = 8,
    formatValue = formatRewardAmount,
    durationMs = DEFAULT_ANIMATION_DURATION_MS,
    disabled = false,
    keyDecimals = 18,
  } = options

  const safeValue = value && !value.isNaN() ? value : BIG_ZERO
  const valueKey = safeValue.toFixed(keyDecimals)

  const [isAnimating, setIsAnimating] = useState(false)
  const [animatedValue, setAnimatedValue] = useState<BigNumber>(safeValue)

  const previousValueRef = useRef<BigNumber>(safeValue)
  const frameRef = useRef<number | null>(null)
  const animatedValueRef = useRef<BigNumber>(safeValue)

  useEffect(() => {
    animatedValueRef.current = animatedValue
  }, [animatedValue])

  useEffect(() => {
    if (disabled) {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      setIsAnimating(false)
      setAnimatedValue(safeValue)
      previousValueRef.current = safeValue
      return
    }

    const previousValue = previousValueRef.current

    if (!previousValue || safeValue.eq(previousValue)) {
      previousValueRef.current = safeValue
      setAnimatedValue(safeValue)
      setIsAnimating(false)
      return
    }

    setIsAnimating(true)

    const startValue = isAnimating ? animatedValueRef.current : previousValue
    const endValue = safeValue
    const startTime = performance.now()

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
    }

    previousValueRef.current = startValue

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      const currentValue = startValue.plus(endValue.minus(startValue).multipliedBy(progress))
      setAnimatedValue(currentValue)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current)
        }
        frameRef.current = null
        previousValueRef.current = endValue
        setIsAnimating(false)
      }
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [valueKey, disabled, durationMs, isAnimating])

  useEffect(() => () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const baseValue = isAnimating ? animatedValue : safeValue
  const collapsedValue = useMemo(() => formatValue(safeValue), [formatValue, safeValue])
  const expandedValue = useMemo(
    () => baseValue.toFixed(expandedDecimals, BigNumber.ROUND_DOWN),
    [baseValue, expandedDecimals],
  )

  const displayValue = isAnimating ? expandedValue : collapsedValue

  return {
    displayValue,
    collapsedValue,
    expandedValue,
    baseValue,
    isAnimating,
  }
}

export default useAnimatedRewardValue
