/** @jest-environment jsdom */

import { act, render, waitFor } from '@testing-library/react'
import type { Address, Hex, WalletClient } from 'viem'
import { useV3Action } from './hooks'
import type { V3Client, V3Deployment } from './runtime'
import { readV3Receipt, sendV3Call } from './transactions'

jest.mock('wagmi', () => ({}))
jest.mock('wagmi/actions', () => ({}))
jest.mock('./poolPresentation', () => ({ loadV3PresentationDocument: jest.fn() }))
jest.mock('./transactions', () => ({
  describeV3Error: (error: Error) => error.message,
  readV3Receipt: jest.fn(),
  sendV3Call: jest.fn(),
  V3TransactionRejected: class extends Error {},
}))

const account = '0x0000000000000000000000000000000000000001' as Address
const deployment = { address: account, chainId: 31337, runtimeHash: '0x1234' } as V3Deployment
const client = {} as V3Client
const getWallet = async () => ({} as WalletClient)
const send = sendV3Call as jest.MockedFunction<typeof sendV3Call>
const verify = readV3Receipt as jest.MockedFunction<typeof readV3Receipt>
const receipt = {} as Awaited<ReturnType<typeof readV3Receipt>>

function setup() {
  let action: ReturnType<typeof useV3Action>
  function Probe() {
    action = useV3Action(client, deployment, getWallet, account)
    return null
  }
  render(<Probe />)
  const steps = ['0x01', '0x02', '0x03'].map((data) => ({
    to: account,
    data: data as Hex,
    onConfirmed: jest.fn(),
  }))
  const start = async () => {
    await act(async () => {
      await action.runMany(async () => steps)
    })
  }
  return { start, steps, action: () => action }
}

beforeEach(() => jest.resetAllMocks())

test('shows the current NFT and reward tokens while the wallet is open', async () => {
  const { steps, action } = setup()
  const confirmationLabel = 'Harvest · Neon Ronin #1 · COLLECT + SHIB'
  let approve: (hash: Hex) => void
  send.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        approve = resolve
      }),
  )
  verify.mockResolvedValue(receipt)
  let pending: ReturnType<ReturnType<typeof useV3Action>['runMany']>
  act(() => {
    pending = action().runMany(async () => [{ ...steps[0], confirmationLabel }, steps[1]])
  })
  await waitFor(() =>
    expect(action().message).toBe(`Transaction 1 of 2. ${confirmationLabel}. Confirm in your wallet.`),
  )
  expect(send).toHaveBeenCalledWith(client, deployment, expect.anything(), account, { to: account, data: '0x01' })
  send.mockResolvedValueOnce('0x02')
  await act(async () => {
    approve('0x01')
    await pending
  })
  expect(action().message).toBe('2 of 2 transactions confirmed on the settlement network.')
})

test('stops at a wallet rejection and records only already confirmed NFT actions', async () => {
  const { start, steps, action } = setup()
  send.mockResolvedValueOnce('0x01').mockRejectedValueOnce(new Error('Rejected in wallet'))
  verify.mockResolvedValueOnce(receipt)
  await start()
  expect(send).toHaveBeenCalledTimes(2)
  expect(steps[0].onConfirmed).toHaveBeenCalledTimes(1)
  expect(steps[1].onConfirmed).not.toHaveBeenCalled()
  expect(steps[2].onConfirmed).not.toHaveBeenCalled()
  expect(action().message).toMatch('1 of 3 transactions confirmed')
  expect(action().error).toBe('Rejected in wallet')
})

test('rechecks a pending receipt without resending or submitting the remaining NFT actions', async () => {
  const { start, steps, action } = setup()
  send.mockResolvedValueOnce('0x01').mockResolvedValueOnce('0x02')
  verify.mockResolvedValueOnce(receipt).mockRejectedValueOnce(new Error('RPC timeout')).mockResolvedValueOnce(receipt)
  await start()
  expect(action().unconfirmed).toBe(true)
  await start()
  expect(send).toHaveBeenCalledTimes(2)
  await act(async () => {
    await action().recheck()
  })
  expect(verify).toHaveBeenLastCalledWith(client, '0x02')
  expect(send).toHaveBeenCalledTimes(2)
  expect(steps[1].onConfirmed).toHaveBeenCalledTimes(1)
  expect(steps[2].onConfirmed).not.toHaveBeenCalled()
  expect(action().unconfirmed).toBe(false)
  expect(action().message).toMatch('2 of 3 transactions confirmed')
})
