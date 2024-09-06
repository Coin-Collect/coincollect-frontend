import { Dispatch } from '@reduxjs/toolkit'
import { clearAllTransactions } from '../state/transactions/actions'
import { getCurrentScope } from '@sentry/nextjs'

export const clearUserStates = (dispatch: Dispatch<any>, { chainId } : { chainId?: number }) => {
  
  if (chainId) {
    dispatch(clearAllTransactions({ chainId }))
  }
  getCurrentScope().setUser(null)
  
}
