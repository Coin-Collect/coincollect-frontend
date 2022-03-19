import { StaticJsonRpcProvider } from '@ethersproject/providers'
import getRpcUrl, { getPolygonNodeUrl } from 'utils/getRpcUrl'

const RPC_URL = getRpcUrl()
const POLYGON_RPC_URL = getPolygonNodeUrl()

export const simpleRpcProvider = new StaticJsonRpcProvider(RPC_URL)
export const simplePolygonRpcProvider = new StaticJsonRpcProvider(POLYGON_RPC_URL)

export default null
