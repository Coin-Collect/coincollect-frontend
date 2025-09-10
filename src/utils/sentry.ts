import * as Sentry from '@sentry/react'

const assignError = (maybeError: any) => {
  if (typeof maybeError === 'string') {
    return new Error(maybeError)
  }
  if (typeof maybeError === 'object') {
    const error = new Error(maybeError?.message ?? String(maybeError))
    if (maybeError?.stack) {
      error.stack = maybeError.stack
    }
    if (maybeError?.code) {
      error.name = maybeError.code
    }
    return error
  }
  return maybeError
}

export const isUserRejected = (err) => {
  // Detect common user-rejection patterns across wallets/providers
  if (typeof err !== 'object' || !err) return false
  const code = (err as any).code
  const msg = String((err as any).message || '').toLowerCase()
  return (
    code === 4001 || // EIP-1193 userRejectedRequest
    code === 'ACTION_REJECTED' || // Ethers v5
    msg.includes('user rejected') ||
    msg.includes('user denied') ||
    msg.includes('rejected by user')
  )
}

const ENABLED_LOG = false

export const logError = (error: Error | unknown) => {
  if (ENABLED_LOG) {
    if (error instanceof Error) {
      Sentry.captureException(error)
    } else {
      Sentry.captureException(assignError(error), error)
    }
  }
  console.error(error)
}
