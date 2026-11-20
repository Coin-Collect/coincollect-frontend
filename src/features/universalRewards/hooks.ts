import { useCallback, useEffect, useRef, useState } from 'react'
import type { Address, Hex, WalletClient } from 'viem'
import { useAccount, useConfig } from 'wagmi'
import { getWalletClient } from 'wagmi/actions'
import { describeV3Error, readV3Receipt, sendV3Call, V3TransactionRejected, type V3Call } from './transactions'
import type { V3Client, V3Deployment } from './runtime'
import { loadV3PresentationDocument } from './poolPresentation'

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

export function useV3PresentationDocument(deployment?: V3Deployment) {
  const load = useCallback(
    () => (deployment ? loadV3PresentationDocument(deployment) : Promise.resolve(undefined)),
    [deployment],
  )
  return useV3Query(deployment?.address ?? '', load, 30_000).data
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

type V3ActionStep = V3Call & { onConfirmed?: () => void }

export function useV3Action(
  client: V3Client,
  deployment: V3Deployment | undefined,
  getWallet: (() => Promise<WalletClient>) | undefined,
  account: Address | undefined,
) {
  const pendingRef = useRef(false)
  const pendingStep = useRef<{ complete: () => void }>()
  const [busy, setBusy] = useState(false)
  const [hash, setHash] = useState<Hex>()
  const [error, setError] = useState<string>()
  const [message, setMessage] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false)

  const verify = async (transaction: Hex) => {
    let receipt: Awaited<ReturnType<typeof readV3Receipt>>
    try {
      receipt = await readV3Receipt(client, transaction)
    } catch (failure) {
      if (failure instanceof V3TransactionRejected) {
        pendingStep.current = undefined
        setUnconfirmed(false)
        setMessage('')
        setError(failure.message)
      } else {
        setUnconfirmed(true)
        setMessage('The transaction was sent. Check its confirmation before trying again.')
      }
      return undefined
    }
    const step = pendingStep.current
    pendingStep.current = undefined
    setError(undefined)
    setUnconfirmed(false)
    step?.complete()
    return receipt
  }

  const runMany = async (prepare: () => Promise<readonly V3ActionStep[]>) => {
    if (!deployment || !getWallet || !account || pendingRef.current || pendingStep.current) return undefined
    pendingRef.current = true
    setBusy(true)
    setHash(undefined)
    setError(undefined)
    setMessage('Checking the transaction…')
    let completed = 0
    let total = 0
    try {
      const calls = await prepare()
      total = calls.length
      if (!total) {
        setMessage('No eligible transactions remain.')
        return undefined
      }
      let lastReceipt: Awaited<ReturnType<typeof readV3Receipt>> | undefined
      for (const { onConfirmed, ...call } of calls) {
        const progress = total > 1 ? `Transaction ${completed + 1} of ${total}. ` : ''
        setMessage(`${progress}Confirm in your wallet.`)
        const wallet = await getWallet()
        const transaction = await sendV3Call(client, deployment, wallet, account, call)
        setHash(transaction)
        pendingStep.current = {
          complete: () => {
            completed++
            onConfirmed?.()
            setMessage(
              total === 1
                ? 'Confirmed on the settlement network.'
                : `${completed} of ${total} transactions confirmed on the settlement network.`,
            )
          },
        }
        setMessage(`${progress}Waiting for confirmation…`)
        lastReceipt = await verify(transaction)
        if (!lastReceipt) return undefined
      }
      return lastReceipt
    } catch (failure) {
      setMessage(
        completed ? `${completed} of ${total} transactions confirmed. The remaining transactions were stopped.` : '',
      )
      setError(describeV3Error(failure))
      return undefined
    } finally {
      pendingRef.current = false
      setBusy(false)
    }
  }

  const run = (call: V3Call) => runMany(async () => [call])

  const recheck = async () => {
    if (!hash || pendingRef.current || !pendingStep.current) return undefined
    pendingRef.current = true
    setBusy(true)
    try {
      return await verify(hash)
    } finally {
      pendingRef.current = false
      setBusy(false)
    }
  }
  return { run, runMany, recheck, busy, unconfirmed, hash, error, message }
}
