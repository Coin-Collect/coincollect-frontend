import { useMemo, useRef, useState } from 'react'
import { AddIcon, AutoRenewIcon, Button, Flex, MinusIcon, Text, useModal } from '@pancakeswap/uikit'
import { BigNumber } from '@ethersproject/bignumber'
import styled from 'styled-components'
import ConnectWalletButton from 'components/ConnectWalletButton'
import useWeb3React from 'hooks/useWeb3React'
import { useTranslation } from 'contexts/Localization'
import { PublicV2Pool } from '../../publication'
import { ConfirmedV2WriteVerificationError, harvestV2Pool } from '../transactions'
import { notifyV2UserPositionChanged } from '../hooks'
import type { V2UserPosition } from '../types'
import V2PoolActionModal, { V2PoolActionMode } from './V2PoolActionModal'

const ActionRow = styled(Flex)`
  width: 100%;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;

  & > button {
    flex: 1 1 110px;
  }
`

const PositionSummary = styled.div`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 12px;
  margin-bottom: 10px;
  background: ${({ theme }) => theme.colors.background};
`

interface V2PoolControlsProps {
  pool: PublicV2Pool
  position?: V2UserPosition
  loading: boolean
  refreshing: boolean
  error?: string
  refresh: () => Promise<V2UserPosition | undefined>
}

export default function V2PoolControls({ pool, position, loading, refreshing, error, refresh }: V2PoolControlsProps) {
  const { t } = useTranslation()
  const { account, chainId, library } = useWeb3React()
  const [working, setWorking] = useState(false)
  const [actionError, setActionError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [pendingVerification, setPendingVerification] = useState<ConfirmedV2WriteVerificationError>()
  const [refreshPending, setRefreshPending] = useState(false)
  const lock = useRef(false)
  const signer = useMemo(() => (account && library ? library.getSigner(account) : undefined), [account, library])

  const afterConfirmed = async () => {
    notifyV2UserPositionChanged()
    try {
      const updated = await refresh()
      if (!updated) throw new Error('Position data is not available yet.')
      setRefreshPending(false)
    } catch {
      setRefreshPending(true)
      setNotice(t('Transaction confirmed; position refresh is pending. Do not submit it again.'))
    }
  }

  const modalProps = {
    pool,
    onSuccess: afterConfirmed,
  }
  const [openStakeModal] = useModal(
    <V2PoolActionModal {...modalProps} mode="stake" />,
    false,
    false,
    `v2-stake-${pool.address.toLowerCase()}`,
  )
  const [openUnstakeModal] = useModal(
    <V2PoolActionModal {...modalProps} mode="unstake" />,
    false,
    false,
    `v2-unstake-${pool.address.toLowerCase()}`,
  )
  const [openEmergencyModal] = useModal(
    <V2PoolActionModal {...modalProps} mode="emergency" />,
    false,
    false,
    `v2-emergency-${pool.address.toLowerCase()}`,
  )

  const runHarvest = async () => {
    if (!account || !signer || lock.current) return
    lock.current = true
    setWorking(true)
    setActionError(undefined)
    setNotice(undefined)
    try {
      const transaction = await harvestV2Pool({ signer, poolAddress: pool.address, poolRecord: pool, account })
      setNotice(`${t('Harvest confirmed')} · ${transaction.transactionHash.slice(0, 10)}…`)
      await afterConfirmed()
    } catch (cause) {
      if (cause instanceof ConfirmedV2WriteVerificationError) {
        setPendingVerification(cause)
        setActionError(undefined)
        setNotice(`${cause.message} Do not submit this transaction again.`)
        notifyV2UserPositionChanged()
      } else {
        setActionError(cause instanceof Error ? cause.message : String(cause))
      }
    } finally {
      lock.current = false
      setWorking(false)
    }
  }

  const retryConfirmedVerification = async () => {
    if ((!pendingVerification && !refreshPending) || lock.current) return
    lock.current = true
    setWorking(true)
    setActionError(undefined)
    try {
      if (pendingVerification) await pendingVerification.verifyAgain()
      const updated = await refresh()
      if (!updated) throw new Error('Position data is not available yet.')
      setPendingVerification(undefined)
      setRefreshPending(false)
      setNotice(t('Confirmed transaction and on-chain wallet state are now verified.'))
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      lock.current = false
      setWorking(false)
    }
  }

  const hasPosition = Boolean(position && BigNumber.from(position.nftCount).gt(0))
  const canHarvest = Boolean(position && BigNumber.from(position.pendingPrimary).gt(0))
  const displayStatus = position?.status || pool.snapshot.status

  if (!account)
    return (
      <ActionRow>
        <ConnectWalletButton mt="8px" width="100%" />
      </ActionRow>
    )
  if (!library || !signer)
    return (
      <Text small color="warning">
        {t('The connected wallet does not provide a transaction signer.')}
      </Text>
    )
  if (loading && !position)
    return (
      <ActionRow>
        <Button width="100%" disabled>
          <AutoRenewIcon spin mr="8px" />
          {t('Reading wallet position…')}
        </Button>
      </ActionRow>
    )

  return (
    <ActionRow flexDirection="column" alignItems="stretch">
      {error ? (
        <>
          <Text small role="alert" color="failure">
            {error}
          </Text>
          <Button variant="secondary" disabled={refreshing} onClick={() => refresh()}>
            {refreshing ? <AutoRenewIcon spin /> : t('Retry wallet position read')}
          </Button>
          <Text small color="textSubtle">
            {position
              ? t(
                  'Showing the last verified wallet position from block {{block}}. Actions are paused until fresh chain reads succeed.',
                  { block: position.blockNumber },
                )
              : t('Actions are paused until the connected network, pool config and position can be verified.')}
          </Text>
        </>
      ) : position ? (
        <>
          {hasPosition ? (
            <PositionSummary>
              <Flex justifyContent="space-between" alignItems="center">
                <Text bold>
                  {position.nftCount} {t('NFTs staked')}
                </Text>
                <Text bold>
                  {position.power} {t('power')}
                </Text>
              </Flex>
              <Text small color="textSubtle" mt="4px">
                {t('Primary pending')}: {position.rewards[0]?.symbol || '—'}
              </Text>
            </PositionSummary>
          ) : null}
          <Flex flexDirection="column" style={{ gap: 8 }}>
            {canHarvest ? (
              <Button
                variant="secondary"
                disabled={working || Boolean(pendingVerification) || refreshPending}
                onClick={runHarvest}
              >
                {working ? <AutoRenewIcon spin mr="6px" /> : null}
                {t('Harvest rewards')}
              </Button>
            ) : null}
            {displayStatus === 'ACTIVE' ? (
              hasPosition ? (
                <ActionRow>
                  <Button
                    variant="secondary"
                    disabled={working || Boolean(pendingVerification) || refreshPending}
                    onClick={openUnstakeModal}
                  >
                    <MinusIcon width="13px" mr="4px" />
                    {t('Unstake')}
                  </Button>
                  <Button disabled={working || Boolean(pendingVerification) || refreshPending} onClick={openStakeModal}>
                    <AddIcon width="13px" mr="4px" />
                    {t('Stake more')}
                  </Button>
                </ActionRow>
              ) : (
                <Button
                  disabled={working || Boolean(pendingVerification) || refreshPending || !position.capacityAvailable}
                  onClick={openStakeModal}
                >
                  {t('Stake NFT')}
                </Button>
              )
            ) : hasPosition ? (
              <Button
                variant="secondary"
                disabled={working || Boolean(pendingVerification) || refreshPending}
                onClick={openUnstakeModal}
              >
                {t('Withdraw staked NFTs')}
              </Button>
            ) : (
              <Button disabled>
                {t(displayStatus === 'UPCOMING' ? 'Upcoming · staking opens when active' : 'Finished')}
              </Button>
            )}
            {hasPosition ? (
              <Button
                variant="text"
                disabled={working || Boolean(pendingVerification) || refreshPending}
                onClick={openEmergencyModal}
              >
                <Text color="failure" small>
                  {t('Emergency withdraw all · forfeits rewards')}
                </Text>
              </Button>
            ) : null}
          </Flex>
        </>
      ) : (
        <Text small color="failure" role="alert">
          {t('Wallet position is not available. Refresh before continuing.')}
        </Text>
      )}
      {actionError ? (
        <Text small role="alert" color="failure">
          {actionError}
        </Text>
      ) : null}
      {notice ? (
        <Text small role="status" color="success">
          {notice}
        </Text>
      ) : null}
      {pendingVerification || refreshPending ? (
        <Button variant="secondary" disabled={working} onClick={retryConfirmedVerification}>
          {working ? <AutoRenewIcon spin mr="6px" /> : null}
          {t('Retry on-chain verification — do not resend transaction')}
        </Button>
      ) : null}
      {refreshing && !working ? (
        <Text small color="textSubtle">
          {t('Refreshing on-chain position…')}
        </Text>
      ) : null}
    </ActionRow>
  )
}
