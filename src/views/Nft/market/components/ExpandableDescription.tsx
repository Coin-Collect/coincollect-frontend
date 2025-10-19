import { useState } from 'react'
import { Text, Button, Box } from '@pancakeswap/uikit'
import styled from 'styled-components'

interface ExpandableDescriptionProps {
  text: string
  color?: string
  maxLines?: number
}

const TruncatedText = styled(Text)<{ isExpanded: boolean; maxLines: number }>`
  display: -webkit-box;
  -webkit-line-clamp: ${({ isExpanded, maxLines }) => (isExpanded ? 'unset' : maxLines)};
  -webkit-box-orient: vertical;
  overflow: ${({ isExpanded }) => (isExpanded ? 'visible' : 'hidden')};
  text-overflow: ellipsis;
  line-height: 1.5;
  margin-bottom: ${({ isExpanded }) => (isExpanded ? '8px' : '0')};
`

const ToggleButton = styled(Button)`
  padding: 0;
  height: auto;
  font-size: 14px;
  font-weight: 600;
  text-decoration: underline;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  
  &:hover {
    background: transparent;
    opacity: 0.8;
  }
`

const ExpandableDescription: React.FC<ExpandableDescriptionProps> = ({ 
  text, 
  color = "textSubtle", 
  maxLines = 2 
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Check if text needs truncation by counting approximate lines
  const wordsPerLine = 12 // Approximate words per line
  const words = text.split(' ')
  const estimatedLines = Math.ceil(words.length / wordsPerLine)
  const needsTruncation = estimatedLines > maxLines

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  if (!text) return null

  return (
    <Box>
      <TruncatedText 
        color={color} 
        isExpanded={isExpanded} 
        maxLines={maxLines}
      >
        {text}
      </TruncatedText>
      {needsTruncation && (
        <ToggleButton 
          variant="text" 
          onClick={toggleExpanded}
          scale="sm"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </ToggleButton>
      )}
    </Box>
  )
}

export default ExpandableDescription