/** @jest-environment jsdom */
import { act, fireEvent, screen } from '@testing-library/react'
import { createRoot } from 'react-dom/client'
import V2PoolControls from '../components/V2PoolControls'
import type { PublicV2Pool } from '../../publication'
import type { V2UserPosition } from '../types'

// Presentation doubles identify the actual legacy components used by the controller.
jest.mock('@pancakeswap/uikit', () => {
  const React = require('react')
  const box = ({ children }: any) => <div>{children}</div>
  const button = ({ children, disabled, onClick }: any) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
  return {
    Flex: box,
    Text: box,
    Heading: box,
    Button: button,
    AddIcon: () => null,
    MinusIcon: () => null,
    AutoRenewIcon: () => null,
    useModal: (modal: any) => [
      () => {
        mockOpenedModes.push(modal.props.mode)
      },
    ],
  }
})
jest.mock('views/NftFarms/components/FarmCard/CardActionsContainer', () => ({
  StyledActionButton: ({ children, disabled, onClick }: any) => (
    <button data-testid="legacy-start" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}))
jest.mock('views/NftFarms/components/FarmCard/StakeAction', () => ({
  IconButtonWrapper: ({ children }: any) => <div data-testid="legacy-actions">{children}</div>,
  ActionChipButton: ({ children, disabled, onClick }: any) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}))
jest.mock('views/NftFarms/components/FarmCard/HarvestAction', () => {
  const box = ({ children }: any) => <div>{children}</div>
  return {
    RewardsPanel: ({ children }: any) => <section data-testid="legacy-earned">{children}</section>,
    RewardsHeader: box,
    RewardsGrid: box,
    RewardRow: box,
    TokenLabel: box,
    RewardValue: box,
    RewardTokenIcon: () => null,
    HarvestButton: ({ children, disabled, onClick }: any) => (
      <button disabled={disabled} onClick={onClick}>
        {children}
      </button>
    ),
  }
})
jest.mock('../components/V2PoolActionModal', () => ({ __esModule: true, default: () => null }))
jest.mock('../hooks', () => ({ notifyV2UserPositionChanged: jest.fn(), usePublishedV2UserPosition: jest.fn() }))
jest.mock('../transactions', () => ({
  ConfirmedV2WriteVerificationError: class extends Error {},
  harvestV2Pool: jest.fn(),
}))
jest.mock('hooks/useWeb3React', () => ({ __esModule: true, default: () => mockWallet }))
jest.mock('hooks/useToast', () => ({ __esModule: true, default: () => ({ toastSuccess: jest.fn() }) }))
jest.mock('contexts/Localization', () => ({ useTranslation: () => ({ t: (text: string) => text }) }))
jest.mock('components/AnimatedValue', () => ({
  __esModule: true,
  default: ({ children }: any) => <span>{children}</span>,
}))
jest.mock('hooks/useAnimatedRewardValue', () => ({
  __esModule: true,
  default: (value: any) => ({ displayValue: value.toFixed(6), isAnimating: false }),
}))
jest.mock('components/ConnectWalletButton', () => ({
  __esModule: true,
  default: () => <button>Connect Wallet</button>,
}))

let mockOpenedModes: string[] = []
let mockWallet: any
let root: ReturnType<typeof createRoot>
let container: HTMLDivElement
const pool = { address: '0x1111111111111111111111111111111111111111', snapshot: { status: 'ACTIVE' } } as PublicV2Pool
const position = {
  nftCount: '2',
  power: '31',
  pendingPrimary: '1000000000000000000',
  status: 'ACTIVE',
  capacityAvailable: true,
  rewards: [
    { address: 'primary', symbol: 'WPOL', decimals: 18, amount: '1000000000000000000', estimated: false },
    { address: 'side', symbol: 'USDT', decimals: 6, amount: '2500000', estimated: true },
  ],
} as V2UserPosition

beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  mockOpenedModes = []
  mockWallet = {
    account: '0x2222222222222222222222222222222222222222',
    chainId: 31337,
    library: { getSigner: () => ({}) },
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})
function render(next: V2UserPosition) {
  act(() =>
    root.render(
      <V2PoolControls pool={pool} position={next} loading={false} refreshing={false} refresh={async () => next} />,
    ),
  )
}

it('uses the legacy start button and opens the collection/NFT stake controller', () => {
  render({ ...position, nftCount: '0', power: '0', pendingPrimary: '0' })
  expect(screen.getByTestId('legacy-start').textContent).toBe('Click to Stake Now')
  fireEvent.click(screen.getByTestId('legacy-start'))
  expect(mockOpenedModes).toEqual(['stake'])
  expect(screen.queryByTestId('legacy-earned')).toBeNull()
})

it('uses the original earned panel and compact stake/unstake actions', () => {
  render(position)
  expect(screen.getByTestId('legacy-earned').textContent).toContain('Earned')
  expect(screen.getByTestId('legacy-earned').textContent).toContain('2.500000')
  expect(screen.getByTestId('legacy-actions').textContent).toBe('UnstakeStake More')
  fireEvent.click(screen.getByText('Unstake'))
  fireEvent.click(screen.getByText('Stake More'))
  expect(mockOpenedModes).toEqual(['unstake', 'stake'])
  expect(screen.queryByText('Emergency withdraw all · forfeits rewards')).toBeNull()
})

it('keeps harvest and withdrawal available after finish but disables stake-more', () => {
  render({ ...position, status: 'FINISHED' })
  expect((screen.getByText('Stake More') as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByText('Unstake') as HTMLButtonElement).disabled).toBe(false)
  expect((screen.getByText('Harvest') as HTMLButtonElement).disabled).toBe(false)
})

it('does not enable staking before the actual pool start', () => {
  render({ ...position, status: 'UPCOMING', nftCount: '0' })
  expect((screen.getByTestId('legacy-start') as HTMLButtonElement).disabled).toBe(true)
})

it('renders the existing wallet connect action for disconnected users', () => {
  mockWallet = {}
  render(position)
  expect(screen.getByText('Connect Wallet')).toBeTruthy()
  expect(screen.queryByTestId('legacy-actions')).toBeNull()
})
