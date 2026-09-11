import { classifyFactoryAuthority } from '../authority'

describe('Pool Manager factory authority', () => {
  const owner = '0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258'

  it('blocks browser deployment when owner is a contract', () => {
    expect(classifyFactoryAuthority(owner, '0x6000', owner)).toEqual({
      ownerIsContract: true,
      authorized: false,
      state: 'CONTRACT_OWNER',
    })
  })

  it('authorizes only a matching EOA owner', () => {
    expect(classifyFactoryAuthority(owner, '0x', owner).state).toBe('AUTHORIZED')
    expect(classifyFactoryAuthority(owner, '0x', null).state).toBe('WALLET_REQUIRED')
  })
})
