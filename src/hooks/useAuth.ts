import { useCallback } from 'react'

import { useAccount, useDisconnect } from 'wagmi'

const useAuth = () => {
  const { chain } = useAccount()
  const { disconnectAsync } = useDisconnect()
 

  const logout = useCallback(async () => {
    try {
      await disconnectAsync()
    } catch (error) {
      console.error(error)
    }
  }, [disconnectAsync, chain?.id])

  return { logout }
}

export default useAuth
