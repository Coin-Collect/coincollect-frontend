import { useMemo, useRef, useState } from 'react'
import { AddIcon, AutoRenewIcon, Button, Flex, Heading, MinusIcon, Text, useModal } from '@pancakeswap/uikit'
import { BigNumber } from '@ethersproject/bignumber'
import { formatUnits } from '@ethersproject/units'
import Decimal from 'bignumber.js'
import AnimatedValue from 'components/AnimatedValue'
import useAnimatedRewardValue from 'hooks/useAnimatedRewardValue'
import { StyledActionButton } from 'views/NftFarms/components/FarmCard/CardActionsContainer'
import { ActionChipButton, IconButtonWrapper } from 'views/NftFarms/components/FarmCard/StakeAction'
import {
  RewardsPanel,
  RewardsHeader,
  RewardsGrid,
  RewardRow,
  TokenLabel,
  RewardValue,
  RewardTokenIcon,
  HarvestButton,
} from 'views/NftFarms/components/FarmCard/HarvestAction'
import useToast from 'hooks/useToast'
import ConnectWalletButton from 'components/ConnectWalletButton'
import useWeb3React from 'hooks/useWeb3React'
import { useTranslation } from 'contexts/Localization'
import { PublicV2Pool } from '../../publication'
import { ConfirmedV2WriteVerificationError, harvestV2Pool } from '../transactions'
import { notifyV2UserPositionChanged, usePublishedV2UserPosition } from '../hooks'
import type { V2UserPosition } from '../types'
import V2PoolActionModal from './V2PoolActionModal'

function PendingRewardValue({ amount, decimals }: { amount: string; decimals: number }) {
  const { displayValue, isAnimating } = useAnimatedRewardValue(new Decimal(formatUnits(amount, decimals)))
  return <AnimatedValue $animate={isAnimating}>{displayValue}</AnimatedValue>
}

interface V2PoolControlsProps {
  pool: PublicV2Pool
  position?: V2UserPosition
  loading: boolean
  refreshing: boolean
  error?: string
  refresh: () => Promise<V2UserPosition | undefined>
}

export default function V2PoolControls({ pool, position, loading, error, refresh }: V2PoolControlsProps) {
  const { t } = useTranslation()
  const { toastSuccess } = useToast()
  const { account, library } = useWeb3React()
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

  const runHarvest = async () => {
    if (!account || !signer || lock.current) return
    lock.current = true
    setWorking(true)
    setActionError(undefined)
    setNotice(undefined)
    try {
      const transaction = await harvestV2Pool({ signer, poolAddress: pool.address, poolRecord: pool, account })
      toastSuccess(t('Harvested!'), t('Your earnings have been sent to your wallet!'))
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
      <Flex>
        <ConnectWalletButton mt="8px" width="100%" />
      </Flex>
    )
  if (!library || !signer)
    return (
      <Text small color="warning">
        {t('The connected wallet does not provide a transaction signer.')}
      </Text>
    )
  if (loading && !position)
    return (
      <Flex>
        <Button width="100%" disabled>
          <AutoRenewIcon spin mr="8px" />
          {t('Reading wallet position…')}
        </Button>
      </Flex>
    )

  return (
    <Flex flexDirection="column" alignItems="stretch">
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
            <Flex mb="10px" flexDirection="column" style={{ gap: 10 }}>
              <RewardsPanel flexDirection="column" alignItems="flex-start">
                <RewardsHeader>
                  <Text bold textTransform="uppercase" color="secondary" fontSize="12px" pr="4px">
                    {position.rewards.length === 1 ? position.rewards[0]?.symbol : t('REWARDS')}
                  </Text>
                  <Text bold textTransform="uppercase" color="textSubtle" fontSize="12px">
                    {t('Earned')}
                  </Text>
                </RewardsHeader>
                <RewardsGrid>
                  {position.rewards.map((reward) => (
                    <RewardRow
                      key={reward.address}
                      title={reward.estimated ? t('Estimated side payout') : t('Pending reward')}
                    >
                      <TokenLabel>
                        <RewardTokenIcon token={reward.symbol} tokenMeta={reward} />
                        <Text
                          bold
                          color="textSubtle"
                          textTransform="uppercase"
                          fontSize="11px"
                          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {reward.symbol}
                        </Text>
                      </TokenLabel>
                      <RewardValue>
                        <PendingRewardValue amount={reward.amount} decimals={reward.decimals} />
                      </RewardValue>
                    </RewardRow>
                  ))}
                </RewardsGrid>
                <HarvestButton
                  disabled={!canHarvest || working || Boolean(pendingVerification) || refreshPending}
                  onClick={runHarvest}
                >
                  {working ? t('Harvesting') : t('Harvest')}
                </HarvestButton>
              </RewardsPanel>
            </Flex>
          ) : null}
          <Flex flexDirection="column">
            {hasPosition ? (
              <>
                <Text bold textTransform="uppercase" color="secondary" fontSize="12px">
                  {t('Staked NFT Count')}
                </Text>
                <Flex justifyContent="space-between" alignItems="center">
                  <Heading title={`${position.power} power`}>{position.nftCount}</Heading>
                  <IconButtonWrapper>
                    <ActionChipButton
                      variant="tertiary"
                      disabled={working || Boolean(pendingVerification) || refreshPending}
                      onClick={openUnstakeModal}
                    >
                      <MinusIcon width="13px" mr="4px" color="currentColor" />
                      {t('Unstake')}
                    </ActionChipButton>
                    <ActionChipButton
                      $stake
                      variant="tertiary"
                      disabled={displayStatus !== 'ACTIVE' || working || Boolean(pendingVerification) || refreshPending}
                      onClick={openStakeModal}
                    >
                      <AddIcon width="13px" mr="4px" color="currentColor" />
                      {t('Stake More')}
                    </ActionChipButton>
                  </IconButtonWrapper>
                </Flex>
              </>
            ) : (
              <StyledActionButton
                mt="-4px"
                width="100%"
                variant="primary"
                disabled={
                  displayStatus !== 'ACTIVE' ||
                  working ||
                  Boolean(pendingVerification) ||
                  refreshPending ||
                  !position.capacityAvailable
                }
                onClick={openStakeModal}
              >
                {displayStatus === 'UPCOMING' ? t('Upcoming · staking opens when active') : t('Click to Stake Now')}
              </StyledActionButton>
            )}
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
    </Flex>
  )
}

/** Recovery lives in the details drawer, keeping the regular V1 actions unchanged. */
export function V2PoolEmergencyAction({ pool }: { pool: PublicV2Pool }) {
  const { account, chainId, library } = useWeb3React()
  const { t } = useTranslation()
  const user = usePublishedV2UserPosition(pool, account, chainId, library)
  const [open] = useModal(
    <V2PoolActionModal
      pool={pool}
      mode="emergency"
      onSuccess={async () => {
        notifyV2UserPositionChanged()
        const updated = await user.refresh()
        if (!updated) throw new Error('Confirmed; position refresh is pending.')
      }}
    />,
    false,
    false,
    `v2-emergency-${pool.address.toLowerCase()}`,
  )
  return user.position && BigNumber.from(user.position.nftCount).gt(0) ? (
    <Button variant="text" onClick={open}>
      <Text color="failure" small>
        {t('Emergency withdraw all · forfeits rewards')}
      </Text>
    </Button>
  ) : null
}
