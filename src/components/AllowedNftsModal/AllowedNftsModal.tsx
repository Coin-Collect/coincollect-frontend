import {
  ModalContainer,
  ModalHeader,
  ModalTitle,
  ModalCloseButton,
  ModalBody,
  InjectedModalProps,
  Heading,
  Text,
  Flex,
  Message,
  MessageText,
  Link,
  LightningIcon,
} from '@pancakeswap/uikit'
import styled from 'styled-components'
import { useTranslation } from 'contexts/Localization'
import useTheme from 'hooks/useTheme';
import { useMemo } from 'react'



const StyledModalContainer = styled(ModalContainer)`
  max-width: 420px;
  width: calc(100vw - 24px);
  margin: 0 12px;
  box-sizing: border-box;
  ${({ theme }) => theme.mediaQueries.md} {
    width: 100%;
    margin: 0;
    min-width: 500px;
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
export const CollectionAvatar = styled.img`
  display: block;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.8);
`

export const Title = styled.div`
  font-size: 16px;
  margin-bottom: 24px;
  line-height: 110%;
  padding-left: 12px;
  color: ${({ theme }) => theme.colors.textSubtle};
`

const SummaryBar = styled(Flex)`
  margin-top: 10px;
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => `${theme.colors.cardBorder}`};
`

const CollectionGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 8px;
  margin-top: 10px;
  margin-bottom: 12px;
  max-height: none;
  overflow: visible;
  padding: 12px 10px 6px 10px;
`

const CollectionCardLink = styled(Link)`
  display: block;
  flex: 0 0 calc(50% - 4px);
  min-width: 0;
  text-decoration: none;
  color: inherit;
`

const CollectionCard = styled(Flex)`
  position: relative;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  width: 100%;
  min-height: 64px;
  border-radius: 10px;
  padding: 6px 8px;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => `${theme.colors.cardBorder}`};
  transition: border-color 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  }
`

const CollectionTitle = styled(Text)`
  flex: 1;
  min-width: 0;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  white-space: normal;
  word-break: break-word;
`

const MessageTextLink = styled(Link)`
  display: inline;
  text-decoration: underline;
  font-weight: bold;
  font-size: 14px;
  white-space: nowrap;
`

const CoinPower = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 34px;
  justify-content: center;
  color: #333;
  background: linear-gradient(145deg, #fadf76, #f9e8b4, #fadf76);
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: bold;
  z-index: 2;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.3), inset 0 -1px 2px rgba(0, 0, 0, 0.4);
`;




interface AllowedNftsModalProps extends InjectedModalProps {
  nfts: any
}

export default function AllowedNftsModal({
  onDismiss = () => null,
  nfts,
}: AllowedNftsModalProps) {

  const { t } = useTranslation()
  const { theme } = useTheme()
  const sortedNfts = useMemo(
    () => [...nfts].sort((a, b) => (Number(b?.power ?? 0) - Number(a?.power ?? 0))),
    [nfts],
  )
  const highestPower = sortedNfts.length > 0 ? Number(sortedNfts[0]?.power ?? 1) : 1

  return (
    <StyledModalContainer>
      <ModalHeader background={theme.colors.gradients.bubblegum}>
        <ModalTitle>
          <Heading>{t('Allowed NFTs')}</Heading>
        </ModalTitle>
        <ModalCloseButton onDismiss={onDismiss} />
      </ModalHeader>
      <StyledModalBody>

        <Title style={{ marginBottom: '2px' }}>
          {t('Stake NFTs here to earn by ')}
          <LightningIcon width={15} />
          {t('power. ')}
          <MessageTextLink display="inline" fontWeight={700} href="https://docs.coincollect.org/coincollect-nft/nft-powers" target="_blank" color="failure">
            {t('Learn Power')} »
          </MessageTextLink>
        </Title>


        <SummaryBar>
          <Text bold fontSize="13px">
            {t('%count% Collections', { count: sortedNfts.length })}
          </Text>
          <Text fontSize="12px" color="textSubtle">
            {t('Highest power applies:')} <b><LightningIcon width={12} /> {highestPower}</b>
          </Text>
        </SummaryBar>

        <CollectionGrid>
          {sortedNfts.map((avatar, index) => (
            <CollectionCardLink key={`${avatar?.title}-${index}`} href={avatar["link"]} target="_blank">
              <CollectionCard>
                <CollectionAvatar
                  src={avatar["avatar"]}
                  width={44}
                  height={44}
                />
                <CollectionTitle title={avatar["title"]}>{avatar["title"]}</CollectionTitle>
                <CoinPower><LightningIcon width={11} />{sortedNfts.length > 1 ? avatar["power"] : 1}</CoinPower >
              </CollectionCard>
            </CollectionCardLink>
          ))}
        </CollectionGrid>
        <Message variant="warning">
          <MessageText>{t('Daily rewards use the highest-power NFT in this pool.')}</MessageText>
        </Message>
      </StyledModalBody>
    </StyledModalContainer>
  )
}
