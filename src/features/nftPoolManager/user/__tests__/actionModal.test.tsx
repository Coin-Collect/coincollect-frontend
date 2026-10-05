/** @jest-environment jsdom */
import { act, fireEvent, screen } from '@testing-library/react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'styled-components'
import V2PoolActionModal from '../components/V2PoolActionModal'
import { readV2OwnedNfts } from '../nftDiscovery'
import { approveV2PoolCollection, stakeV2Nfts } from '../transactions'
import type { PublicV2Pool } from '../../publication'

jest.mock('@pancakeswap/uikit', () => {
  const box = ({ children }: any) => <div>{children}</div>
  const button = ({ children, disabled, onClick, scale, variant, isLoading, endIcon, ...props }: any) => (
    <button disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  )
  return {
    Flex: box,
    Text: box,
    Link: box,
    ModalBody: box,
    Button: button,
    AutoRenewIcon: () => null,
    LightningIcon: () => null,
    WarningIcon: () => null,
    CheckmarkCircleFillIcon: () => null,
    Modal: ({ children, title, onBack }: any) => (
      <section>
        <h1>{title}</h1>
        {onBack && <button onClick={onBack}>Back</button>}
        {children}
      </section>
    ),
  }
})
jest.mock('views/NftFarms/components/DepositModal', () => {
  const box = ({ children }: any) => <div>{children}</div>
  return {
    NftBox: ({ src }: any) => <img data-testid="legacy-nft-image" src={src} alt="NFT" />,
    SelectedNftBox: ({ src }: any) => <img data-testid="legacy-selected-image" src={src} alt="Selected NFT" />,
    NftOption: ({ children, onClick, disabled, 'aria-label': label, 'aria-pressed': pressed }: any) => (
      <button disabled={disabled} onClick={onClick} aria-label={label} aria-pressed={pressed}>
        {children}
      </button>
    ),
    Wrapper: box,
    SelectionInfo: box,
    SelectionCountChip: box,
  }
})
jest.mock('components/CollectionSelectModal/CollectionSelectModal', () => ({
  Title: ({ children }: any) => <div>{children}</div>,
  Wrapper: ({ children }: any) => <div>{children}</div>,
}))
jest.mock('components/CollectionSelectModal/CollectionList', () => {
  const box = ({ children }: any) => <div>{children}</div>
  return {
    CollectionAvatar: () => null,
    ContentColumn: box,
    CollectionTitleRow: box,
    CollectionTitleText: box,
    PowerText: box,
    MenuItem: ({ children, onClick, disabled }: any) => (
      <div onClick={onClick} aria-disabled={disabled}>
        {children}
      </div>
    ),
  }
})
jest.mock('components/Modal', () => ({ ModalActions: ({ children }: any) => <div>{children}</div> }))
jest.mock('components/Loader/CircleLoader', () => ({ __esModule: true, default: () => <span>Loading NFTs</span> }))
jest.mock('views/Nft/market/components/Activity/NoNftsImage', () => ({ __esModule: true, default: () => null }))
jest.mock('hooks/useTheme', () => ({
  __esModule: true,
  default: () => ({ theme: { colors: { gradients: { bubblegum: 'pink' } } } }),
}))
jest.mock('hooks/useWeb3React', () => ({ __esModule: true, default: () => mockWallet }))
jest.mock('contexts/Localization', () => ({
  useTranslation: () => ({ t: (text: string, args?: any) => text.replace('%count%', args?.count ?? '') }),
}))
jest.mock('../hooks', () => ({
  notifyV2UserPositionChanged: jest.fn(),
  usePublishedV2UserPosition: () => ({ position: mockPosition, loading: false, refresh: async () => mockPosition }),
  useVerifiedV2UserRecoveryPosition: () => ({
    position: mockRecoveryPosition,
    loading: false,
    refreshing: false,
    refresh: async () => mockRecoveryPosition,
  }),
}))
jest.mock('../nftDiscovery', () => ({
  readV2OwnedNfts: jest.fn(),
  readV2NftMetadata: jest.fn().mockResolvedValue({ image: '/test-nft.png' }),
}))
jest.mock('../transactions', () => ({
  ConfirmedV2WriteVerificationError: class extends Error {},
  approveV2PoolCollection: jest.fn(),
  stakeV2Nfts: jest.fn(),
  unstakeV2Nfts: jest.fn(),
  emergencyWithdrawV2Position: jest.fn(),
}))

const address = '0x1111111111111111111111111111111111111111'
const hugeId = '900719925474099300000'
const pool = { id: '137:test', address } as PublicV2Pool
let mockPosition: any
let mockRecoveryPosition: any
const mockWallet = {
  account: '0x2222222222222222222222222222222222222222',
  chainId: 31337,
  library: { getSigner: () => ({}) },
}
let root: ReturnType<typeof createRoot>
let container: HTMLDivElement
beforeEach(() => {
  jest.clearAllMocks()
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  mockPosition = {
    nftCount: '0',
    power: '0',
    status: 'ACTIVE',
    startBlock: 0,
    endBlock: 100,
    rewards: [],
    performanceFee: '0',
    userLimit: false,
    collections: [{ address, name: 'KEY NFT', image: '/key.png', weight: '10', approved: true, staked: [] }],
  }
  mockRecoveryPosition = undefined
  ;(readV2OwnedNfts as jest.Mock).mockResolvedValue({ tokenIds: [hugeId], complete: true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})
async function render(mode: 'stake' | 'unstake' = 'stake') {
  await act(async () => {
    root.render(
      <ThemeProvider theme={{ colors: {} } as any}>
        <V2PoolActionModal pool={pool} mode={mode} onSuccess={async () => {}} />
      </ThemeProvider>,
    )
  })
}
it('opens the collection picker, then its NFT image tiles instead of checkbox rows', async () => {
  await render()
  expect(screen.getByRole('heading', { name: 'Choose an NFT collection' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Choose KEY NFT' }))
  expect(screen.getByText('Select NFTs to Stake')).toBeTruthy()
  expect(screen.getByTestId('legacy-nft-image')).toBeTruthy()
  expect(document.querySelector('input[type=checkbox]')).toBeNull()
  fireEvent.click(screen.getByLabelText(`KEY NFT NFT #${hugeId}`))
  expect(screen.getByTestId('legacy-selected-image')).toBeTruthy()
  expect((screen.getByText('Confirm') as HTMLButtonElement).disabled).toBe(false)
  fireEvent.click(screen.getByText('Back'))
  expect(screen.getByRole('button', { name: 'Choose KEY NFT' })).toBeTruthy()
})
it('only enables the chosen collection and keeps approval separate from NFT staking', async () => {
  mockPosition.collections[0].approved = false
  ;(approveV2PoolCollection as jest.Mock).mockImplementation(async () => {
    mockPosition = { ...mockPosition, collections: [{ ...mockPosition.collections[0], approved: true }] }
    return { transactionHash: '0xapproved' }
  })
  await render()
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Approve KEY NFT' }))
  })
  expect(approveV2PoolCollection).toHaveBeenCalledWith(expect.objectContaining({ poolAddress: address }), address)
  expect(screen.getByRole('button', { name: 'Choose KEY NFT' })).toBeTruthy()
  expect(stakeV2Nfts).not.toHaveBeenCalled()
  expect(screen.queryByText('Select NFTs to Stake')).toBeNull()
})
it('requires explicit unstake selection and retains the recorded NFT power', async () => {
  mockRecoveryPosition = {
    nftCount: '1',
    power: '30',
    collections: [
      {
        address,
        name: 'KEY NFT',
        staked: [
          {
            collectionAddress: address,
            tokenId: hugeId,
            weight: '30',
            collectionName: 'KEY NFT',
            collectionImage: '/key.png',
          },
        ],
      },
    ],
  }
  await render('unstake')
  expect((screen.getByText('Confirm') as HTMLButtonElement).disabled).toBe(true)
  expect(readV2OwnedNfts).not.toHaveBeenCalled()
  fireEvent.click(screen.getByLabelText(`KEY NFT NFT #${hugeId}`))
  expect(screen.getByText('Selected: 1 NFT · 30 power')).toBeTruthy()
  expect((screen.getByText('Confirm') as HTMLButtonElement).disabled).toBe(false)
})
