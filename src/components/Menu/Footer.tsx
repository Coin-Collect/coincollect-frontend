import React from 'react'
import styled from 'styled-components'
import { Flex, Svg, Image, Button, Text } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'

interface WrapperProps {
  $isSide: boolean
  children?: React.ReactNode
}

const Wrapper = styled.div<WrapperProps>`
  width: 100%;
  height: ${({ $isSide }) => ($isSide ? '100%' : 'auto')};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 24px;
  padding-right: ${({ $isSide }) => ($isSide ? '32px' : '0px')};
`

const ContentGrid = styled.div<WrapperProps>`
  width: 100%;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: center;

  ${({ theme, $isSide }) =>
    !$isSide &&
    theme.mediaQueries.md} {
    grid-template-columns: minmax(260px, 1fr) minmax(360px, 520px);
  }
`

const SupportCard = styled(Flex)`
  width: 100%;
  max-width: 520px;
  border-radius: 24px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.input} 0%, ${({ theme }) => theme.colors.backgroundAlt} 100%);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
  padding: 18px 18px 18px 24px;
`

const BubbleWrapper = styled(Flex)`
  flex: 1;
  align-items: center;
  justify-content: flex-start;
  svg {
    fill: ${({ theme }) => theme.colors.textSubtle};
    transition: opacity 0.2s;
  }
  &:hover {
    svg {
      opacity: 0.65;
    }
  }
  &:active {
    svg {
      opacity: 0.85;
    }
  }
`

const SupportButton = styled(Button)`
  font-weight: 600;
  letter-spacing: 0.01em;
`

const HelperImage = styled(Image)`
  filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.2));
`

type FooterVariant = 'default' | 'side'

const Footer: React.FC<{ variant?: FooterVariant }> = ({ variant = 'default' }) => {
  const { t } = useTranslation()
  const isSide = variant === 'side'
  const TextAny = Text as unknown as React.ComponentType<any>
  return (
    <Wrapper $isSide={isSide}>
      <ContentGrid $isSide={isSide}>
        <Flex justifyContent={['center', 'center', 'flex-start']}>
          <TextAny fontSize="12px" color="textSubtle" textAlign={['center', 'center', 'left']} style={{ opacity: 0.9 }}>
            {t('AI Assistant powered by OpenAI, created by SapienX')}
          </TextAny>
        </Flex>
        <Flex alignItems="center" width="100%" justifyContent={['center', 'center', 'flex-end']}>
          <SupportCard>
            <BubbleWrapper>
              <SupportButton
                id="clickExchangeHelp"
                as="a"
                external
                href="https://docs.coincollect.org"
                variant="subtle"
                scale="sm"
              >
                {t('Need help?')}
              </SupportButton>
              <Svg viewBox="0 0 16 16">
                <path d="M0 16V0C0 0 3 1 6 1C9 1 16 -2 16 3.5C16 10.5 7.5 16 0 16Z" />
              </Svg>
            </BubbleWrapper>
            <HelperImage src="/images/help.png" alt="Get some help" width={132} height={90} />
          </SupportCard>
        </Flex>
      </ContentGrid>
    </Wrapper>
  )
}

export default Footer
