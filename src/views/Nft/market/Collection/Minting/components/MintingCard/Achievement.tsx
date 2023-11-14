import styled from 'styled-components'
import {
  Flex,
  LanguageIcon,
  SvgProps,
  Svg,
  TwitterIcon,
  Link,
  TelegramIcon,
  DiscordIcon,
  OpenSeaIcon,
  CmcIcon,
} from '@pancakeswap/uikit'

import { useTranslation } from 'contexts/Localization'
import { PublicIfoData } from '../../types'
import { Minting } from 'config/constants/types'
import { getPolygonScanLink } from 'utils'
import { FlexGap } from 'components/Layout/Flex'

const SmartContractIcon: React.FC<SvgProps> = (props) => {
  return (
    <Svg viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M10.037 6a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5zM9.287 9.75a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM10.037 12a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.287 4a2 2 0 012-2h13a2 2 0 012 2v15c0 1.66-1.34 3-3 3h-14c-1.66 0-3-1.34-3-3v-2c0-.55.45-1 1-1h2V4zm0 16h11v-2h-12v1c0 .55.45 1 1 1zm14 0c.55 0 1-.45 1-1V4h-13v12h10c.55 0 1 .45 1 1v2c0 .55.45 1 1 1z"
      />
    </Svg>
  )
}


interface Props {
  ifo: Minting
  publicIfoData: PublicIfoData
}

const Container = styled(Flex)`
  justify-content: space-between;
  flex-direction: column;
  align-items: center;
  text-align: left;
  gap: 16px;

  ${({ theme }) => theme.mediaQueries.md} {
    flex-direction: row;
    align-items: initial;
  }
`

const IfoAchievement: React.FC<Props> = ({ ifo, publicIfoData }) => {
  const { t } = useTranslation()

  return (
        <Flex flexDirection="column" ml="8px">
          <FlexGap gap="16px" pt="14px" pl="4px">
            <Link external href={ifo.articleUrl}>
              <LanguageIcon color="textSubtle" />
            </Link>
            <Link external href={getPolygonScanLink(ifo.address, 'address')}>
              <SmartContractIcon color="textSubtle" />
            </Link>
            {ifo.twitterUrl && (
              <Link external href={ifo.twitterUrl}>
                <TwitterIcon color="textSubtle" />
              </Link>
            )}
            {ifo.telegramUrl && (
              <Link external href={ifo.telegramUrl}>
                <TelegramIcon color="textSubtle" />
              </Link>
            )}
            {ifo.discordUrl && (
              <Link external href={ifo.discordUrl}>
                <DiscordIcon color="textSubtle" />
              </Link>
            )}
            {ifo.cmcUrl && (
              <Link external href={ifo.cmcUrl}>
                <CmcIcon color="textSubtle" />
              </Link>
            )}
            {ifo.openSeaUrl && (
              <Link external href={ifo.openSeaUrl}>
                <OpenSeaIcon color="textSubtle" />
              </Link>
            )}
          </FlexGap>
        </Flex>
  )
}

export default IfoAchievement
