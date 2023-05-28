import { useState } from 'react'
import BigNumber from 'bignumber.js'
import styled from 'styled-components'
import { useTranslation } from 'contexts/Localization'
import { Flex, CardFooter, ExpandableLabel, HelpIcon, useTooltip } from '@pancakeswap/uikit'
import { DeserializedPool } from 'state/types'
import { CompoundingPoolTag2, ManualPoolTag2 } from 'components/Tags'
import ExpandedFooter from './ExpandedFooter'

interface FooterProps {
  claim: any
  account: string
  defaultExpanded?: boolean
}

const ExpandableButtonWrapper = styled(Flex)`
  align-items: center;
  justify-content: space-between;
  button {
    padding: 0;
  }
`

const Footer: React.FC<FooterProps> = ({ claim, account, defaultExpanded }) => {
  const { name } = claim
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || false)

  const manualTooltipText = t('This reward pool operates on a fixed structure, maintaining consistent rewards and steadfast rules. Enjoy reliable benefits with each claim you make.')
  const autoTooltipText = t(
    'This reward pool is a dynamic entity, subject to periodic changes in rewards and governing rules. Please stay updated to maximize your benefits.',
  )

  const { targetRef, tooltip, tooltipVisible } = useTooltip(true ? autoTooltipText : manualTooltipText, {
    placement: 'bottom',
  })

  return (
    <CardFooter>
      <ExpandableButtonWrapper>
        <Flex alignItems="center">
          {true ? <CompoundingPoolTag2 /> : <ManualPoolTag2 />}
          {tooltipVisible && tooltip}
          <Flex ref={targetRef}>
            <HelpIcon ml="4px" width="20px" height="20px" color="textSubtle" />
          </Flex>
        </Flex>
        <ExpandableLabel expanded={isExpanded} onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? t('Hide') : t('Details')}
        </ExpandableLabel>
      </ExpandableButtonWrapper>
      {isExpanded && <ExpandedFooter claim={claim} account={account} />}
    </CardFooter>
  )
}

export default Footer
