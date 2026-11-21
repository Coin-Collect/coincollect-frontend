import { Button, Flex, Heading, Text } from '@pancakeswap/uikit'
import { useIsMutating } from '@tanstack/react-query'
import { useWeb3Modal, useWeb3ModalState } from '@web3modal/wagmi/react'
import { isLocalForkMode } from 'config/localFork'
import { useEffect, useId, useRef, useState, type ComponentProps } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { useConfig, useConnect, type Connector } from 'wagmi'
import { getAccount } from 'wagmi/actions'
import Trans from './Trans'

type WalletButtonProps = ComponentProps<typeof Button>

const WalletDialog = styled.dialog`
  width: min(420px, calc(100% - 32px));
  padding: 24px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: ${({ theme }) => theme.radii.card};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.text};

  &:modal {
    overscroll-behavior: contain;
  }

  &::backdrop {
    background: rgba(0, 0, 0, 0.65);
    overflow: hidden;
    overscroll-behavior: contain;
  }
`

function connectionError(error: unknown, wallet: string) {
  for (let cause = error, depth = 0; cause && typeof cause === 'object' && depth < 5; depth++) {
    const code = 'code' in cause ? cause.code : undefined
    const message = 'message' in cause ? cause.message : undefined
    if (code === -32002 || (typeof message === 'string' && /request.*(pending|already active)/i.test(message))) {
      return `Open ${wallet} and approve or cancel the pending connection request, then try again.`
    }
    if (code === 4001) return `The connection request was declined in ${wallet}.`
    cause = 'cause' in cause ? cause.cause : undefined
  }
  return `Could not connect to ${wallet}. Unlock the extension and try again.`
}

const LocalConnectWalletButton = (props: WalletButtonProps) => {
  const config = useConfig()
  const { open } = useWeb3Modal()
  const { connectAsync, connectors } = useConnect()
  const pending = useIsMutating({ mutationKey: ['connect'] }) > 0
  const requesting = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useId()
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const extensions = connectors.filter(({ type, id }) => type === 'injected' && id !== 'injected')
  const wallets = extensions.length ? extensions : connectors.filter(({ id }) => id === 'injected')

  useEffect(() => {
    if (pickerOpen && !dialog.current?.open) dialog.current?.showModal()
  }, [pickerOpen])

  const openWallet = () => {
    if (getAccount(config).isConnected) {
      void open({ view: 'Account' })
      return
    }
    setError('')
    setPickerOpen(true)
  }

  const connect = async (wallet: Connector) => {
    if (pending || requesting.current || getAccount(config).isConnected) return
    requesting.current = true
    setError('')
    try {
      await connectAsync({ connector: wallet })
      dialog.current?.close()
    } catch (cause) {
      setError(connectionError(cause, wallet.name))
    } finally {
      requesting.current = false
    }
  }

  return (
    <>
      <Button onClick={openWallet} aria-haspopup="dialog" {...props}>
        <Trans>Connect Wallet</Trans>
      </Button>
      {pickerOpen &&
        createPortal(
          <WalletDialog ref={dialog} aria-labelledby={title} onClose={() => setPickerOpen(false)}>
            <Heading as="h2" id={title} mb="16px">
              Connect a browser wallet
            </Heading>
            <Flex flexDirection="column" style={{ gap: 12 }}>
              {wallets.map((wallet) => (
                <Button key={wallet.uid} type="button" disabled={pending} onClick={() => void connect(wallet)}>
                  {wallet.name}
                </Button>
              ))}
              <Text small color={error ? 'failure' : 'textSubtle'} role="status">
                {error ||
                  (pending
                    ? 'Approve or cancel the connection in your wallet extension.'
                    : 'Select your wallet for the local test network.')}
              </Text>
              <form method="dialog">
                <Button variant="secondary" type="submit" width="100%">
                  <Trans>Close</Trans>
                </Button>
              </form>
            </Flex>
          </WalletDialog>,
          document.body,
        )}
    </>
  )
}

const StandardConnectWalletButton = (props: WalletButtonProps) => {
  const config = useConfig()
  const { open } = useWeb3Modal()
  const { open: modalOpen } = useWeb3ModalState()

  const openWallet = () => {
    if (modalOpen) return
    void open({ view: getAccount(config).isConnected ? 'Account' : 'Connect' })
  }

  return (
    <Button onClick={openWallet} {...props}>
      <Trans>Connect Wallet</Trans>
    </Button>
  )
}

const ConnectWalletButton = (props: WalletButtonProps) =>
  isLocalForkMode ? <LocalConnectWalletButton {...props} /> : <StandardConnectWalletButton {...props} />

export default ConnectWalletButton
