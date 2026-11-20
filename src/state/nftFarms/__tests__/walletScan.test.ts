import reducer, { fetchFarmUserDataAsync, nonArchivedFarms } from '..'

jest.mock('../fetchFarms', () => ({}))
jest.mock('../fetchFarmUser', () => ({}))
jest.mock('../fetchMasterChefData', () => ({}))
jest.mock('../getFarmsPrices', () => ({}))
jest.mock('utils/viem', () => ({}))

const pids = nonArchivedFarms.map(({ pid }) => pid)
const walletA = { account: '0xAa', pids }
const walletB = { account: '0xBb', pids }
const data = { pid: pids[0], allowance: [], tokenBalance: '0', stakedBalance: '1', earnings: '0' }

it('waits for the current wallet scan and ignores the previous wallet response', () => {
  let state = reducer(undefined, fetchFarmUserDataAsync.pending('first', walletA))
  state = reducer(state, fetchFarmUserDataAsync.pending('second', walletB))
  state = reducer(state, fetchFarmUserDataAsync.fulfilled([data], 'first', walletA))
  expect(state.walletScan).toMatchObject({ account: '0xbb', status: 'loading' })
  expect(state.userDataAccount).toBeUndefined()

  state = reducer(state, fetchFarmUserDataAsync.fulfilled([data], 'second', walletB))
  expect(state.walletScan).toMatchObject({ account: '0xbb', status: 'ready' })
  expect(state.userDataAccount).toBe('0xbb')
})

it('does not treat a single-pool refresh or a failed wallet scan as an empty wallet', () => {
  const pending = reducer(undefined, fetchFarmUserDataAsync.pending('scan', walletA))
  const partial = reducer(
    pending,
    fetchFarmUserDataAsync.fulfilled([data], 'one-pool', { ...walletA, pids: [data.pid] }),
  )
  expect(partial.walletScan?.status).toBe('loading')
  expect(
    reducer(partial, fetchFarmUserDataAsync.rejected(new Error('Offline'), 'scan', walletA)).walletScan?.status,
  ).toBe('error')
})
