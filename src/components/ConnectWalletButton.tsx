import { Button, useWalletModal } from '@pancakeswap/uikit'
import useAuth from 'hooks/useAuth'
import { useTranslation } from 'contexts/Localization'
import Trans from './Trans'
import { useWeb3Modal } from '@web3modal/wagmi/react'

const ConnectWalletButton = (props) => {
  const { t } = useTranslation()
  const { open, close } = useWeb3Modal()

  return (
    <Button onClick={() => open()} {...props}>
      <Trans>Connect Wallet</Trans>
    </Button>
  )
}

export default ConnectWalletButton
