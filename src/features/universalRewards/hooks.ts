import { useCallback, useEffect, useRef, useState } from 'react'
import type { Address, Hex, WalletClient } from 'viem'
import { useAccount, useConfig } from 'wagmi'
import { getWalletClient } from 'wagmi/actions'
import { describeV3Error, readV3Receipt, sendV3Call, V3TransactionRejected, type V3Call } from './transactions'
import type { V3Client, V3Deployment } from './runtime'

interface QueryState<T> {
  key: string
  data?: T
  error?: string
  loading: boolean
}

export function useV3Query<T>(key: string, load: () => Promise<T>, pollMs?: number) {
  const [state, setState] = useState<QueryState<T>>({ key, loading: Boolean(key) })
  const [revision, revalidate] = useState(0)
  const refresh = useCallback(() => revalidate((value) => value + 1), [])
  useEffect(() => {
    if (!key) return undefined
    let active = true
    let pending = false
    const read = async () => {
      if (!active || pending || document.visibilityState === 'hidden') return
      pending = true
      setState((previous) => ({ ...(previous.key === key ? previous : {}), key, loading: true }))
      try {
        const data = await load()
        if (active) setState({ key, data, loading: false })
      } catch (error) {
        if (active) {
          setState((previous) => ({ ...previous, key, error: describeV3Error(error), loading: false }))
        }
      } finally {
        pending = false
      }
    }
    void read()
    const timer = pollMs ? window.setInterval(read, pollMs) : undefined
    document.addEventListener('visibilitychange', read)
    return () => {
      active = false
      if (timer !== undefined) window.clearInterval(timer)
      document.removeEventListener('visibilitychange', read)
    }
  }, [key, load, pollMs, revision])

  return { ...(state.key === key ? state : { key, loading: Boolean(key) }), refresh }
}

export function useV3Wallet(chainId?: number) {
  const config = useConfig()
  const { address, connector } = useAccount()
  const connect = useCallback(async () => {
    if (!address || !connector) throw new Error('Connect your wallet before signing.')
    return getWalletClient(config, { account: address, connector, chainId })
  }, [config, address, connector, chainId])
  return address && connector ? connect : undefined
}

export function useV3Action(
  client: V3Client,
  deployment: V3Deployment | undefined,
  getWallet: (() => Promise<WalletClient>) | undefined,
  account: Address | undefined,
) {
  const pendingRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [hash, setHash] = useState<Hex>()
  const [error, setError] = useState<string>()
  const [message, setMessage] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false)
  const verify = async (transaction: Hex) => {
    try {
      const receipt = await readV3Receipt(client, transaction)
      setMessage('Confirmed on the settlement network.')
      setError(undefined)
      setUnconfirmed(false)
      return receipt
    } catch (failure) {
      if (failure instanceof V3TransactionRejected) {
        setUnconfirmed(false)
        setMessage('')
        setError(failure.message)
      } else {
        setUnconfirmed(true)
        setMessage('The transaction was sent. Check its confirmation before trying again.')
      }
      return undefined
    }
  }
  const run = async (call: V3Call) => {
    if (!deployment || !getWallet || !account || pendingRef.current || unconfirmed) return undefined
    pendingRef.current = true
    setBusy(true)
    setHash(undefined)
    setError(undefined)
    setMessage('Checking the transaction…')
    try {
      const wallet = await getWallet()
      const transaction = await sendV3Call(client, deployment, wallet, account, call)
      setHash(transaction)
      setMessage('Waiting for confirmation…')
      return await verify(transaction)
    } catch (failure) {
      setMessage('')
      setError(describeV3Error(failure))
      return undefined
    } finally {
      pendingRef.current = false
      setBusy(false)
    }
  }

  const recheck = async () => {
    if (!hash || pendingRef.current || !unconfirmed) return undefined
    pendingRef.current = true
    setBusy(true)
    try {
      return await verify(hash)
    } finally {
      pendingRef.current = false
      setBusy(false)
    }
  }
  return { run, recheck, busy, unconfirmed, hash, error, message }
}
