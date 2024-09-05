import { useMemo } from 'react';
import { useClient, useAccount, useConnect, useDisconnect, useConnectorClient, Config } from 'wagmi';
import { providers } from 'ethers';
import { Account, Chain, Client, Transport } from 'viem';

export function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = client
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  const provider = new providers.Web3Provider(transport, network)
  return provider
}

/** Hook to convert a Viem Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useConnectorClient<Config>({ chainId })
  return useMemo(() => (client ? clientToSigner(client) : undefined), [client])
}

export default function useWeb3React() {
  const client = useClient();
  const { address, chain, connector, isConnected } = useAccount();
  const { connect, error } = useConnect();
  const { disconnect } = useDisconnect();
  const provider = useEthersSigner()

  // Activate function to connect a wallet
  const activate = async (connector) => {
    await connect({ connector });
  };

  // Deactivate function to disconnect a wallet
  const deactivate = () => {
    disconnect();
  };
  

  const library = useMemo(() => {
    if (!client) return undefined;

    return provider;
  }, [provider]);

  return {
    account: isConnected ? address : null, // TODO: migrate using `isConnected` instead of account to check wallet auth,
    chainId: chain?.id,
    library,
    activate,
    deactivate,
    isActive: isConnected,
    connector,
    error,
  };
}



/*
account
error
connector
chainid
activate
deactivate
library
*/
