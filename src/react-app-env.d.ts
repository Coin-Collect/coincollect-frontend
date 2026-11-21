interface Window {
  ethereum?: {
    isMetaMask?: true
    request?: (request: { method: string; params?: readonly unknown[] | Record<string, unknown> }) => Promise<unknown>
  }
  okxwallet?: {
    request?: (...args: any[]) => Promise<void>
    send: unknown;
    enable: () => Promise<string[]>;
    on?: (method: string, listener: (...args: any[]) => void) => void;
    removeListener?: (method: string, listener: (...args: any[]) => void) => void;
  }
  bitkeep?: {
    ethereum?: import('utils/CustomConnectors/bitkeep-web3-connector/types').BitKeepProvider
  }
  BinanceChain?: {
    bnbSign?: (address: string, message: string) => Promise<{ publicKey: string; signature: string }>
  }
}

type SerializedBigNumber = string
