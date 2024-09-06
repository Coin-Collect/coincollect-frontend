import { useEffect, useState, useRef } from 'react'
import useWeb3React from 'hooks/useWeb3React'
import { simpleRpcProvider } from 'utils/providers'
import { CHAIN_ID } from 'config/constants/networks'

/**
 * Provides a web3 provider with or without user's signer
 * Recreate web3 instance only if the provider change
 */
const useActiveWeb3React = () => {
  const { library, chainId, ...web3React } = useWeb3React()
  const refEth = useRef(library)
  const [provider, setProvider] = useState(library || simpleRpcProvider)

  useEffect(() => {
    if (library !== refEth.current) {
      setProvider(library || simpleRpcProvider)
      refEth.current = library
    }
  }, [library])

  return { library: provider, chainId: chainId ?? parseInt(CHAIN_ID, 10), ...web3React }
}

export default useActiveWeb3React
