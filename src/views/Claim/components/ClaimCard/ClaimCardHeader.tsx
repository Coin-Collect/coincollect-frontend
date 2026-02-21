import { Flex, Heading, Text } from '@pancakeswap/uikit'
import { ReactNode, useState } from 'react'
import styled from 'styled-components'

const Description = styled(Text)<{ $expanded?: boolean }>`
  font-size: 15px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: ${({ $expanded }) => ($expanded ? 'unset' : 2)};
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover,
  &:focus-visible {
    -webkit-line-clamp: unset;
    overflow: visible;
    white-space: normal;
  }
`

const Title = styled(Heading)`
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
`

const ClaimCardHeader: React.FC<{
  isFinished?: boolean
  isStaking?: boolean
}> = ({ isFinished: _isFinished = false, isStaking: _isStaking = false, children }) => {
  return (
      <Flex alignItems="center" justifyContent="space-center" p={20}>
        {children}
      </Flex>
  )
}

export const ClaimCardHeaderTitle: React.FC<{ isFinished?: boolean; title: ReactNode; subTitle: ReactNode }> = ({
  isFinished,
  title,
  subTitle,
}) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <Flex flexDirection="column">
      <Title color={isFinished ? 'textDisabled' : 'body'} scale="lg">
        {title}
      </Title>
      <Description
        $expanded={expanded}
        color={isFinished ? 'textDisabled' : 'textSubtle'}
        title={typeof subTitle === 'string' ? subTitle : undefined}
        onClick={() => setExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setExpanded((prev) => !prev)
          }
        }}
      >
        {subTitle}
      </Description>
    </Flex>
  )
}

export default ClaimCardHeader
