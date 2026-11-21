/** @jest-environment jsdom */

import { BitKeepConnector, NoBitKeepProviderError, UserRejectedRequestError } from '.'

const account = '0x0000000000000000000000000000000000000001'
let connector: BitKeepConnector

beforeEach(() => {
  connector = new BitKeepConnector({ supportedChainIds: [137] })
  delete window.bitkeep
})

afterEach(() => {
  connector.deactivate()
  delete window.bitkeep
})

it('handles an absent wallet during authorization and activation', async () => {
  await expect(connector.isAuthorized()).resolves.toBe(false)
  await expect(connector.activate()).rejects.toBeInstanceOf(NoBitKeepProviderError)
  await expect(connector.getChainId()).rejects.toBeInstanceOf(NoBitKeepProviderError)
})

it('accepts a wrapped RPC result and removes each installed listener on disconnect', async () => {
  const on = jest.fn()
  const removeListener = jest.fn()
  const provider = { send: jest.fn().mockResolvedValue({ result: [account] }), enable: jest.fn(), on, removeListener }
  window.bitkeep = { ethereum: provider }

  await expect(connector.activate()).resolves.toEqual({ provider, account })
  await expect(connector.activate()).resolves.toEqual({ provider, account })
  expect(on).toHaveBeenCalledTimes(4)

  delete window.bitkeep
  connector.deactivate()
  expect(removeListener.mock.calls).toEqual(on.mock.calls)
  expect(provider.enable).not.toHaveBeenCalled()
})

it('does not retry a rejected account request through the legacy connect prompt', async () => {
  const enable = jest.fn()
  const send = jest.fn().mockRejectedValue({ code: 4001 })
  window.bitkeep = { ethereum: { send, enable } }

  await expect(connector.activate()).rejects.toBeInstanceOf(UserRejectedRequestError)
  expect(send).toHaveBeenCalledTimes(1)
  expect(enable).not.toHaveBeenCalled()
})
