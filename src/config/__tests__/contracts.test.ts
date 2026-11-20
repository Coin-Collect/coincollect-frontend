import { isAddress } from '@ethersproject/address'
import contracts from 'config/constants/contracts'

const polygonContracts = Object.entries(contracts).flatMap(([name, addresses]) => {
  const polygon = '137' in addresses ? addresses[137] : undefined
  return typeof polygon === 'string' ? [[name, polygon] as const] : []
})

describe('Polygon contracts', () => {
  it('contains the deployed contract addresses', () => {
    expect(polygonContracts.length).toBeGreaterThan(0)
  })

  it.each(polygonContracts)('Contract %s has a valid unique address', (_name, address) => {
    expect(isAddress(address)).toBe(true)
    expect(polygonContracts.filter(([, candidate]) => candidate.toLowerCase() === address.toLowerCase())).toHaveLength(1)
  })
})
