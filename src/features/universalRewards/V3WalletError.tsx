import { useState } from 'react'
import { getLocalForkRpcUrl, LOCAL_FORK_CHAIN_ID } from 'config/localFork'
import type { WalletClient } from 'viem'
import { V3Actions, V3Button, V3Error, V3Muted } from './styles'
import { assertLocalFork, describeV3Error, localRpcMismatch } from './transactions'
import type { V3Client } from './runtime'

export default function V3WalletError({
  message,
  client,
  getWallet,
}: {
  message: string
  client: V3Client
  getWallet?: () => Promise<WalletClient>
}) {
  const [rpcStatus, setRpcStatus] = useState('')
  const [checking, setChecking] = useState(false)
  const rpc = message.startsWith(localRpcMismatch) ? getLocalForkRpcUrl() : undefined

  const check = async () => {
    if (!getWallet || checking) return
    setChecking(true)
    setRpcStatus('')
    try {
      const wallet = await getWallet()
      if ((await wallet.getChainId()) !== LOCAL_FORK_CHAIN_ID) {
        setRpcStatus(`Select chain ${LOCAL_FORK_CHAIN_ID} for this site in your wallet.`)
        return
      }
      await assertLocalFork(wallet, client)
      setRpcStatus('Wallet RPC verified. Retry your transaction.')
    } catch (error) {
      setRpcStatus(describeV3Error(error))
    } finally {
      setChecking(false)
    }
  }

  return (
    <div>
      <V3Error role="alert">{message}</V3Error>
      {rpc && (
        <>
          <V3Muted>
            In the MetaMask extension, open <strong>Networks</strong>, edit the CoinCollect local network, and select{' '}
            <code>{rpc}</code> as its RPC URL for chain {LOCAL_FORK_CHAIN_ID}.
          </V3Muted>
          <V3Actions>
            <V3Button
              type="button"
              $secondary
              disabled={checking}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(rpc)
                  setRpcStatus('RPC URL copied.')
                } catch {
                  setRpcStatus('Select and copy the RPC URL shown above.')
                }
              }}
            >
              Copy RPC URL
            </V3Button>
            {getWallet && (
              <V3Button type="button" $secondary disabled={checking} onClick={() => void check()}>
                {checking ? 'Checking wallet RPC…' : 'Check wallet RPC'}
              </V3Button>
            )}
          </V3Actions>
          {rpcStatus && <V3Muted role="status">{rpcStatus}</V3Muted>}
        </>
      )}
    </div>
  )
}
