import { ChainId } from "@coincollect/sdk"
import { useMemo } from "react"
import { isChainSupported } from "utils/wagmi"
import { useAccount } from "wagmi"

export const useActiveChainId = () => {
    //const localChainId = useLocalNetworkChain()
    //const queryChainId = useAtomValue(queryChainIdAtom)
  
    const { chainId: wagmiChainId } = useAccount()
    //const chainId = localChainId ?? wagmiChainId ?? (queryChainId >= 0 ? ChainId.BSC : undefined)
  
    //const isNotMatched = useDeferredValue(wagmiChainId && localChainId && wagmiChainId !== localChainId)
    const isWrongNetwork = useMemo(
      () => Boolean(((wagmiChainId && !isChainSupported(wagmiChainId)) ?? false)),
      [wagmiChainId],
    )
  
    return {
      chainId: wagmiChainId && isChainSupported(wagmiChainId) ? wagmiChainId : ChainId.POLYGON,
      isWrongNetwork,
    }
  }