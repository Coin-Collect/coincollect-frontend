import { CSSProperties, MutableRefObject, useCallback } from 'react'
import { LightningIcon, ProfileAvatar, Text } from '@pancakeswap/uikit'
import styled from 'styled-components'
import { FixedSizeList } from 'react-window'
import { useTranslation } from 'contexts/Localization'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import Column from '../Layout/Column'
import { RowFixed, RowBetween } from '../Layout/Row'
import { ListLogo } from '../Logo'
import CircleLoader from '../Loader/CircleLoader'
import { DeserializedNftFarm } from 'state/types'
import { mintingConfig } from 'config/constants'
import nftFarmsConfig from 'config/constants/nftFarms'


function collectionKey(collection: DeserializedNftFarm): number {
  return collection.pid
}

const StyledBalanceText = styled(Text)`
  white-space: nowrap;
  overflow: hidden;
  max-width: 5rem;
  text-overflow: ellipsis;
`

export const CollectionAvatar = styled(ProfileAvatar)`
  left: 0;
  position: absolute;
  top: -32px;
  border: 4px white solid;
`

function Balance({ balance }: { balance: number }) {
  return <StyledBalanceText title={"balance"}>{balance}</StyledBalanceText>
}

const MenuItem = styled(RowBetween)<{ disabled: boolean; selected: boolean }>`
  padding: 4px 20px;
  height: 56px;
  display: grid;
  grid-template-columns: auto minmax(auto, 1fr) minmax(0, 72px);
  grid-gap: 8px;
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
  const avatar = nftFarmData?.["avatar"] ?? collectionDataByPid?.avatar ?? collectionDataByAddress?.avatar ?? defaultAvatar
  

  // only show add or remove buttons if not on selected list
  return (
    <MenuItem
      style={style}
      className={`token-item-${key}`}
      onClick={() => (isSelected ? null : onSelect(allowance ? "stake" : "approve"))}
      disabled={balance == 0} // Disable the item if balance is zero
      selected={isSelected}
    >
      <ListLogo logoURI={avatar} size={"34px"} />
      <Column>
        <Text bold>{collection.lpSymbol.replace("CoinCollect","")} <LightningIcon/>{collectionPower}</Text>
        <Text color="textSubtle" small ellipsis maxWidth="200px">
          {
            balance === 0 ? "Insufficient balance" :
            allowance ? "Click to Start Staking" : "Click to Enable"
          }
        </Text>
      </Column>
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
