import { CardHeader, Flex, Heading, Text } from '@pancakeswap/uikit'
import { ReactNode } from 'react'
import styled from 'styled-components'


const ClaimCardHeader: React.FC<{
  isFinished?: boolean
  isStaking?: boolean
}> = ({ isFinished = false, isStaking = false, children }) => {
  const background = isStaking ? 'bubblegum' : 'cardHeader'

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
  return (
    <Flex flexDirection="column">
      <Heading color={isFinished ? 'textDisabled' : 'body'} scale="lg">
        {title}
      </Heading>
      <Text fontSize="15px" color={isFinished ? 'textDisabled' : 'textSubtle'}>
        {subTitle}
      </Text>
    </Flex>
  )
}

export default ClaimCardHeader
