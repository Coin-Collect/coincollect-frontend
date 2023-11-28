import {
  Box,
  Button,
  Flex,
  Table,
  Text,
  Th,
  useMatchBreakpoints,
} from '@pancakeswap/uikit'
import Container from 'components/Layout/Container'
import TableLoader from 'components/TableLoader'
import { Collection } from 'state/nftMarket/types'
import { useTranslation } from 'contexts/Localization'
import useTheme from 'hooks/useTheme'
import useLastUpdated from 'hooks/useLastUpdated'
import { useMintingActivity } from 'state/nftMarket/hooks'
import NoNftsImage from '../components/Activity/NoNftsImage'
import MintingActivityRow from '../components/Activity/MintingActivityRow'
import { getPolygonScanLink } from 'utils'
import useToast from 'hooks/useToast'
import { ToastDescriptionWithTx } from 'components/Toast'
import { useEffect } from 'react'
import { formatDistance, formatDistanceToNowStrict, parseISO } from 'date-fns'


interface ActivityHistoryProps {
  collectionAddress: string
}

const ActivityHistoryMinting: React.FC<ActivityHistoryProps> = ({ collectionAddress }) => {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const { isXs, isSm } = useMatchBreakpoints()
  const { toastSuccess } = useToast()

  const { activities, isLoading, error, refresh } = useMintingActivity(collectionAddress.toLowerCase())
  
  useEffect(() => {
    if(activities.length > 0) {
      // Using setTimeout to delay the execution of toastSuccess by 30 seconds
      // TODO: Use lodash/delay
      const timeoutId = setTimeout(() => {
        const dateCreated = formatDistanceToNowStrict(parseISO(activities[0].timestamp), { addSuffix: true });
        toastSuccess(
          `${t('🎉 New NFT Alert!')}`,
          <ToastDescriptionWithTx txHash={activities[0].tx}>
            {t(`${activities[0].asset} NFT minted ${dateCreated}`)}
          </ToastDescriptionWithTx>,
        );
      }, 20000); // 20 seconds in milliseconds

      // Clear the timeout
      return () => clearTimeout(timeoutId);
    }
  },[activities.length])

  
  return (
    <Box py="32px">
      <Container style={{ overflowX: 'auto' }}>
        {activities.length === 0 &&
        !isLoading ? (
          <Flex p="24px" flexDirection="column" alignItems="center">
            <NoNftsImage />
            <Text pt="8px" bold>
              {t('No NFT market history found')}
            </Text>
          </Flex>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th textAlign={['center', null, 'left']}> {t('Item')}</Th>
                  <Th textAlign="right"> {t('Event')}</Th>
                  {isXs || isSm ? null : (
                    <>
                      <Th textAlign="center"> {t('From')}</Th>
                      <Th textAlign="center"> {t('To')}</Th>
                    </>
                  )}
                  <Th textAlign="center"> {t('Date')}</Th>
                  {isXs || isSm ? null : <Th />}
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <TableLoader />
                ) : (
                  activities.map((activity) => {
                    return (
                      <MintingActivityRow
                        key={`${activity.marketEvent}#${activity.tokenId}#${activity.timestamp}#${activity.tx}`}
                        activity={activity}
                      />
                    )
                  })
                )}
              </tbody>
            </Table>
            <Flex
              borderTop={`1px ${theme.colors.cardBorder} solid`}
              pt="24px"
              flexDirection="row"
              justifyContent="center"
              height="100%"
            >
            <Button
            as="a"
            external 
            href={ getPolygonScanLink(collectionAddress, 'token', "137") }
            scale="sm"
            disabled={isLoading}
          >
            {t('See All')}
          </Button>

            </Flex>
          </>
        )}
      </Container>
    </Box>
  )
}

export default ActivityHistoryMinting
