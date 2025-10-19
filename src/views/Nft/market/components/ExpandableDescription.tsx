import { useState, useRef, useEffect } from 'react'
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
  const [needsTruncation, setNeedsTruncation] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        // Check if the text is actually being truncated
        const element = textRef.current
        const lineHeight = parseFloat(getComputedStyle(element).lineHeight)
        const maxHeight = lineHeight * maxLines
        const actualHeight = element.scrollHeight
        
        setNeedsTruncation(actualHeight > maxHeight + 1) // +1 for rounding tolerance
      }
    }

    // Check truncation after component mounts and on resize
    checkTruncation()
    window.addEventListener('resize', checkTruncation)
    
    return () => window.removeEventListener('resize', checkTruncation)
  }, [text, maxLines])

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  if (!text) return null

  return (
    <Box>
      <TruncatedText 
        ref={textRef}
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