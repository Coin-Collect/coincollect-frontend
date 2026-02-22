import { CSSProperties, MutableRefObject, useCallback, useMemo, useState } from 'react'
import { LightningIcon, Text, useMatchBreakpoints } from '@pancakeswap/uikit'
import styled from 'styled-components'
import { FixedSizeList } from 'react-window'
import { useTranslation } from 'contexts/Localization'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import Column from '../Layout/Column'
import { RowFixed, RowBetween } from '../Layout/Row'
import CircleLoader from '../Loader/CircleLoader'
import { DeserializedNftFarm } from 'state/types'
import { mintingConfig } from 'config/constants'
import nftFarmsConfig from 'config/constants/nftFarms'


function collectionKey(collection: DeserializedNftFarm): number {
  return collection.pid
}

const COLLECTION_AVATAR_FALLBACK_BY_PID: Record<number, string> = {
  26: '/images/coincollect-assets/partners/cyberpunk/logo300-min.png',
}

const StyledBalanceText = styled(Text)`
  white-space: nowrap;
  overflow: hidden;
  max-width: 5rem;
  text-overflow: ellipsis;
  ${({ theme }) => theme.mediaQueries.sm} {
    max-width: 4.5rem;
  }
`

const CollectionAvatar = styled.img`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`

const ContentColumn = styled(Column)`
  min-width: 0;
`

const CollectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
`

const CollectionTitleText = styled(Text)`
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const PowerText = styled(Text)`
  flex-shrink: 0;
  white-space: nowrap;
`

function Balance({ balance }: { balance: number }) {
  return <StyledBalanceText title={"balance"}>{balance}</StyledBalanceText>
}

const MenuItem = styled(RowBetween)<{ disabled: boolean; selected: boolean }>`
  padding: 4px 12px;
  height: 56px;
  display: grid;
  grid-template-columns: auto minmax(auto, 1fr) minmax(0, 72px);
  grid-gap: 8px;
  ${({ theme }) => theme.mediaQueries.sm} {
    padding: 4px 20px;
  }
  cursor: ${({ disabled }) => !disabled && 'pointer'};
  pointer-events: ${({ disabled }) => disabled && 'none'};
  :hover {
    background-color: ${({ theme, disabled }) => !disabled && theme.colors.background};
  }
  opacity: ${({ disabled, selected }) => (disabled || selected ? 0.5 : 1)};
`

function CollectionRow({
  collection,
  onSelect,
  isSelected,
  style,
  allowance,
  collectionPower,
}: {
  collection: DeserializedNftFarm
  onSelect: (task: string) => void
  isSelected: boolean
  style: CSSProperties
  allowance: boolean
  collectionPower: number
}) {
  const { isXs, isSm } = useMatchBreakpoints()
  const isMobile = isXs || isSm
  const { account } = useActiveWeb3React()
  const key = collectionKey(collection)
  const balance = collection.userData.tokenBalance.toNumber()
  const nftFarmData = nftFarmsConfig.find((nftFarm) => nftFarm.pid === collection.pid)
  const collectionDataByPid = mintingConfig.find((mintCollection) => mintCollection.stake_pid === collection.pid)
  const farmAddr137 = collection?.nftAddresses?.[137]?.toLowerCase()
  const collectionDataByAddress = farmAddr137
    ? mintingConfig.find((mintCollection) => mintCollection.address?.toLowerCase() === farmAddr137)
    : undefined
  const defaultAvatar = collection.pid <= 4 ? '/logo.png' : '/images/nfts/no-profile-md.png'
  const localAvatarFallback = COLLECTION_AVATAR_FALLBACK_BY_PID[collection.pid]
  const avatarCandidates = useMemo(
    () =>
      [
        localAvatarFallback,
        collectionDataByPid?.avatar,
        collectionDataByAddress?.avatar,
        nftFarmData?.avatar,
        nftFarmData?.staticNftImage,
        defaultAvatar,
      ].filter((value): value is string => Boolean(value)),
    [
      collectionDataByAddress?.avatar,
      collectionDataByPid?.avatar,
      defaultAvatar,
      localAvatarFallback,
      nftFarmData?.avatar,
      nftFarmData?.staticNftImage,
    ],
  )
  const [avatarIndex, setAvatarIndex] = useState(0)
  const avatar = avatarCandidates[avatarIndex] ?? defaultAvatar

  const actionText =
    balance === 0
      ? 'Insufficient'
      : allowance
        ? isMobile
          ? 'Tap to Stake'
          : 'Click to Start Staking'
        : isMobile
          ? 'Tap to Enable'
          : 'Click to Enable'

  // only show add or remove buttons if not on selected list
  return (
    <MenuItem
      style={style}
      className={`token-item-${key}`}
      onClick={() => (isSelected ? null : onSelect(allowance ? "stake" : "approve"))}
      disabled={balance == 0} // Disable the item if balance is zero
      selected={isSelected}
    >
      <CollectionAvatar
        src={avatar}
        alt={`${collection.lpSymbol} logo`}
        loading="lazy"
        onError={() => {
          if (avatarIndex < avatarCandidates.length - 1) {
            setAvatarIndex((prev) => prev + 1)
          }
        }}
      />
      <ContentColumn>
        <CollectionTitleRow>
          <CollectionTitleText bold fontSize={isMobile ? '13px' : '14px'} title={collection.lpSymbol.replace('CoinCollect', '')}>
            {collection.lpSymbol.replace('CoinCollect', '')}
          </CollectionTitleText>
          <PowerText bold fontSize={isMobile ? '12px' : '14px'}>
            <LightningIcon />
            {collectionPower}
          </PowerText>
        </CollectionTitleRow>
        <Text color="textSubtle" small ellipsis maxWidth="100%" fontSize={isMobile ? '10px' : '11px'}>
          {actionText}
        </Text>
      </ContentColumn>
      <RowFixed style={{ justifySelf: 'flex-end' }}>
        {balance != null && balance != undefined ? <Balance balance={balance} /> : account ? <CircleLoader /> : null}
      </RowFixed>
    </MenuItem>
  )

}

export default function CollectionList({
  height,
  collections,
  selectedCollection,
  onCurrencySelect,
  allowance,
  collectionPowers,
  fixedListRef,
}: {
  height: number
  collections: DeserializedNftFarm[]
  selectedCollection?: DeserializedNftFarm | null
  onCurrencySelect: (collection: number, task: string) => void
  allowance: boolean[]
  collectionPowers: number[]
  fixedListRef?: MutableRefObject<FixedSizeList | undefined>
}) {

  const { chainId } = useActiveWeb3React()

  const { t } = useTranslation()

  const Row = useCallback(
    ({ data, index, style }) => {
      const collection: DeserializedNftFarm = data[index]
      const isSelected = Boolean(selectedCollection && selectedCollection.pid == collection.pid)
      const handleSelect = (task) => onCurrencySelect(collection.pid, task)


      return (
        <CollectionRow
          style={style}
          collection={collection}
          isSelected={isSelected}
          onSelect={handleSelect}
          allowance={allowance[index]}
          collectionPower={collectionPowers.length > 1 ? collectionPowers[index] : 1}
        />
      )
    },
    [
      chainId,
      onCurrencySelect,
      selectedCollection,
      t,
    ],
  )

  const itemKey = useCallback((index: number, data: any) => collectionKey(data[index]), [])

  return (
    <FixedSizeList
      height={height}
      ref={fixedListRef as any}
      width="100%"
      itemData={collections}
      itemCount={collections.length}
      itemSize={56}
      itemKey={itemKey}
    >
      {Row}
    </FixedSizeList>
  )
}
