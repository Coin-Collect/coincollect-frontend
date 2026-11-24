/** @jest-environment jsdom */

import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import ManagedBatchExit from './ManagedBatchExit'

jest.mock('./styles', () => ({
  V3Actions: 'div',
  V3Button: 'button',
  V3Error: 'p',
  V3Field: 'label',
  V3Fields: 'fieldset',
  V3Muted: 'p',
}))

const choices = new Map([
  [BigInt(9), BigInt(5)],
  [BigInt(2), BigInt(8)],
])

const setup = (overrides: Partial<ComponentProps<typeof ManagedBatchExit>> = {}) => {
  const onConfirm = jest.fn()
  const onSwitch = jest.fn()
  render(
    <ManagedBatchExit
      choices={choices}
      limit={16}
      disabled={false}
      needsNetwork={false}
      onSwitch={onSwitch}
      onConfirm={onConfirm}
      {...overrides}
    />,
  )
  return { onConfirm, onSwitch }
}

test('submits the chosen amounts together in token order and clears after confirmation', () => {
  const { onConfirm } = setup()
  const first = screen.getByRole('textbox', { name: /NFT #9/ }) as HTMLInputElement
  const second = screen.getByRole('textbox', { name: /NFT #2/ }) as HTMLInputElement
  fireEvent.change(first, { target: { value: '3' } })
  fireEvent.change(second, { target: { value: '8' } })
  fireEvent.click(screen.getByRole('button', { name: 'Unstake selected NFTs' }))
  expect(onConfirm).toHaveBeenCalledTimes(1)
  expect(onConfirm.mock.calls[0][0]).toEqual([
    { tokenId: BigInt(2), quantity: BigInt(8) },
    { tokenId: BigInt(9), quantity: BigInt(3) },
  ])
  expect(first.value).toBe('3')
  act(() => onConfirm.mock.calls[0][1]())
  expect(first.value).toBe('')
  expect(second.value).toBe('')
})

test('focuses an invalid amount and does not request a wallet transaction', () => {
  const { onConfirm } = setup()
  const field = screen.getByRole('textbox', { name: /NFT #9/ })
  fireEvent.change(field, { target: { value: '6' } })
  fireEvent.click(screen.getByRole('button', { name: 'Unstake selected NFTs' }))
  expect(screen.getByRole('alert').textContent).toContain('between 0 and 5')
  expect(document.activeElement).toBe(field)
  expect(field.getAttribute('aria-invalid')).toBe('true')
  expect(onConfirm).not.toHaveBeenCalled()
})
