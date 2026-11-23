import styled, { css, keyframes } from 'styled-components'

export const Workspace = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 480px) minmax(0, 1fr);
  align-items: start;
  gap: clamp(24px, 4vw, 52px);
  margin-block: 24px;

  @media (max-width: 850px) {
    grid-template-columns: minmax(0, 540px);
    justify-content: center;
  }
`

export const Preview = styled.div`
  min-width: 0;

  article {
    width: 100%;
  }
`

export const Inspector = styled.aside`
  min-width: 0;

  h2 {
    font-size: 1.25rem;
    margin: 0 0 6px;
  }

  > p {
    margin: 0 0 16px;
  }
`

export const RowButton = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 52px;
  padding: 8px 2px;
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  text-align: start;
  font: inherit;
  color: ${({ theme }) => theme.colors.text};
  background: transparent;
  cursor: pointer;

  &:hover strong,
  &:focus-visible strong {
    color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  small {
    color: ${({ theme }) => theme.colors.textSubtle};
    text-align: end;
    overflow-wrap: anywhere;
  }
`

export const Launch = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 20px;
`

export const InlineTitle = styled.button`
  display: block;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: inherit;
  text-shadow: inherit;
  text-align: start;
  overflow-wrap: anywhere;
  cursor: text;
  text-decoration: underline dashed rgb(255 255 255 / 75%) 1px;
  text-underline-offset: 5px;

  &:focus-visible {
    outline: 2px solid white;
  }
`

export const NameInput = styled.input`
  width: min(100%, 18ch);
  min-width: 0;
  padding: 4px 7px;
  border: 1px solid rgb(255 255 255 / 80%);
  border-radius: 8px;
  background: rgb(0 0 0 / 80%);
  color: white;
  font: inherit;
`

const enter = keyframes`
  from { opacity: 0.55; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`

export const EditorDialog = styled.dialog`
  width: min(calc(100% - 24px), 560px);
  max-height: min(calc(100% - 24px), 740px);
  max-height: min(calc(100dvh - 24px), 740px);
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 18px;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  overscroll-behavior: contain;

  @media (min-width: 1050px) {
    margin-inline: auto 3vw;
  }

  &[open] {
    display: flex;
    flex-direction: column;
  }

  @media (prefers-reduced-motion: no-preference) {
    &[open] {
      animation: ${enter} 180ms cubic-bezier(0.22, 1, 0.36, 1);
    }
  }

  &::backdrop {
    background: rgb(4 2 8 / 60%);
    overflow: hidden;
    overscroll-behavior: contain;
  }
`

export const EditorHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};

  h2 {
    font-size: 1.25rem;
    margin: 0;
  }
`

export const EditorBody = styled.div`
  display: grid;
  gap: 16px;
  padding: 18px 20px;
  overflow-y: auto;
  overscroll-behavior: contain;

  > p {
    margin: 0;
  }
`

export const EditorFooter = styled.footer`
  padding: 12px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.cardBorder};
  display: flex;
  justify-content: flex-end;
`

export const EditorGrid = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
  align-items: start;
`

export const Choice = styled.button<{ $selected?: boolean }>`
  display: grid;
  gap: 5px;
  align-content: center;
  min-height: 48px;
  padding: 8px;
  border-radius: 9px;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme, $selected }) => ($selected ? theme.colors.input : theme.colors.background)};
  border: 1px solid ${({ theme, $selected }) => ($selected ? theme.colors.primary : theme.colors.cardBorder)};
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:focus-visible,
  &:hover:not(:disabled) {
    outline: 1px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }

  img {
    width: 100%;
    aspect-ratio: 2 / 1;
    object-fit: cover;
    border-radius: 5px;
  }
`

export const AssetChoice = styled(Choice)`
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-height: 54px;

  img {
    width: 30px;
    height: 30px;
    aspect-ratio: 1;
  }

  small {
    display: block;
    margin-top: 3px;
  }

  strong {
    overflow-wrap: anywhere;
  }
`

export const Distribution = styled.div`
  display: flex;
  height: 8px;
  border-radius: 6px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.input};
`

export const Slice = styled.span<{ $index: number }>`
  background: ${({ theme, $index }) =>
    [theme.colors.primary, theme.colors.secondary, theme.colors.success, theme.colors.warning][$index]};
`

const rangeTrack = css`
  height: 8px;
  border-radius: 6px;
  background: linear-gradient(
    to right,
    ${({ theme }) => theme.colors.primary} var(--reward-share),
    ${({ theme }) => theme.colors.input} var(--reward-share)
  );
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
`

const rangeThumb = css`
  width: 22px;
  height: 22px;
  border: 3px solid ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.invertedContrast};
`

export const RewardLane = styled.div`
  display: grid;
  gap: 8px;
  padding-block: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};

  label {
    display: block;
    font-weight: 700;
  }

  input[type='range'] {
    appearance: none;
    width: 100%;
    height: 44px;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;

    &::-webkit-slider-runnable-track {
      ${rangeTrack}
    }

    &::-moz-range-track {
      ${rangeTrack}
    }

    &::-webkit-slider-thumb {
      appearance: none;
      margin-top: -8px;
      ${rangeThumb}
    }

    &::-moz-range-thumb {
      ${rangeThumb}
    }

    @media (forced-colors: active) {
      &::-webkit-slider-runnable-track {
        border-color: ButtonText;
      }

      &::-moz-range-track {
        border-color: ButtonText;
      }

      &::-webkit-slider-thumb {
        border-color: Highlight;
      }

      &::-moz-range-thumb {
        border-color: Highlight;
      }
    }
  }

  input[type='range']:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  small {
    color: ${({ theme }) => theme.colors.textSubtle};
    font-variant-numeric: tabular-nums;
  }
`

export const ShareInput = styled.input`
  width: 76px;
  min-height: 44px;
  padding-inline: 7px;
  border-radius: 8px;
  color: inherit;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  font: inherit;
  text-align: end;
`

export const DetailButton = styled.button`
  padding: 7px 2px;
  border: 0;
  color: ${({ theme }) => theme.colors.text};
  background: transparent;
  font: inherit;
  text-align: end;
  cursor: pointer;
  text-decoration: underline dashed ${({ theme }) => theme.colors.textSubtle};
  text-underline-offset: 3px;
`
