import styled, { keyframes } from 'styled-components'

const rewardRefresh = keyframes`
  from { opacity: 0.6; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
`

export const V3RewardValue = styled.span`
  display: inline-block;

  @media (prefers-reduced-motion: no-preference) {
    animation: ${rewardRefresh} 180ms cubic-bezier(0.23, 1, 0.32, 1);
  }
`

export const V3Page = styled.main`
  width: min(100%, 1140px);
  margin-inline: auto;
  padding: clamp(18px, 4vw, 44px) clamp(16px, 4vw, 44px) 64px;
  color: ${({ theme }) => theme.colors.text};
`

export const V3Section = styled.section`
  margin-block: 12px 28px;
  min-width: 0;

  > header {
    margin-bottom: 16px;
  }

  h1,
  h2,
  h3,
  p {
    margin: 0;
  }

  h1 {
    font-size: clamp(30px, 5vw, 50px);
    font-weight: 800;
    letter-spacing: -0.04em;
  }

  h2 {
    font-size: clamp(20px, 3vw, 28px);
    font-weight: 750;
    letter-spacing: -0.025em;
  }

  h3 {
    font-weight: 750;
    font-size: 18px;
  }
`

export const V3Grid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 270px), 1fr));
  align-items: start;
`

export const V3Card = styled.section`
  min-width: 0;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 24px;
  overflow: hidden;

  > div {
    display: grid;
    gap: 14px;
    padding: clamp(16px, 3vw, 24px);
  }

  img {
    width: 100%;
    height: clamp(140px, 21vw, 220px);
    display: block;
    object-fit: contain;
    background: radial-gradient(ellipse at 24% 90%, #593556, #231a34 64%);
  }
`

export const V3Muted = styled.p`
  color: ${({ theme }) => theme.colors.textSubtle};
  line-height: 1.5;
  overflow-wrap: anywhere;
`

export const V3Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

export const V3Button = styled.button<{ $secondary?: boolean }>`
  display: inline-grid;
  place-items: center;
  min-height: 48px;
  max-width: 100%;
  padding: 8px 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  color: ${({ theme, $secondary }) => ($secondary ? theme.colors.text : 'white')};
  background: ${({ theme, $secondary }) => ($secondary ? 'transparent' : theme.colors.primary)};
  text-align: center;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.text};
    outline-offset: 2px;
  }
`

export const V3Link = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 700;
  overflow-wrap: anywhere;

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`

export const V3Badge = styled.span`
  display: inline-block;
  width: fit-content;
  border-radius: 999px;
  padding: 5px 10px;
  background: rgba(157, 111, 224, 0.13);
  color: ${({ theme }) => theme.colors.text};
  font-size: 12px;
  font-weight: 700;
`

export const V3Metrics = styled.dl`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 132px), 1fr));
  gap: 10px;
  margin: 0;

  > div {
    display: grid;
    align-content: start;
    gap: 4px;
    padding: 12px;
    border-radius: 12px;
    background: ${({ theme }) => theme.colors.background};
  }

  dt {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.textSubtle};
  }

  dd {
    margin: 0;
    font-weight: 750;
    overflow-wrap: anywhere;
    font-variant-numeric: tabular-nums;
  }
`

export const V3Field = styled.label`
  display: grid;
  gap: 6px;
  min-width: 0;
  font-weight: 650;

  input:not([type='checkbox']),
  select,
  textarea {
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    min-height: 48px;
    padding: 8px 10px;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid ${({ theme }) => theme.colors.cardBorder};
    border-radius: 10px;
    font: inherit;
    font-size: max(1rem, 1em);
  }

  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  [aria-invalid='true'] {
    border-color: ${({ theme }) => theme.colors.failure};
  }

  textarea {
    resize: vertical;
  }
`

export const V3Fields = styled.fieldset`
  display: grid;
  gap: 14px;
  min-width: 0;
  margin: 0;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 14px;
  padding: 14px;

  legend {
    padding-inline: 6px;
    font-weight: 800;
  }
`

export const V3Error = styled.p`
  color: ${({ theme }) => theme.colors.failure};
  line-height: 1.45;
  overflow-wrap: anywhere;
`
