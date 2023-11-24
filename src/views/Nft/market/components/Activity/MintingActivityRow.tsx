import {
  Box,
  Flex,
  Text,
  Td,
  IconButton,
  Link,
  OpenNewIcon,
  useMatchBreakpoints,
  useModal,
  Skeleton,
} from '@pancakeswap/uikit'
import { NextLinkFromReactRouter } from 'components/NextLink'
import { MintingActivity, NftToken } from 'state/nftMarket/types'
import { Price } from '@coincollect/sdk'
import { getPolygonScanLink, isAddress } from 'utils'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import ProfileCell from 'views/Nft/market/components/ProfileCell'
import MobileModal from './MobileModal'
import ActivityPrice from './ActivityPrice'
import ActivityEventText from './ActivityEventText'
import { nftsBaseUrl, pancakeBunniesAddress } from '../../constants'
import NFTMedia from '../NFTMedia'
import truncateHash from 'utils/truncateHash'

interface MintingActivityRowProps {
  activity: MintingActivity
  isUserActivity?: boolean
  isNftActivity?: boolean
}

const MintingActivityRow: React.FC<MintingActivityRowProps> = ({
  activity,
  isUserActivity = false,
  isNftActivity = false,
}) => {
  const { chainId } = useActiveWeb3React()
  const { isXs, isSm } = useMatchBreakpoints()
  const localeTimestamp = new Date(activity.timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })
  

  return (
    <tr {...((isXs || isSm) && { onClick: null })} data-test="nft-activity-row">
      {!isNftActivity ? (
        <Td
          {...((isXs || isSm) && {
            onClick: (event) => {
              event.stopPropagation()
            },
          })}
        >
          <Flex justifyContent="flex-start" alignItems="center" flexDirection={['column', null, 'row']}>
            {
              <>
                <NextLinkFromReactRouter to={`${nftsBaseUrl}/collections/${activity.address}`}>
                  <Flex flexDirection="column">
                    <Text
                      as={NextLinkFromReactRouter}
                      to={`${nftsBaseUrl}/collections/mint/${isAddress(activity.address)}`}
                      textAlign={['center', null, 'left']}
                      color="textSubtle"
                      fontSize="14px"
                    >
                      {activity.asset}
                    </Text>
                    <Text
                      as={NextLinkFromReactRouter}
                      to={`${nftsBaseUrl}/collections/mint/${isAddress(activity.address)}`}
                      textAlign={['center', null, 'left']}
                      bold
                    >
                      #{activity.tokenId}
                    </Text>
                  </Flex>
                </NextLinkFromReactRouter>
              </>
            }
          </Flex>
        </Td>
      ) : null}
      <Td>
        <Flex alignItems="center" justifyContent="flex-end">
          <Text color="success">
              {activity.marketEvent}
          </Text>
        </Flex>
      </Td>
      {isXs || isSm ? null : (
        <>
          {isUserActivity ? (
            <Td>
              <Flex justifyContent="center" alignItems="center">
                {activity.address ? <ProfileCell accountAddress={activity.address} /> : '-'}
              </Flex>
            </Td>
          ) : (
            <>
              <Td>
                <Flex justifyContent="center" alignItems="center">
                  <Link external href={ getPolygonScanLink(activity.from, 'address', chainId.toString()) }>
                      <Box display="inline">
                        <Text lineHeight="1.25">{truncateHash(activity.from)}</Text>
                      </Box>
                  </Link>
                </Flex>
              </Td>
              <Td>
                <Flex justifyContent="center" alignItems="center">
                  <Link external href={ getPolygonScanLink(activity.to, 'address', chainId.toString()) }>
                        <Box display="inline">
                          <Text lineHeight="1.25">{truncateHash(activity.to)}</Text>
                        </Box>
                  </Link>
                </Flex>
              </Td>
            </>
          )}
        </>
      )}
      <Td>
        <Flex justifyContent="center">
          <Text textAlign="center" fontSize={isXs || isSm ? '12px' : '16px'}>
            {localeTimestamp}
          </Text>
        </Flex>
      </Td>
      {isXs || isSm ? null : (
        <Td>
          <IconButton as={Link} external href={getPolygonScanLink(activity.tx, 'transaction', chainId.toString())}>
            <OpenNewIcon color="textSubtle" width="18px" />
          </IconButton>
        </Td>
      )}
    </tr>
  )
}

export default MintingActivityRow
