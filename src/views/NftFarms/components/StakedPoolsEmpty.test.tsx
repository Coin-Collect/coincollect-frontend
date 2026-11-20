/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import StakedPoolsEmpty from './StakedPoolsEmpty'

jest.mock('contexts/Localization', () => ({ useTranslation: () => ({ t: (message: string) => message }) }))
jest.mock('components/ConnectWalletButton', () => ({
  __esModule: true,
  default: () => <button>Connect Wallet</button>,
}))
jest.mock('@pancakeswap/uikit', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  ArrowForwardIcon: () => null,
  HistoryIcon: () => null,
  WalletIcon: () => null,
}))

const theme = { colors: { backgroundAlt: '#27262c', cardBorder: '#383241', text: 'white', textSubtle: '#c1b5d2' } }

it.each([
  [false, false, 'No staked positions yet'],
  [true, false, 'No stakes in finished pools'],
  [false, true, 'No matching staked positions'],
])('shows the appropriate empty state in history=%s, filtered=%s', (history, filtered, title) => {
  const onBrowse = jest.fn()
  render(
    <ThemeProvider theme={theme as any}>
      <StakedPoolsEmpty history={history} connected filtered={filtered} onBrowse={onBrowse} />
    </ThemeProvider>,
  )

  expect(screen.getByRole('region', { name: title })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Turn off Staked only' }))
  expect(onBrowse).toHaveBeenCalledTimes(1)
})

it('asks a disconnected visitor to connect a wallet', () => {
  render(
    <ThemeProvider theme={theme as any}>
      <StakedPoolsEmpty history={false} connected={false} filtered={false} onBrowse={jest.fn()} />
    </ThemeProvider>,
  )

  expect(screen.getByRole('region', { name: 'Connect your wallet' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Connect Wallet' })).toBeTruthy()
})

it('plays the three heroes in order with one video at a time and a working pause control', () => {
  jest.useFakeTimers()
  const originalMatchMedia = window.matchMedia
  window.matchMedia = jest
    .fn()
    .mockReturnValue({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() })
  const visibility = jest.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  const { container, unmount } = render(
    <ThemeProvider theme={theme as any}>
      <StakedPoolsEmpty history={false} connected={false} filtered={false} onBrowse={jest.fn()} />
    </ThemeProvider>,
  )
  const currentVideo = () => {
    expect(container.querySelectorAll('video')).toHaveLength(1)
    return container.querySelector('[data-slot="0"] video')?.getAttribute('src')
  }

  try {
    expect(currentVideo()).toBe('/images/superheroes/1.webm')
    act(() => jest.advanceTimersByTime(5_000))
    expect(currentVideo()).toBe('/images/superheroes/3.webm')

    fireEvent.click(screen.getByRole('button', { name: 'Pause hero animation' }))
    act(() => jest.advanceTimersByTime(10_000))
    expect(container.querySelector('video')).toBeNull()
    expect(container.querySelector('[data-slot="0"]')?.getAttribute('data-hero')).toBe('3')

    fireEvent.click(screen.getByRole('button', { name: 'Play hero animation' }))
    act(() => jest.advanceTimersByTime(5_000))
    expect(currentVideo()).toBe('/images/superheroes/7.webm')
    act(() => jest.advanceTimersByTime(5_000))
    expect(currentVideo()).toBe('/images/superheroes/1.webm')
  } finally {
    unmount()
    visibility.mockRestore()
    window.matchMedia = originalMatchMedia
    jest.useRealTimers()
  }
})

it('shows only static hero artwork with reduced motion', () => {
  const originalMatchMedia = window.matchMedia
  window.matchMedia = jest
    .fn()
    .mockReturnValue({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() })
  const { container, unmount } = render(
    <ThemeProvider theme={theme as any}>
      <StakedPoolsEmpty history={true} connected={false} filtered={false} onBrowse={jest.fn()} />
    </ThemeProvider>,
  )

  try {
    expect(container.querySelectorAll('[data-hero] img')).toHaveLength(3)
    expect(container.querySelector('video')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Pause hero animation' })).toBeNull()
  } finally {
    unmount()
    window.matchMedia = originalMatchMedia
  }
})
