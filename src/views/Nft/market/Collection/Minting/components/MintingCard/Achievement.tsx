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
  variant?: 'default' | 'compact'
  iconColor?: SvgProps['color']
  hoverColor?: SvgProps['color']
}

const IconLink = styled(Link)<{ $color: SvgProps['color']; $hoverColor?: SvgProps['color'] }>`
  align-items: center;
  color: ${({ theme, $color }) => theme.colors?.[$color as string] ?? $color};
  display: inline-flex;
  transition: color 200ms ease;

  svg {
    fill: currentColor;
    transition: fill 200ms ease;
  }

  &:hover {
    color: ${({ theme, $hoverColor, $color }) => ($hoverColor ? theme.colors?.[$hoverColor as string] ?? $hoverColor : theme.colors.primary)};
  }
`

const IfoAchievement: React.FC<Props> = ({
  ifo,
  publicIfoData: _publicIfoData,
  variant = 'default',
  iconColor = 'textSubtle',
  hoverColor,
}) => {
  const gap = variant === 'compact' ? '12px' : '16px'
  const paddingLeft = variant === 'default' ? '4px' : '0'
  const resolvedHoverColor = hoverColor ?? iconColor

  const iconLinks = (
    <FlexGap gap={gap} pl={paddingLeft} alignItems="center">
      <IconLink external href={ifo.articleUrl} $color={iconColor} $hoverColor={resolvedHoverColor}>
        <LanguageIcon color="currentColor" />
      </IconLink>
      <IconLink
        external
        href={getPolygonScanLink(ifo.address, 'address')}
        $color={iconColor}
        $hoverColor={resolvedHoverColor}
      >
        <SmartContractIcon color="currentColor" />
      </IconLink>
      {ifo.twitterUrl && (
        <IconLink external href={ifo.twitterUrl} $color={iconColor} $hoverColor={resolvedHoverColor}>
          <TwitterIcon color="currentColor" />
        </IconLink>
      )}
      {ifo.telegramUrl && (
        <IconLink external href={ifo.telegramUrl} $color={iconColor} $hoverColor={resolvedHoverColor}>
          <TelegramIcon color="currentColor" />
        </IconLink>
      )}
      {ifo.discordUrl && (
        <IconLink external href={ifo.discordUrl} $color={iconColor} $hoverColor={resolvedHoverColor}>
          <DiscordIcon color="currentColor" />
        </IconLink>
      )}
      {ifo.cmcUrl && (
        <IconLink external href={ifo.cmcUrl} $color={iconColor} $hoverColor={resolvedHoverColor}>
          <CmcIcon color="currentColor" />
        </IconLink>
      )}
      {ifo.openSeaUrl && (
        <IconLink external href={ifo.openSeaUrl} $color={iconColor} $hoverColor={resolvedHoverColor}>
          <OpenSeaIcon color="currentColor" />
        </IconLink>
      )}
    </FlexGap>
  )

  if (variant === 'compact') {
    return <Flex alignItems="center">{iconLinks}</Flex>
  }

  return <Flex flexDirection="column" ml="8px">{iconLinks}</Flex>
}

export default IfoAchievement
