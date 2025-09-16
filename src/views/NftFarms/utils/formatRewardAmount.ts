import BigNumber from 'bignumber.js'

const SUPERSCRIPTS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹']

const toSuperscript = (value: number) =>
  value
    .toString()
    .split('')
    .map((digit) => SUPERSCRIPTS[Number(digit)] ?? digit)
    .join('')

export const formatRewardAmount = (amount?: BigNumber | null, decimalsToShow = 3) => {
  if (!amount || amount.isNaN()) {
    return `0.${'0'.repeat(decimalsToShow)}`
  }

  if (amount.isZero()) {
    return `0.${'0'.repeat(decimalsToShow)}`
  }

  if (amount.gte(1)) {
    return amount.toFixed(decimalsToShow, BigNumber.ROUND_DOWN)
  }

  const fixedValue = amount.toFixed(decimalsToShow + 20, BigNumber.ROUND_DOWN)
  const [integerPart, decimalPart = ''] = fixedValue.split('.')

  if (!decimalPart) {
    return `${integerPart}.${'0'.repeat(decimalsToShow)}`
  }

  const firstNonZeroIndex = decimalPart.split('').findIndex((digit) => digit !== '0')

  if (firstNonZeroIndex <= 1 && firstNonZeroIndex !== -1) {
    const trimmedDecimals = decimalPart.slice(0, decimalsToShow).padEnd(decimalsToShow, '0')
    return `${integerPart}.${trimmedDecimals}`
  }

  if (firstNonZeroIndex === -1) {
    return `${integerPart}.${'0'.repeat(decimalsToShow)}`
  }

  const zeroCount = firstNonZeroIndex
  const remainingDecimals = decimalPart.slice(firstNonZeroIndex, firstNonZeroIndex + decimalsToShow).padEnd(decimalsToShow, '0')
  const superscriptZeros = toSuperscript(zeroCount)

  return `${integerPart}.0${superscriptZeros}${remainingDecimals}`
}

export default formatRewardAmount
