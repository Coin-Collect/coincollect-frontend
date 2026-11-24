import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import styled, { keyframes } from 'styled-components'
import { isAddressEqual, type Address } from 'viem'
import { mainnetTokens } from 'config/constants/tokens'
import RewardTokenIcon from 'views/NftFarms/components/FarmCard/RewardTokenIcon'
import { shortAmount } from './presentation'
import { V3Button } from './styles'

export type TreasuryOperation = 'deposit' | 'withdraw' | 'swap'

const treasuryLogos: Record<string, { address: string }> = {
  [mainnetTokens.wbtc.address.toLowerCase()]: mainnetTokens.btcb,
  [mainnetTokens.weth.address.toLowerCase()]: mainnetTokens.eth,
  '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': mainnetTokens.usdc,
}

export function TreasuryAssetIcon({
  asset,
  wrappedNative,
  size,
}: {
  asset: { address: Address; symbol: string }
  wrappedNative: Address
  size: number
}) {
  const artwork = isAddressEqual(asset.address, wrappedNative)
    ? mainnetTokens.wmatic
    : treasuryLogos[asset.address.toLowerCase()] ?? asset
  return <RewardTokenIcon token={asset.symbol} tokenMeta={artwork} size={size} />
}

export function treasuryBalance(amount: bigint, decimals: number | null) {
  return shortAmount(amount, decimals).replace(/^\d+(?=\.| |$)/, (whole) => whole.replace(/\B(?=(?:\d{3})+$)/g, ','))
}

const panelEntry = keyframes`
  from { opacity: 0.88; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
`

export const TreasuryPanel = styled.section`
  min-width: 0;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
`

export const PanelBody = styled.div`
  display: grid;
  gap: 16px;
  padding: clamp(16px, 2.6vw, 24px);
  min-width: 0;
`

export const PanelHeading = styled.div`
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;

  h2,
  h3,
  p {
    margin: 0;
  }

  h2,
  h3 {
    font-size: 1.25rem;
    line-height: 1.2;
    font-weight: 750;
    letter-spacing: -0.025em;
  }

  p {
    margin-top: 5px;
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.textSubtle};
  }
`

const TabList = styled.div<{ $compact?: boolean }>`
  display: grid;
  position: relative;
  align-items: stretch;
  grid-template-columns: repeat(var(--tab-count), minmax(0, 1fr));
  gap: 3px;
  width: ${({ $compact }) => ($compact ? '100%' : 'min(100%, 520px)')};
  max-width: 100%;
  border-radius: 12px;
  padding: 3px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  background: ${({ theme }) => theme.colors.background};

  &::before {
    content: '';
    position: absolute;
    z-index: 0;
    inset-block: 3px;
    inset-inline-start: 3px;
    width: calc((100% - 6px - (var(--tab-count) - 1) * 3px) / var(--tab-count));
    border-radius: 8px;
    background: ${({ theme }) => theme.colors.backgroundAlt};
    box-shadow: 0 2px 4px rgb(0 0 0 / 14%);
    transform: translateX(calc(var(--tab-active) * (100% + 3px)));
  }

  &:dir(rtl)::before {
    transform: translateX(calc(-1 * var(--tab-active) * (100% + 3px)));
  }

  @media (prefers-reduced-motion: no-preference) {
    &[data-pointer='true']::before {
      transition: transform 180ms cubic-bezier(0.23, 1, 0.32, 1);
    }
  }
`

const TabButton = styled.button`
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 5px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  text-align: center;
  font: inherit;
  font-size: 0.875rem;
  line-height: 1.2;
  font-weight: 650;
  overflow-wrap: anywhere;
  color: ${({ theme }) => theme.colors.textSubtle};
  cursor: pointer;

  svg {
    flex: none;
  }

  &[aria-selected='true'] {
    color: ${({ theme }) => theme.colors.text};
    font-weight: 750;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      color: ${({ theme }) => theme.colors.text};
    }
  }

  @media (max-width: 540px) {
    flex-direction: column;
    gap: 4px;
    font-size: 0.8125rem;
  }
`

export const TabPanel = styled.div`
  min-width: 0;

  &[hidden] {
    display: none;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 4px;
    border-radius: 12px;
  }

  @media (prefers-reduced-motion: no-preference) {
    &[data-enter='true']:not([hidden]) {
      animation: ${panelEntry} 150ms cubic-bezier(0.23, 1, 0.32, 1);
    }
  }
`

type Tab<T> = { value: T; label: string; icon: ReactNode }

export function TreasuryTabs<T extends string>({
  id,
  tabs,
  active,
  onChange,
  label,
  compact = false,
  pointer = false,
}: {
  id: string
  tabs: readonly Tab<T>[]
  active: T
  onChange: (tab: T, pointer: boolean) => void
  label: string
  compact?: boolean
  pointer?: boolean
}) {
  const activeIndex = tabs.findIndex(({ value }) => value === active)
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    let index: number
    switch (event.key) {
      case 'ArrowRight':
        index = (activeIndex + (rtl ? -1 : 1) + tabs.length) % tabs.length
        break
      case 'ArrowLeft':
        index = (activeIndex + (rtl ? 1 : -1) + tabs.length) % tabs.length
        break
      case 'Home':
        index = 0
        break
      case 'End':
        index = tabs.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    onChange(tabs[index].value, false)
    event.currentTarget.querySelectorAll('button')[index]?.focus()
  }

  return (
    <TabList
      role="tablist"
      aria-label={label}
      $compact={compact}
      data-pointer={pointer}
      onKeyDown={handleKeyDown}
      style={{ '--tab-count': tabs.length, '--tab-active': activeIndex } as CSSProperties}
    >
      {tabs.map(({ value, label: title, icon }) => (
        <TabButton
          key={value}
          role="tab"
          type="button"
          id={`${id}-${value}-tab`}
          aria-controls={`${id}-${value}-panel`}
          aria-selected={value === active}
          tabIndex={value === active ? 0 : -1}
          onClick={(event) => onChange(value, event.detail > 0)}
        >
          {icon}
          <span>{title}</span>
        </TabButton>
      ))}
    </TabList>
  )
}

export const TreasuryAction = styled(V3Button)`
  background: ${({ $secondary }) => ($secondary ? 'transparent' : '#cf1958')};

  @media (prefers-reduced-motion: no-preference) {
    transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
    &:active:not(:disabled) {
      transform: scale(0.985);
    }
  }
`

export const SolidAction = styled(TreasuryAction)`
  width: 100%;
`

export const TreasuryTable = styled.div`
  overflow: auto;
  min-width: 0;
  max-width: 100%;

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-variant-numeric: tabular-nums;
  }

  th,
  td {
    padding: 11px 16px;
    text-align: right;
    overflow-wrap: anywhere;
  }

  th:first-child {
    text-align: left;
  }

  thead th {
    font-weight: 600;
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.textSubtle};
    background: ${({ theme }) => theme.colors.background};
  }

  tbody th,
  tbody td {
    border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  }

  tbody tr:last-child > * {
    border-bottom: 0;
  }

  @media (max-width: 560px) {
    th,
    td {
      padding: 9px 7px;
      font-size: 0.8125rem;
    }
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`
