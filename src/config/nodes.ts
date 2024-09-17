import { ChainId } from "@coincollect/sdk";
import { polygon } from "wagmi/chains";

export const PUBLIC_NODES = {
  [ChainId.POLYGON]: [
    ...polygon.rpcUrls.default.http,
    'https://polygon-bor-rpc.publicnode.com',
    'https://polygon.llamarpc.com',
  ],
}