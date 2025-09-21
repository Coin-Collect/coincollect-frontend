import { useCallback, useState } from 'react'
import { useTranslation } from 'contexts/Localization'
import useWeb3React from 'hooks/useWeb3React'
import { TransactionReceipt, TransactionResponse } from '@ethersproject/providers'
import { ToastDescriptionWithTx } from 'components/Toast'

import useToast from 'hooks/useToast'
import { logError, isUserRejected } from 'utils/sentry'

export type TxResponse = TransactionResponse | null

export type CatchTxErrorReturn = {
  fetchWithCatchTxError: (fn: () => Promise<TxResponse>) => Promise<TransactionReceipt | null>
  loading: boolean
}

type ErrorData = {
  code?: number
  message?: string
  originalError?: any
}

type TxError = Error & {
  code?: number | string
  data?: ErrorData
  error?: any
  reason?: string
  shortMessage?: string
}

const getErrorMessage = (error?: TxError | string, depth = 0): string => {
  if (!error || depth > 5) {
    return ''
  }

  if (typeof error === 'string') {
    return error
  }

  const potentialMessages = [
    error?.data?.message,
    error?.data?.originalError?.message,
    error?.error?.message,
    error?.shortMessage,
    error?.reason,
    error?.message,
  ]

  for (const potentialMessage of potentialMessages) {
    if (typeof potentialMessage === 'string' && potentialMessage.trim().length > 0) {
      return potentialMessage
    }
  }

  if (error?.error) {
    const nestedMessage = getErrorMessage(error.error, depth + 1)

    if (nestedMessage) {
      return nestedMessage
    }
  }

  if (error?.data?.originalError) {
    const nestedMessage = getErrorMessage(error.data.originalError, depth + 1)

    if (nestedMessage) {
      return nestedMessage
    }
  }

  return ''
}

const messageIncludes = (err: TxError | undefined, search: string): boolean => {
  if (!err) {
    return false
  }

  const message = getErrorMessage(err)

  return message.toLowerCase().includes(search.toLowerCase())
}

// -32000 is insufficient funds for gas * price + value
const isGasEstimationError = (err: TxError): boolean => err?.data?.code === -32000
const isBalanceError = (err: TxError): boolean =>
  messageIncludes(err, 'insufficient funds') || messageIncludes(err, 'gas required exceeds allowance')
const isLowGasPriceError = (err: TxError): boolean => messageIncludes(err, 'max fee per gas')

const sanitizeErrorMessage = (message: string): string => {
  if (!message) {
    return ''
  }

  let sanitizedMessage = message

  const seeMoreIndex = sanitizedMessage.indexOf(' [ See:')

  if (seeMoreIndex >= 0) {
    sanitizedMessage = sanitizedMessage.substring(0, seeMoreIndex)
  }

  const errorIndex = sanitizedMessage.indexOf(' (error=')

  if (errorIndex >= 0) {
    sanitizedMessage = sanitizedMessage.substring(0, errorIndex)
  }

  return sanitizedMessage.trim()
}

export default function useCatchTxError(): CatchTxErrorReturn {
  const { library } = useWeb3React()
  const { t } = useTranslation()
  const { toastError, toastSuccess, toastInfo } = useToast()
  const [loading, setLoading] = useState(false)

  const handleNormalError = useCallback(
    (error?: TxError) => {
      logError(error)

      if (!error) {
        toastError(t('Error'), t('Please try again. Confirm the transaction and make sure you are paying enough gas!'))
        return
      }

      const errorCode = typeof error?.code === 'string' ? error.code.toUpperCase() : ''

      if (isBalanceError(error) || errorCode === 'INSUFFICIENT_FUNDS') {
        toastError(
          t('Not enough POL'),
          t('Your wallet does not have enough POL to cover the mint cost and gas fees. Please add more POL and try again.'),
        )
        return
      }

      if (isLowGasPriceError(error)) {
        toastError(
          t('Error'),
          t('The network may be congested. Try increasing the transaction speed from settings or try again later.'),
        )
        return
      }

      const fallbackMessage = sanitizeErrorMessage(getErrorMessage(error))

      if (fallbackMessage) {
        toastError(t('Error'), fallbackMessage)
      } else {
        toastError(t('Error'), t('Please try again. Confirm the transaction and make sure you are paying enough gas!'))
      }
    },
    [t, toastError],
  )

  const handleTxError = useCallback(
    (error, tx?: TxResponse) => {
      logError(error)

      if (tx) {
        toastError(
          t('Error'),
          <ToastDescriptionWithTx txHash={tx.hash}>
            {t('Please try again. Confirm the transaction and make sure you are paying enough gas!')}
          </ToastDescriptionWithTx>
        )
      } else {
        handleNormalError(error)
      }
    },
    [t, toastError, handleNormalError],
  )

  const fetchWithCatchTxError = useCallback(
    async (callTx: () => Promise<TxResponse>): Promise<TransactionReceipt | null> => {
      let tx: TxResponse = null

      try {
        setLoading(true)

        /**
         * https://github.com/vercel/swr/pull/1450
         *
         * wait for useSWRMutation finished, so we could apply SWR in case manually trigger tx call
         */
        tx = await callTx()

        if (tx) {
          toastSuccess(`${t('Transaction Submitted')}!`, <ToastDescriptionWithTx txHash={tx.hash} />)
        }

        const receipt = await tx?.wait()

        return receipt ?? null
      } catch (error: any) {
        if (isUserRejected(error)) {
          // Friendly notification on user cancellation
          toastInfo(t('Transaction cancelled'), t('You rejected the request in your wallet.'))
        } else if (!tx || !library) {
          handleNormalError(error)
        } else {
          const { to, data, value } = tx
          library
            .call({ to, data, value }, tx.blockNumber)
            .then(() => {
              if (tx) {
                toastSuccess(`${t('Transaction Submitted')}!`, <ToastDescriptionWithTx txHash={tx.hash} />)
              }
            })
            .catch((err: any) => {
              if (isGasEstimationError(err)) {
                handleTxError(error, tx)
              } else {
                logError(err)

                let recursiveErr = err

                let reason: string | undefined

                // for MetaMask
                if (recursiveErr?.data?.message) {
                  reason = recursiveErr?.data?.message
                } else {
                  // for other wallets
                  // Reference
                  // https://github.com/Uniswap/interface/blob/ac962fb00d457bc2c4f59432d7d6d7741443dfea/src/hooks/useSwapCallback.tsx#L216-L222
                  while (recursiveErr) {
                    reason = recursiveErr.reason ?? recursiveErr.message ?? reason
                    recursiveErr = recursiveErr.error ?? recursiveErr.data?.originalError
                  }
                }

                const REVERT_STR = 'execution reverted: '
                const indexInfo = reason?.indexOf(REVERT_STR)
                const isRevertedError = indexInfo && indexInfo >= 0

                if (isRevertedError && reason) reason = reason.substring(indexInfo + REVERT_STR.length)

                toastError(
                  'Failed',
                  <ToastDescriptionWithTx txHash={tx?.hash}>
                    {isRevertedError && reason
                      ? `Transaction failed with error: ${reason}`
                      : 'Transaction failed. For detailed error message:'}
                  </ToastDescriptionWithTx>,
                )
              }
            })
        }
      } finally {
        setLoading(false)
      }

      return null
    },
    [handleNormalError, handleTxError, toastError, library, toastSuccess, t],
  )

  return {
    fetchWithCatchTxError,
    loading,
  }
}
