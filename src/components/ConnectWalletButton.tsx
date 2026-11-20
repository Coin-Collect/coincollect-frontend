import { Button } from '@pancakeswap/uikit'
import { useWeb3Modal, useWeb3ModalState } from '@web3modal/wagmi/react'
import type { ComponentProps } from 'react'
import { useConfig } from 'wagmi'
import { getAccount } from 'wagmi/actions'
import Trans from './Trans'

const ConnectWalletButton = (props: ComponentProps<typeof Button>) => {
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

export default ConnectWalletButton
