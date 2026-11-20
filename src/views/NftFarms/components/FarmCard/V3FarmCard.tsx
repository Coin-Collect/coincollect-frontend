import { useCallback, useMemo, useState } from 'react'
import { AutoRenewIcon, Button, Flex, Text } from '@pancakeswap/uikit'
import BigNumber from 'bignumber.js'
import { useAccount } from 'wagmi'
import { mintingConfig } from 'config/constants'
import nftFarmsConfig from 'config/constants/nftFarms'
import ConnectWalletButton from 'components/ConnectWalletButton'
import FlexLayout from 'components/Layout/Flex'
import useNearViewport from 'hooks/useNearViewport'
import { useTranslation } from 'contexts/Localization'
import {
  dailyTarget,
  poolTiming,
  shortAmount,
  sourceName,
  type V3PoolCardProps,
} from 'features/universalRewards/presentation'
import type { V3CatalogueCardsProps } from 'features/universalRewards/V3Catalogue'
import CardHeadingWithBanner from './CardHeadingWithBanner'
import { NftFarmCardLayout } from './FarmCard'
import { Action, StyledActionButton } from './CardActionsContainer'
import { FarmCardEarned, FarmCardStakedPosition } from './PositionPanels'
import { useV3Action, useV3Query, useV3Wallet } from 'features/universalRewards/hooks'
import { readV3CardPosition } from 'features/universalRewards/reader'
import { createV3Client } from 'features/universalRewards/runtime'
import { manageV3Position } from 'features/universalRewards/transactions'
import { V3Button } from 'features/universalRewards/styles'
import V3NftActionModal, { type V3NftActionMode } from './V3NftActionModal'

export function V3FarmCardGrid({ pools, deployment, onPositionChange }: V3CatalogueCardsProps) {
  return (
    <FlexLayout>
      {pools.map((pool) => (
        <V3FarmCard
          key={pool.poolId.toString()}
          pool={pool}
          deployment={deployment}
          onPositionChange={onPositionChange}
        />
      ))}
    </FlexLayout>
  )
}

export default function V3FarmCard({
  pool,
  deployment,
  detail = false,
  preview = false,
  onPositionChange,
}: V3PoolCardProps & { preview?: boolean }) {
  const { address, chainId } = useAccount()
  const { t } = useTranslation()
  const [modal, setModal] = useState<{ mode: V3NftActionMode; account: typeof address }>()
  const client = useMemo(createV3Client, [])
  const getWallet = useV3Wallet(deployment.chainId)
  const { ref: cardRef, isNearViewport } = useNearViewport<HTMLDivElement>()
  const timing = poolTiming(pool)
  const finished = timing === 'Finished'
  const status = timing === 'Live' ? 'ACTIVE' : finished ? 'FINISHED' : 'UPCOMING'
  const poolUrl = `/nftpools/v3/${pool.poolId}`
  const contractLink =
    deployment.chainId === 137 ? `https://polygonscan.com/address/${deployment.address}` : `${poolUrl}#contract`

  const collections = useMemo(
    () =>
      pool.collections.map((rule) => {
        const polygon = rule.sourceChainId === BigInt(137)
        const collectionAddress = rule.collection.toLowerCase()
        const farm = polygon
          ? nftFarmsConfig.find((item) => item.nftAddresses?.[137]?.toLowerCase() === collectionAddress)
          : undefined
        const minting = polygon
          ? mintingConfig.find((item) => item.address?.toLowerCase() === collectionAddress)
          : undefined
        const link =
          polygon && deployment.chainId === 137 ? `/nfts/collections/${rule.collection}` : `${poolUrl}#eligible-nfts`
        return {
          name: farm?.lpSymbol || `${sourceName(rule.sourceChainId)} · ${rule.collection.slice(0, 8)}…`,
          image: minting?.avatar || farm?.avatar,
          weight: String(rule.weight),
          link,
          farm,
          minting,
        }
      }),
    [pool.collections, deployment.chainId, poolUrl],
  )
  const primary = collections[0]
  const projectLink = primary?.farm?.projectLink
  const rewardChips = pool.rewards.map((reward, index) => ({
    token: reward.symbol,
    amount: shortAmount(dailyTarget(pool, reward), reward.decimals),
    primary: index === 0,
    tokenMeta: { address: reward.token, symbol: reward.symbol },
  }))

  const loadPosition = useCallback(() => {
    if (!address) throw new Error('Connect your wallet to read your position.')
    return readV3CardPosition(client, deployment, pool, address)
  }, [client, deployment, pool, address])
  const positionKey = address ? `${deployment.chainId}:${deployment.address}:${pool.poolId}:${address}` : ''
  const position = useV3Query(!preview && (detail || isNearViewport) ? positionKey : '', loadPosition, 30_000)
  const action = useV3Action(client, deployment, getWallet, address)
  const walletPosition = position.data
  const count = walletPosition?.count ?? 0
  const claimableNfts = walletPosition?.claimableNfts ?? []
  const hasPosition = count > 0 || claimableNfts.length > 0
  const actionPending = action.busy || action.unconfirmed
  const canStake =
    status === 'ACTIVE' &&
    count < pool.config.maxNftsPerWallet &&
    (count > 0 || pool.activeWallets < pool.config.maxWallets) &&
    pool.activeNfts < BigInt(32) &&
    !actionPending

  const openStaking = () => setModal({ mode: 'stake', account: address })
  const openUnstaking = () => setModal({ mode: 'unstake', account: address })
  const refreshPosition = () => {
    position.refresh()
    onPositionChange?.()
  }
  const harvest = async () => {
    if (claimableNfts.length !== 1 || chainId !== deployment.chainId || !getWallet) {
      setModal({ mode: 'harvest', account: address })
      return
    }
    if (await action.run(manageV3Position(deployment, pool.poolId, claimableNfts[0], 'claim'))) refreshPosition()
  }

  return (
    <NftFarmCardLayout
      cardRef={cardRef}
      variant={detail || preview ? 'expanded' : 'default'}
      finished={finished}
      mainLink={projectLink?.mainLink || 'https://coincollect.org'}
      mainLinkLabel={projectLink?.mainLink ? undefined : t('CoinCollect website')}
      mintLink={projectLink?.getNftLink || `${poolUrl}#eligible-nfts`}
      mintLinkLabel={projectLink?.getNftLink ? undefined : t('View eligible NFTs')}
      contractLink={contractLink}
      contractLinkLabel={deployment.chainId === 137 ? undefined : t('View settlement contract')}
      rewards={
        finished || hasPosition
          ? undefined
          : {
              chips: rewardChips,
              note: t(
                'Pool-wide daily target at full rate. Your share depends on NFT power, participation and available rewards.',
              ),
            }
      }
      heading={() => (
        <CardHeadingWithBanner
          lpLabel={pool.presentation.name}
          headingLevel={detail ? 'h1' : 'h3'}
          isCommunity={primary?.farm?.isCommunity ?? true}
          poolPageUrl={poolUrl}
          publishedPool={{
            banner: pool.presentation.artwork || primary?.farm?.banner || primary?.minting?.banner?.small,
            status,
            collections,
          }}
        />
      )}
      details={{
        totalStaked: new BigNumber(pool.activeNfts.toString()),
        lpLabel: pool.presentation.name,
        removed: finished,
        isFinished: finished,
        bscScanAddress: contractLink,
        addLiquidityUrl: primary?.link,
        earningToken: deployment.chainId === 137 && pool.rewards[0] ? { address: pool.rewards[0].token } : undefined,
        tokenInfoUrl: deployment.chainId !== 137 && pool.rewards[0] ? `${poolUrl}#contract` : undefined,
        projectLink: {
          mainLink: projectLink?.mainLink || 'https://coincollect.org',
          getNftLink: projectLink?.getNftLink,
        },
        timestampSchedule: {
          status,
          timestamp: Number(pool.timestamp),
          target: Number(status === 'UPCOMING' ? pool.config.start : pool.config.end),
        },
      }}
    >
      <Action>
        {preview ? (
          <V3Button as="a" $secondary href={poolUrl}>
            {t('Open pool page')}
          </V3Button>
        ) : !address ? (
          <Flex>
            <ConnectWalletButton mt="8px" width="100%" />
          </Flex>
        ) : position.error ? (
          <Flex flexDirection="column">
            <Text small color="failure" role="alert">
              {position.error}
            </Text>
            <Button variant="secondary" onClick={position.refresh}>
              {t('Retry wallet position read')}
            </Button>
          </Flex>
        ) : !walletPosition ? (
          <Flex>
            <Button width="100%" disabled>
              <AutoRenewIcon spin mr="8px" />
              {t('Reading wallet position…')}
            </Button>
          </Flex>
        ) : (
          <Flex flexDirection="column" alignItems="stretch">
            {hasPosition && (
              <FarmCardEarned
                rewards={pool.rewards.map((reward, index) => ({
                  address: reward.token,
                  symbol: reward.symbol,
                  decimals: reward.decimals,
                  amount: walletPosition.amounts[index].toString(),
                }))}
                canHarvest={claimableNfts.length > 0 && !actionPending}
                harvesting={action.busy}
                onHarvest={() => void harvest()}
              />
            )}
            {count > 0 ? (
              <FarmCardStakedPosition
                count={String(count)}
                power={String(walletPosition.power)}
                canUnstake={!actionPending}
                canStakeMore={canStake}
                onUnstake={openUnstaking}
                onStakeMore={openStaking}
              />
            ) : (
              <StyledActionButton mt="-4px" width="100%" variant="primary" disabled={!canStake} onClick={openStaking}>
                {status === 'UPCOMING' ? t('Upcoming · staking opens when active') : t('Click to Stake Now')}
              </StyledActionButton>
            )}
            {action.error && (
              <Text small role="alert" color="failure">
                {action.error}
              </Text>
            )}
            {action.message && (
              <Text small role="status">
                {action.message}
              </Text>
            )}
            {action.unconfirmed && (
              <Button
                variant="secondary"
                disabled={action.busy}
                onClick={async () => {
                  if (await action.recheck()) refreshPosition()
                }}
              >
                {t('Retry on-chain verification — do not resend transaction')}
              </Button>
            )}
          </Flex>
        )}
      </Action>
      {address && modal && address === modal.account && (
        <V3NftActionModal
          mode={modal.mode}
          client={client}
          deployment={deployment}
          pool={pool}
          collections={collections}
          account={address}
          action={action}
          onSuccess={refreshPosition}
          onDismiss={() => setModal(undefined)}
        />
      )}
    </NftFarmCardLayout>
  )
}
