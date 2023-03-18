import { ChainId } from '@coincollect/sdk'
import { CHAIN_ID } from 'config/constants/networks'
import store from 'state'
import { GAS_PRICE_GWEI } from 'state/user/hooks/helpers'

/**
 * Function to return gasPrice outwith a react component
 */
// Gas Settings
const getGasPrice = (): string => {
  const chainId = CHAIN_ID
  const state = store.getState()
  const userGas = state.user.gasPrice || GAS_PRICE_GWEI.default
  return chainId === ChainId.POLYGON.toString() ? userGas : GAS_PRICE_GWEI.testnet
}

export default getGasPrice
