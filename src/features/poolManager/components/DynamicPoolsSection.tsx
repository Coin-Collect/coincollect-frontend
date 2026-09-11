import { useEffect, useState } from 'react'
import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { formatUnits } from '@ethersproject/units'
import { Card, CardBody, Text } from '@pancakeswap/uikit'
import ConnectWalletButton from 'components/ConnectWalletButton'
import useWeb3React from 'hooks/useWeb3React'
import { simplePolygonRpcProvider } from 'utils/providers'
import smartChefAbi from 'config/abi/sousChefV3.json'
import erc20Abi from 'config/abi/erc20.json'
import { usePoolManagerRegistry } from '../hooks'
import { NormalizedPool } from '../types'
import { parseTokenAmount, formatTokenAmount } from '../calculations'
import { ActionButton, ButtonRow, Field, Input, LinkText, Muted, Notice, StatusPill } from './styles'
import styled from 'styled-components'

const Section = styled.section`
  margin: 0 0 28px;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
`

const PoolCard = styled(Card)`
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
`

interface AccountState {
  allowance: BigNumber
  balance: BigNumber
  staked: BigNumber
  pending: BigNumber
}

function DynamicPoolCard({ pool }: { pool: NormalizedPool }) {
  const { account, library } = useWeb3React()
  const [amount, setAmount] = useState('')
  const [accountState, setAccountState] = useState<AccountState>({
    allowance: BigNumber.from(0),
    balance: BigNumber.from(0),
    staked: BigNumber.from(0),
    pending: BigNumber.from(0),
  })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const refresh = async () => {
    if (!account) return
    const token = new Contract(pool.stakingToken.address, erc20Abi, simplePolygonRpcProvider)
    const chef = new Contract(pool.address, smartChefAbi, simplePolygonRpcProvider)
    const [allowance, balance, userInfo, pending] = await Promise.all([
      token.allowance(account, pool.address),
      token.balanceOf(account),
      chef.userInfo(account),
      chef.pendingReward(account),
    ])
    setAccountState({
      allowance: BigNumber.from(allowance),
      balance: BigNumber.from(balance),
      staked: BigNumber.from(userInfo.amount || userInfo[0]),
      pending: BigNumber.from(pending),
    })
  }

  useEffect(() => {
    refresh().catch(() => undefined)
  }, [account, pool.address])

  const transact = async (action: 'approve' | 'deposit' | 'withdraw' | 'harvest') => {
    if (!library || !account) {
      setMessage('Connect a Polygon wallet first.')
      return
    }
    try {
      setBusy(true)
      setMessage('Waiting for wallet…')
      const signer = library.getSigner()
      const chef = new Contract(pool.address, smartChefAbi, signer)
      if (action === 'approve') {
        const token = new Contract(pool.stakingToken.address, erc20Abi, signer)
        await (await token.approve(pool.address, parseTokenAmount(amount || '0', pool.stakingToken.decimals))).wait()
      } else if (action === 'deposit') {
        await (await chef.deposit(parseTokenAmount(amount, pool.stakingToken.decimals))).wait()
      } else if (action === 'withdraw') {
        await (await chef.withdraw(parseTokenAmount(amount, pool.stakingToken.decimals))).wait()
      } else {
        await (await chef.deposit(0)).wait()
      }
      setMessage('Confirmed on Polygon.')
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Wallet action failed.')
    } finally {
      setBusy(false)
    }
  }

  const parsedAmount = (() => {
    try {
      return parseTokenAmount(amount || '0', pool.stakingToken.decimals)
    } catch {
      return BigNumber.from(0)
    }
  })()
  return (
    <PoolCard>
      <CardBody>
        <Text bold fontSize="20px">
          {pool.stakingToken.symbol} → {pool.rewardToken.symbol}
        </Text>
        <Text color="textSubtle" fontSize="12px" mb="12px">
          Factory-discovered · <LinkText href={`/admin/pools/${pool.address}`}>details</LinkText>
        </Text>
        <StatusPill $status={pool.status}>{pool.status}</StatusPill>
        <Text mt="12px">
          {formatTokenAmount(pool.rewardPerBlock, pool.rewardToken.decimals)} {pool.rewardToken.symbol} / block
        </Text>
        <Text color="textSubtle">
          Staked: {formatTokenAmount(pool.totalStaked, pool.stakingToken.decimals)} {pool.stakingToken.symbol}
        </Text>
        {account ? (
          <>
            <Text color="textSubtle">
              Your stake: {formatTokenAmount(accountState.staked, pool.stakingToken.decimals)} · pending:{' '}
              {formatTokenAmount(accountState.pending, pool.rewardToken.decimals)} {pool.rewardToken.symbol}
            </Text>
            <Field style={{ marginTop: 12 }}>
              Amount ({pool.stakingToken.symbol})
              <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.0" />
            </Field>
            <ButtonRow>
              <ActionButton onClick={() => transact('approve')} disabled={busy || parsedAmount.lte(0)}>
                Approve
              </ActionButton>
              <ActionButton
                onClick={() => transact('deposit')}
                disabled={busy || parsedAmount.lte(0) || accountState.allowance.lt(parsedAmount)}
              >
                Stake
              </ActionButton>
              <ActionButton
                onClick={() => transact('withdraw')}
                disabled={busy || parsedAmount.lte(0) || accountState.staked.lt(parsedAmount)}
                $secondary
              >
                Withdraw
              </ActionButton>
              <ActionButton
                onClick={() => transact('harvest')}
                disabled={busy || accountState.pending.isZero()}
                $secondary
              >
                Harvest
              </ActionButton>
            </ButtonRow>
          </>
        ) : (
          <ConnectWalletButton />
        )}
        {message ? <Notice $error={message.includes('failed') || message.includes('failed')}>{message}</Notice> : null}
      </CardBody>
    </PoolCard>
  )
}

export default function DynamicPoolsSection() {
  const { data } = usePoolManagerRegistry()
  const dynamicPools = (data?.pools || []).filter((pool) => pool.source === 'factory')
  if (!dynamicPools.length) return null
  return (
    <Section>
      <Text fontSize="24px" bold mb="12px">
        Newly discovered pools
      </Text>
      <Text color="textSubtle" mb="16px">
        These pools come from the live SmartChefFactory registry and use the same deposit, withdraw and harvest contract
        methods.
      </Text>
      <Grid>
        {dynamicPools.map((pool) => (
          <DynamicPoolCard key={pool.canonicalId} pool={pool} />
        ))}
      </Grid>
    </Section>
  )
}
