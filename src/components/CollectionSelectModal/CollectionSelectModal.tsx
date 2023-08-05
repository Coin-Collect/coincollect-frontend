import { useCallback, useRef, useState } from 'react'
import {
  ModalContainer,
  ModalHeader,
  ModalTitle,
  ModalBackButton,
  ModalCloseButton,
  ModalBody,
  InjectedModalProps,
  Heading,
  Box,
} from '@pancakeswap/uikit'
import styled from 'styled-components'
import usePrevious from 'hooks/usePreviousValue'
import { useTranslation } from 'contexts/Localization'
import { SelectCollectionModalView } from './types'
import CollectionList from './CollectionList'
import { FixedSizeList } from 'react-window'
import { useFarms, useFarmUser } from 'state/nftFarms/hooks'
import { DeserializedNftFarm } from 'state/types'


const StyledModalContainer = styled(ModalContainer)`
  max-width: 420px;
  width: 100%;
`

const StyledModalBody = styled(ModalBody)`
  padding: 24px;
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`

interface CollectionSelectModalProps extends InjectedModalProps {
  selectedCollection?: DeserializedNftFarm | null
  onCollectionSelect: (collection: number, task: string) => void
  pid: number
}

export default function CollectionSelectModal({
  onDismiss = () => null,
  onCollectionSelect,
  selectedCollection,
  pid,
}: CollectionSelectModalProps) {
  const [modalView, setModalView] = useState<SelectCollectionModalView>(SelectCollectionModalView.select)

  
  const { data: nftFarms} = useFarms()
  
  const notToListFarms = ["Starter SHIB", "Bronze SHIB", "Silver SHIB", "Gold SHIB", "Collectors Pool"]
  const collectionPidOrigins = {
                            6 : 1, 
                            7 : 2, 
                            8 : 3, 
                            9 : 4, 
                            10 : 4,
                          }

  const mainNftStakeFarm = nftFarms.filter(
    (farm) => farm.pid == pid
  )

  const communityTokenFarms = nftFarms.filter(
    (farm) => farm.pid <= 4
  )


  const eligibleCollections = [collectionPidOrigins[mainNftStakeFarm[0].pid] ?? mainNftStakeFarm[0].pid, ...mainNftStakeFarm[0]["supportedCollectionPids"]]

  const collectionList = notToListFarms.includes(mainNftStakeFarm[0].lpSymbol) ? [...communityTokenFarms] : [...mainNftStakeFarm, ...communityTokenFarms]

  const { allowance } = useFarmUser(pid)

  // refs for fixed size lists
  const fixedList = useRef<FixedSizeList>()

  const handleCurrencySelect = useCallback(
    (collection: number, task: string) => {
      onDismiss?.()
      onCollectionSelect(collection, task)
    },
    [onDismiss, onCollectionSelect],
  )

  // for token import view
  const prevView = usePrevious(modalView)

  const { t } = useTranslation()

  const config = {
    [SelectCollectionModalView.select]: { title: t('Select Collection'), onBack: undefined },
  }

  return (
    <StyledModalContainer minWidth="320px">
      <ModalHeader>
        <ModalTitle>
          {config[modalView].onBack && <ModalBackButton onBack={config[modalView].onBack} />}
          <Heading>{config[modalView].title}</Heading>
        </ModalTitle>
        <ModalCloseButton onDismiss={onDismiss} />
      </ModalHeader>
      <StyledModalBody>
        <Box margin="12px -12px">
          <CollectionList
            height={280}
            collections={collectionList}
            onCurrencySelect={handleCurrencySelect}
            allowance={allowance}
            fixedListRef={fixedList}
            eligiblePids={eligibleCollections}
          />
        </Box>
      </StyledModalBody>
    </StyledModalContainer>
  )
}
