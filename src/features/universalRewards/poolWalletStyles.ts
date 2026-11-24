import styled, { keyframes } from 'styled-components'

const arrive = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`

export const WalletDialog = styled.dialog`
  width: min(calc(100% - 28px), 650px);
  max-height: calc(100vh - 28px);
  max-height: min(780px, calc(100dvh - 28px));
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 24px;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  box-shadow: 0 24px 80px #150a2e48;
  overscroll-behavior: contain;

  &[open] {
    display: flex;
    flex-direction: column;
  }
  &::backdrop {
    background: #130d2599;
    overflow: hidden;
    overscroll-behavior: contain;
  }

  @media (prefers-reduced-motion: no-preference) {
    &[open] {
      animation: ${arrive} 160ms ease-out;
    }
  }

  @media (max-width: 580px) {
    width: 100%;
    max-width: 100%;
    margin: auto 0 0;
    border-radius: 22px 22px 0 0;
  }
`

export const WalletDialogHeading = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 10px;
  padding: 17px clamp(14px, 4vw, 26px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  background: radial-gradient(ellipse at 3% 0, ${({ theme }) => theme.colors.primary}17, transparent 75%),
    ${({ theme }) => theme.colors.backgroundAlt};

  h2 {
    margin: 0;
    font-size: clamp(1.4rem, 1.05rem + 1.5vw, 1.9rem);
    font-weight: 750;
    line-height: 1.1;
  }
  p {
    margin: 4px 0 0;
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.textSubtle};
  }
  button {
    min-height: 44px;
    min-width: 44px;
    padding: 0;
  }
`

export const WalletDialogBody = styled.div`
  display: grid;
  gap: 14px;
  min-height: 0;
  padding: 15px clamp(14px, 4vw, 26px) max(20px, env(safe-area-inset-bottom));
  overflow: auto;
  overscroll-behavior: contain;
  overflow-wrap: anywhere;
  > p {
    margin: 0;
  }
`

export const WalletNftGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 118px), 1fr));
  gap: 10px;
`

export const WalletNftTile = styled.label`
  position: relative;
  display: grid;
  align-content: start;
  gap: 5px;
  min-width: 0;
  padding: 6px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 13px;
  cursor: pointer;

  &[data-selected='true'] {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primary}0f;
  }
  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
  input {
    position: absolute;
    inset: 10px 10px auto auto;
    accent-color: ${({ theme }) => theme.colors.primary};
  }
  img {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 8px;
  }
  strong,
  small {
    display: block;
    padding-inline: 3px;
    line-height: 1.3;
  }
  small {
    color: ${({ theme }) => theme.colors.textSubtle};
  }
`

export const WalletLookup = styled.details`
  summary {
    width: fit-content;
    cursor: pointer;
    padding-block: 8px;
    font-size: 0.875rem;
    font-weight: 650;
  }
  form {
    display: grid;
    gap: 7px;
    margin-top: 5px;
  }
`
