import { CSSProperties, MutableRefObject, useCallback } from 'react'
import { ProfileAvatar, Text } from '@pancakeswap/uikit'
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
  eligiblePids
}: {
  collection: DeserializedNftFarm
  onSelect: (task: string) => void
  isSelected: boolean
  style: CSSProperties
  allowance: boolean
  eligiblePids?: number[]
}) {
  const { account } = useActiveWeb3React()
  const key = collectionKey(collection)
  const balance = collection.userData.tokenBalance.toNumber()
  const collectionData = mintingConfig.find((mintCollection) => mintCollection.stake_pid === collection.pid)
  const isEligible = eligiblePids.includes(collection.pid)
  

  // only show add or remove buttons if not on selected list
  return (
    <MenuItem
      style={style}
      className={`token-item-${key}`}
      onClick={() => (isSelected ? null : onSelect(allowance ? "stake" : "approve"))}
      disabled={balance == 0 || !isEligible} // Disable the item if not eligible
      selected={isSelected}
    >
      <ListLogo logoURI={collectionData ? collectionData.avatar : ""} size={"34px"} />
      <Column>
        <Text bold>{collection.lpSymbol}</Text>
        <Text color="textSubtle" small ellipsis maxWidth="200px">
          {
            !isEligible ? "This collection is not eligible" : // Show message if not eligible
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
  fixedListRef,
  eligiblePids,
}: {
  height: number
  collections: DeserializedNftFarm[]
  selectedCollection?: DeserializedNftFarm | null
  onCurrencySelect: (collection: number, task: string) => void
  allowance: boolean[]
  fixedListRef?: MutableRefObject<FixedSizeList | undefined>
  eligiblePids?: number[]
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
          eligiblePids={eligiblePids}
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
