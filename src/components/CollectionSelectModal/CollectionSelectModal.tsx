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
  LightningIcon,
  Link,
  Flex,
  Message,
  MessageText,
} from '@pancakeswap/uikit'
import styled from 'styled-components'
import usePrevious from 'hooks/usePreviousValue'
import { useTranslation } from 'contexts/Localization'
import { SelectCollectionModalView } from './types'
import CollectionList from './CollectionList'
import { FixedSizeList } from 'react-window'
import { useFarms, useFarmUser } from 'state/nftFarms/hooks'
import { DeserializedNftFarm } from 'state/types'
import useTheme from 'hooks/useTheme'


const StyledModalContainer = styled(ModalContainer)`
  max-width: 420px;
  width: calc(100vw - 24px);
  margin: 0 12px;
  box-sizing: border-box;
  ${({ theme }) => theme.mediaQueries.md} {
    width: 100%;
    margin: 0;
    min-width: 600px;
  }
`;

const StyledModalBody = styled(ModalBody)`
  padding: 24px;
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`

export const Title = styled.div`
  font-size: 16px;
  margin-bottom: 24px;
  line-height: 110%;
  padding-left: 12px;
  color: ${({ theme }) => theme.colors.textSubtle};
`

const Wrapper = styled(Flex)`
  margin-top: 24px;
  margin-bottom: 24px;
  padding: 5px 0px;
  background: ${props => props.theme.colors.background};
  border-radius: 16px;
`;

const MessageTextLink = styled(Link)`
  display: inline;
  text-decoration: underline;
  font-weight: bold;
  font-size: 14px;
  white-space: nowrap;
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


  const { data: nftFarms } = useFarms()

  const mainNftStakeFarm = nftFarms.filter(
    (farm) => farm.pid == pid
  )

  // This expression is used to access the avatar and other information of the main NFT of the pool.
  // Todo: In the future, I plan to add the mainNftPid value to supportedNfts.
  //const mainNftStakeFarmReplaced = notToListFarms.includes(mainNftStakeFarm[0].lpSymbol) ? nftFarms.filter((farm) => farm.pid == collectionPidOrigins[mainNftStakeFarm[0].pid]) : null
  const mainNftStakeFarmReplaced = nftFarms.find((nftFarm) => nftFarm.nftAddresses?.[137] === mainNftStakeFarm[0].nftAddresses?.[137])


  const supportedCollectionPids = mainNftStakeFarm[0]["supportedCollectionPids"]
  const supportedNftStakeFarms = supportedCollectionPids
  .map(pid => nftFarms.find(farm => farm.pid === pid))
  .filter(farm => farm !== undefined);


  const collectionList = [mainNftStakeFarmReplaced, ...supportedNftStakeFarms]

  // Todo: Duplicate with CardHeadingWithBanner
  const collectionPowers = mainNftStakeFarm[0]["collectionPowers"] ?? collectionList.map((collection) => {
    switch (collection.pid) {
      case 1:
        return 1;
      case 2:
        return 3;
      case 3:
        return 6;
      case 4:
        return 12;
      default:
        return 15;
    }
  })

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
  const { theme } = useTheme()

  const config = {
    [SelectCollectionModalView.select]: { title: t(`Select from ${collectionList.length} collection`), onBack: undefined },
  }

  return (
    <StyledModalContainer>
      <ModalHeader background={theme.colors.gradients.bubblegum}>
        <ModalTitle>
          <Heading>{config[modalView].title}</Heading>
        </ModalTitle>
        <ModalCloseButton onDismiss={onDismiss} />
      </ModalHeader>
      <StyledModalBody>
        <Title style={{ marginBottom: '2px' }}>
          {t('Stake eligible NFTs in this pool to earn rewards based on their ')}
          <LightningIcon width={15} />
          {t('earning power. ')}
          <MessageTextLink display="inline" fontWeight={700} href="https://docs.coincollect.org/coincollect-nft/nft-powers" target="_blank" color="failure">
            {t('Discover NFT Power')} »
          </MessageTextLink>
        </Title>
        <Wrapper>
          <CollectionList
            height={245}
            collections={collectionList}
            onCurrencySelect={handleCurrencySelect}
            allowance={allowance}
            collectionPowers={collectionPowers}
            fixedListRef={fixedList}
          />
        </Wrapper>
        <Message variant="warning">
          <MessageText>{t('Daily earnings are calculated based on the NFT with the highest earning power in the pool.')}</MessageText>
        </Message>
      </StyledModalBody>
    </StyledModalContainer>
  )
}
