import { useEffect, useRef, useState, type FormEvent } from 'react'
import styled from 'styled-components'
import useSWR from 'swr'
import { Button } from '@pancakeswap/uikit'
import { formatUnits } from '@ethersproject/units'
import type { BigNumber } from '@ethersproject/bignumber'
import type { TransactionReceipt, TransactionResponse } from '@ethersproject/providers'
import { getAccount } from 'wagmi/actions'
import { useSwitchChain } from 'wagmi'
import ConnectWalletButton from 'components/ConnectWalletButton'
import useWeb3React from 'hooks/useWeb3React'
import { getLocalForkStorageKey, getPolygonRuntimeChainId, isLocalForkMode } from 'config/localFork'
import { nftPoolRegistryRpcProvider as rpc } from 'utils/providers'
import { config } from 'utils/wagmi'
import {
  explainWithdrawalError,
  inspectContract,
  parseContractAddress,
  prepareWithdrawal,
  submitReviewedWithdrawal,
  type WithdrawalReview,
} from './chain'
import { NITRO_ADDRESS } from './profiles'

const Shell = styled.div`
  width: min(100%, 1040px);
  margin-inline: auto;
  padding-block: clamp(24px, 5vw, 64px);
  color: ${({ theme }) => theme.colors.text};
  min-width: 0;
`
const Intro = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 28px;
  h1 {
    font-size: clamp(32px, 6vw, 58px);
    letter-spacing: -0.055em;
    font-weight: 700;
    line-height: 1.06;
    margin-bottom: 9px;
  }
`
const Hint = styled.p`
  color: ${({ theme }) => theme.colors.textSubtle};
  line-height: 1.5;
  max-width: 60ch;
  font-size: 14px;
`
const Surface = styled.section`
  min-width: 0;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 20px;
  padding: clamp(16px, 3.5vw, 28px);
  background: ${({ theme }) => theme.colors.backgroundAlt};
  h2,
  h3 {
    font-size: 19px;
    font-weight: 650;
    letter-spacing: -0.025em;
    margin-bottom: 10px;
  }
`
const SearchForm = styled.form`
  display: grid;
  gap: 10px;
  label {
    color: ${({ theme }) => theme.colors.text};
    font-weight: 650;
    font-size: 14px;
  }
`
const Input = styled.input`
  min-width: 0;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 12px;
  padding: 12px;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.input};
  font: inherit;
  font-size: 16px;
  line-height: 1.3;
  &[aria-invalid='true'] {
    border-color: ${({ theme }) => theme.colors.failure};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`
const FormRow = styled.div`
  display: grid;
  gap: 8px;
  @media (min-width: 560px) {
    grid-template-columns: minmax(0, 1fr) auto;
  }
`
const Grid = styled.div`
  display: grid;
  gap: 14px;
  margin-top: 14px;
  @media (min-width: 820px) {
    grid-template-columns: minmax(0, 1.14fr) minmax(0, 0.86fr);
    align-items: start;
  }
`
const Stack = styled.div`
  display: grid;
  gap: 14px;
  min-width: 0;
`
const Network = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSubtle};
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 999px;
  padding: 7px 11px;
  white-space: nowrap;
`
const TopRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`
const PrimaryValue = styled.p`
  font-size: clamp(32px, 6vw, 48px);
  font-weight: 670;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.045em;
  margin: 4px 0 8px;
  overflow-wrap: anywhere;
`
const Code = styled.code`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  color: ${({ theme }) => theme.colors.textSubtle};
`
const TextButton = styled.button`
  color: ${({ theme }) => theme.colors.primary};
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
  font-weight: 650;
  padding: 10px 0;
  font-size: 14px;
  min-height: 44px;
  &:disabled {
    opacity: 0.65;
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`
const Explorer = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: underline;
  text-underline-offset: 2px;
  font-size: 14px;
`
const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.cardBorder};
  margin-block: 15px;
`
const Rows = styled.dl`
  margin: 0;
  & > div {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 9px 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  }
  dt {
    font-size: 14px;
    color: ${({ theme }) => theme.colors.textSubtle};
  }
  dd {
    margin: 0;
    text-align: right;
    min-width: 0;
    overflow-wrap: anywhere;
    font-variant-numeric: tabular-nums;
  }
`
const Disclosure = styled.details`
  margin-top: 14px;
  summary {
    cursor: pointer;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.4;
    padding-block: 6px;
  }
  ul {
    list-style: none;
    padding: 0;
    margin-top: 6px;
  }
  li {
    padding-block: 4px;
  }
`
const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.failure};
  margin-block: 8px;
  font-size: 14px;
  line-height: 1.45;
`
const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
`

type TxStatus = { hash: string; phase: 'pending' | 'confirmed' | 'failed' | 'replaced' }

function amount(value: BigNumber, decimals: number, symbol: string, compact = false): string {
  const exact = formatUnits(value, decimals)
  const [integer, fraction = ''] = exact.split('.')
  const shown = compact ? fraction.slice(0, 6).replace(/0+$/, '') : fraction.replace(/0+$/, '')
  if (compact && !value.isZero() && integer === '0' && !shown) return `< 0.000001 ${symbol}`
  return `${integer}${shown ? '.' + shown : ''} ${symbol}`
}

function sameTransaction(tx: TransactionResponse | undefined, review: WithdrawalReview) {
  return (
    tx?.to?.toLowerCase() === review.contract.toLowerCase() &&
    tx?.from.toLowerCase() === review.account.toLowerCase() &&
    tx?.data === review.transaction.data &&
    tx?.value.isZero()
  )
}

export default function ContractManager({ embedded = false }: { embedded?: boolean }) {
  const chain = getPolygonRuntimeChainId()
  const { account, chainId, library } = useWeb3React()
  const { switchChain, isPending: switching } = useSwitchChain()
  const [input, setInput] = useState('')
  const [contract, setContract] = useState('')
  const [inputError, setInputError] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [tokens, setTokens] = useState<string[]>([])
  const [tokenError, setTokenError] = useState('')
  const [selectedAsset, setSelectedAsset] = useState('native')
  const [review, setReview] = useState<WithdrawalReview>()
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState<'review' | 'wallet'>()
  const [txStatus, setTxStatus] = useState<TxStatus>()
  const lock = useRef(false)
  const networkLabel = isLocalForkMode ? 'Local Polygon fork' : 'Polygon'
  const readyWallet = Boolean(account && library && chainId === chain)
  const key = contract
    ? getLocalForkStorageKey(['contract-manager', chain, contract, account?.toLowerCase(), ...tokens].join(':'))
    : null
  const { data, error, isValidating, mutate } = useSWR(
    key,
    () => inspectContract(rpc, chain, contract, account || undefined, tokens),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )
  const available = data?.choices.filter((choice) => choice.amount.gt(0)) || []
  const choice = available.find(({ asset }) => asset === selectedAsset) || available[0]
  const shownReview =
    review &&
    review.contract === contract &&
    review.account.toLowerCase() === account?.toLowerCase() &&
    review.asset === choice?.asset &&
    readyWallet
      ? review
      : undefined
  const locked = Boolean(busy || txStatus?.phase === 'pending')

  useEffect(() => {
    if (!review) return undefined
    const timer = setTimeout(() => setReview(undefined), Math.max(0, review.expiresAt - Date.now()))
    return () => clearTimeout(timer)
  }, [review])

  function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const address = parseContractAddress(input)
      setInputError('')
      setReview(undefined)
      setActionError('')
      if (address !== contract) {
        setContract(address)
        setTokens([])
        setTokenInput('')
        setTokenError('')
        setSelectedAsset('native')
        setTxStatus(undefined)
      } else void mutate()
    } catch {
      setInputError('Enter a valid 0x contract address.')
      event.currentTarget.querySelector('input')?.focus()
    }
  }

  function addToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const token = parseContractAddress(tokenInput)
      if (tokens.includes(token)) return setTokenError('This token is already listed.')
      if (tokens.length >= 5) return setTokenError('You can add up to five token addresses.')
      setTokens([...tokens, token])
      setTokenInput('')
      setTokenError('')
    } catch {
      setTokenError('Enter a valid 0x token address.')
      event.currentTarget.querySelector('input')?.focus()
    }
  }

  async function preview() {
    if (lock.current || locked || !readyWallet || !account || !choice || !data) return
    lock.current = true
    setBusy('review')
    setReview(undefined)
    setActionError('')
    try {
      const result = await prepareWithdrawal(rpc, chain, data.address, account, choice.asset)
      const wallet = getAccount(config)
      if (wallet.address?.toLowerCase() !== account.toLowerCase() || wallet.chainId !== chain)
        throw new Error('The wallet changed. Review the withdrawal again.')
      setReview(result)
    } catch (cause) {
      setActionError(explainWithdrawalError(cause))
    } finally {
      lock.current = false
      setBusy(undefined)
    }
  }

  function showReceipt(hash: string, receipt: TransactionReceipt) {
    setTxStatus((previous) =>
      previous?.hash === hash ? { hash, phase: receipt.status === 1 ? 'confirmed' : 'failed' } : previous,
    )
    void mutate()
  }

  async function watchTransaction(tx: TransactionResponse, sentReview: WithdrawalReview) {
    try {
      showReceipt(tx.hash, await tx.wait())
    } catch (cause) {
      const replacement = cause as {
        code?: string
        cancelled?: boolean
        replacement?: TransactionResponse
        receipt?: TransactionReceipt
      }
      if (replacement.code === 'TRANSACTION_REPLACED' && replacement.replacement) {
        const replaced = replacement.replacement
        setTxStatus((previous) =>
          previous?.hash === tx.hash
            ? {
                hash: replaced.hash,
                phase:
                  !replacement.cancelled && sameTransaction(replaced, sentReview)
                    ? replacement.receipt?.status === 1
                      ? 'confirmed'
                      : replacement.receipt
                      ? 'failed'
                      : 'pending'
                    : 'replaced',
              }
            : previous,
        )
        void mutate()
      } else if (replacement.receipt) {
        showReceipt(tx.hash, replacement.receipt)
      }
      // A network failure after broadcast leaves the hash pending for a manual status check.
    }
  }

  async function withdraw() {
    if (!shownReview || !library || lock.current || locked) return
    lock.current = true
    setBusy('wallet')
    setActionError('')
    try {
      const tx = await submitReviewedWithdrawal(rpc, library.getSigner(shownReview.account), shownReview, () => {
        const wallet = getAccount(config)
        return { account: wallet.address, chainId: wallet.chainId }
      })
      setTxStatus({ hash: tx.hash, phase: 'pending' })
      setReview(undefined)
      void watchTransaction(tx, shownReview)
    } catch (cause) {
      setReview(undefined)
      // The wallet can return a hash before its RPC can fetch the submitted transaction.
      const hash = (cause as { transactionHash?: unknown })?.transactionHash
      if (typeof hash === 'string' && /^0x[\da-f]{64}$/i.test(hash)) {
        setTxStatus({ hash, phase: 'pending' })
      } else {
        setActionError(explainWithdrawalError(cause))
      }
    } finally {
      lock.current = false
      setBusy(undefined)
    }
  }

  async function checkTransaction() {
    if (!txStatus) return
    try {
      const receipt = await rpc.getTransactionReceipt(txStatus.hash)
      if (receipt) showReceipt(txStatus.hash, receipt)
    } catch {
      setActionError('Could not check the transaction yet. You can also use the explorer.')
    }
  }

  return (
    <Shell>
      {!embedded ? (
        <Intro>
          <div>
            <h1>Contract Manager</h1>
            <Hint>Check a contract’s balances and withdraw funds available to your wallet.</Hint>
          </div>
          <Network>{networkLabel}</Network>
        </Intro>
      ) : null}
      <Surface aria-label="Find a contract">
        <SearchForm onSubmit={analyze} noValidate>
          <label htmlFor="manager-contract-address">Contract address</label>
          <FormRow>
            <Input
              id="manager-contract-address"
              required
              value={input}
              placeholder="0x…"
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="none"
              aria-invalid={Boolean(inputError)}
              aria-describedby={inputError ? 'manager-address-hint manager-address-error' : 'manager-address-hint'}
              onChange={(event) => {
                setInput(event.target.value)
                setInputError('')
              }}
            />
            <Button type="submit" disabled={locked}>
              {isValidating ? 'Checking…' : 'Analyze contract'}
            </Button>
          </FormRow>
          <Hint id="manager-address-hint">Use a contract address on {networkLabel}.</Hint>
          <div id="manager-address-error" role="status">
            {inputError ? <ErrorText>{inputError}</ErrorText> : null}
          </div>
        </SearchForm>
        {!isLocalForkMode && !contract ? (
          <TextButton type="button" onClick={() => setInput(NITRO_ADDRESS)}>
            Use NitroClash example
          </TextButton>
        ) : null}
        <div role="status">
          {key && !data && isValidating ? <Hint>Reading balances and contract information…</Hint> : null}
          {error ? <ErrorText>{explainWithdrawalError(error)}</ErrorText> : null}
        </div>
      </Surface>

      {data ? (
        <Grid>
          <Surface aria-labelledby="contract-balances-title">
            <TopRow>
              <h2 id="contract-balances-title">{data.name || 'Contract balances'}</h2>
              <Network>{networkLabel}</Network>
            </TopRow>
            <Code>{data.address}</Code>
            {!isLocalForkMode && (
              <div>
                <Explorer href={`https://polygonscan.com/address/${data.address}`} target="_blank" rel="noreferrer">
                  View contract on PolygonScan
                </Explorer>
              </div>
            )}
            <Divider />
            <Hint>Native balance</Hint>
            <PrimaryValue title={amount(data.nativeBalance, 18, 'POL')}>
              {amount(data.nativeBalance, 18, 'POL', true)}
            </PrimaryValue>
            <Hint>Block {data.block.toLocaleString()}</Hint>
            <Divider />
            <Disclosure>
              <summary>Token balances ({data.tokens.length})</summary>
              <Rows>
                {data.tokens.map((token) => (
                  <div key={token.address}>
                    <dt>
                      <span>{token.symbol}</span>
                      <br />
                      <Code>
                        {token.address.slice(0, 8)}…{token.address.slice(-4)}
                      </Code>
                    </dt>
                    <dd title={token.address}>
                      {token.balance !== undefined && token.decimals !== undefined
                        ? amount(token.balance, token.decimals, token.symbol, true)
                        : 'Unavailable'}
                    </dd>
                  </div>
                ))}
              </Rows>
              <Disclosure>
                <summary>Check another token</summary>
                <SearchForm onSubmit={addToken} noValidate>
                  <label htmlFor="manager-token-address">Token address</label>
                  <FormRow>
                    <Input
                      id="manager-token-address"
                      required
                      value={tokenInput}
                      placeholder="0x…"
                      spellCheck={false}
                      autoComplete="off"
                      autoCapitalize="none"
                      aria-invalid={Boolean(tokenError)}
                      aria-describedby={tokenError ? 'manager-token-error' : undefined}
                      onChange={(event) => {
                        setTokenInput(event.target.value)
                        setTokenError('')
                      }}
                    />
                    <Button type="submit" variant="secondary" disabled={locked}>
                      Check token
                    </Button>
                  </FormRow>
                  <div id="manager-token-error" role="status">
                    {tokenError ? <ErrorText>{tokenError}</ErrorText> : null}
                  </div>
                </SearchForm>
              </Disclosure>
              <Hint>
                Includes CoinCollect’s tracked tokens, tokens referenced by the contract and addresses you add.
              </Hint>
            </Disclosure>
          </Surface>
          <Stack>
            <Surface aria-labelledby="contract-withdraw-title">
              <h2 id="contract-withdraw-title">Withdraw</h2>
              <Hint>{data.withdrawalProfile || 'Withdrawal availability depends on the contract and wallet.'}</Hint>
              {available.length > 1 ? (
                <Actions aria-label="Withdrawal asset">
                  {available.map(({ asset, symbol }) => (
                    <Button
                      key={asset}
                      scale="sm"
                      type="button"
                      variant={choice?.asset === asset ? 'primary' : 'secondary'}
                      aria-pressed={choice?.asset === asset}
                      disabled={locked}
                      onClick={() => {
                        setSelectedAsset(asset)
                        setReview(undefined)
                      }}
                    >
                      {symbol}
                    </Button>
                  ))}
                </Actions>
              ) : null}
              <Divider />
              <Hint>Available to this wallet</Hint>
              <PrimaryValue>
                {choice
                  ? amount(choice.amount, choice.decimals, choice.symbol, true)
                  : data.choices.length
                  ? amount(data.choices[0].amount, data.choices[0].decimals, data.choices[0].symbol, true)
                  : 'Unavailable'}
              </PrimaryValue>
              {error ? <Hint>Refresh the contract before making a withdrawal.</Hint> : null}
              <div role="status">{data.withdrawalReason ? <Hint>{data.withdrawalReason}</Hint> : null}</div>
              {!account && data.withdrawalProfile ? (
                <Actions>
                  <ConnectWalletButton type="button" />
                </Actions>
              ) : null}
              {account && chainId !== chain && data.withdrawalProfile ? (
                <Actions>
                  <Button type="button" disabled={switching} onClick={() => switchChain({ chainId: chain })}>
                    Switch to {networkLabel}
                  </Button>
                </Actions>
              ) : null}
              {shownReview ? (
                <>
                  <Rows aria-label="Withdrawal review">
                    <div>
                      <dt>Amount</dt>
                      <dd>{amount(shownReview.amount, shownReview.decimals, shownReview.symbol)}</dd>
                    </div>
                    <div>
                      <dt>Recipient</dt>
                      <dd>
                        <Code>{shownReview.recipient}</Code>
                      </dd>
                    </div>
                    <div>
                      <dt>Estimated network fee</dt>
                      <dd>{amount(shownReview.estimatedFee, 18, 'POL', true)}</dd>
                    </div>
                    <div>
                      <dt>Maximum network fee</dt>
                      <dd>{amount(shownReview.feeLimit, 18, 'POL')}</dd>
                    </div>
                    <div>
                      <dt>Function</dt>
                      <dd>
                        <Code>{shownReview.signature}</Code>
                      </dd>
                    </div>
                  </Rows>
                  <Actions>
                    <Button type="button" onClick={() => void withdraw()} disabled={locked || Boolean(error)}>
                      {busy === 'wallet' ? 'Waiting for wallet…' : 'Withdraw'}
                    </Button>
                    <TextButton type="button" onClick={() => setReview(undefined)} disabled={locked}>
                      Cancel review
                    </TextButton>
                  </Actions>
                  <Hint>Review the transaction in your wallet before you confirm.</Hint>
                </>
              ) : readyWallet && choice ? (
                <Actions>
                  <Button
                    type="button"
                    onClick={() => void preview()}
                    disabled={locked || isValidating || Boolean(error)}
                  >
                    {busy === 'review' ? 'Simulating…' : 'Review withdrawal'}
                  </Button>
                </Actions>
              ) : null}
              <div role="status">
                {actionError ? <ErrorText>{actionError}</ErrorText> : null}
                {txStatus ? (
                  <>
                    <Divider />
                    <Hint>
                      {txStatus.phase === 'confirmed'
                        ? 'Withdrawal confirmed.'
                        : txStatus.phase === 'pending'
                        ? 'Transaction submitted. Waiting for confirmation.'
                        : txStatus.phase === 'replaced'
                        ? 'This transaction was replaced or cancelled in your wallet.'
                        : 'The withdrawal transaction failed.'}
                    </Hint>
                    {isLocalForkMode ? (
                      <Code>{txStatus.hash}</Code>
                    ) : (
                      <Explorer href={`https://polygonscan.com/tx/${txStatus.hash}`} target="_blank" rel="noreferrer">
                        View transaction on PolygonScan
                      </Explorer>
                    )}
                  </>
                ) : null}
              </div>
              {txStatus?.phase === 'pending' ? (
                <TextButton type="button" onClick={() => void checkTransaction()}>
                  Check status
                </TextButton>
              ) : null}
            </Surface>
            <Surface>
              <h2>Contract access</h2>
              <Rows>
                <div>
                  <dt>ABI</dt>
                  <dd>{data.abiSource || 'Unavailable'}</dd>
                </div>
                <div>
                  <dt>Owner</dt>
                  <dd>{data.owner ? <Code>{data.owner}</Code> : 'Not available'}</dd>
                </div>
                {data.owner && account ? (
                  <div>
                    <dt>Connected wallet</dt>
                    <dd>{data.owner.toLowerCase() === account.toLowerCase() ? 'Current owner' : 'Not the owner'}</dd>
                  </div>
                ) : null}
                {data.roles.map((role) => (
                  <div key={role.label}>
                    <dt>{role.label}</dt>
                    <dd>
                      {role.granted === undefined ? 'Could not verify' : role.granted ? 'Granted' : 'Not granted'}
                    </dd>
                  </div>
                ))}
              </Rows>
              {data.functions.length ? (
                <Disclosure>
                  <summary>Contract functions ({data.functions.length})</summary>
                  <ul>
                    {data.functions.map((fn) => (
                      <li key={fn.signature}>
                        <Code>{fn.signature}</Code>
                        {fn.readOnly ? ' · Read' : fn.withdrawal ? ' · Withdrawal-related' : ' · Write'}
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              ) : null}
            </Surface>
          </Stack>
        </Grid>
      ) : null}
    </Shell>
  )
}
