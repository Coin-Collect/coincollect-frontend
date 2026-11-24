import styled from 'styled-components'
import { V3Page, V3Section } from './styles'

export const Showroom = styled(V3Page)`
  width: min(100%, 1360px);
  padding-inline: clamp(12px, 2.6vw, 36px);
  --showroom-space: clamp(24px, 4vw, 52px);
`

export const PoolCover = styled.header`
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  align-items: end;
  min-height: 360px;
  padding: clamp(20px, 4vw, 52px);
  border-radius: clamp(20px, 3vw, 32px);
  background-color: #211932;
  color: #fff8ff;

  &::after {
    position: absolute;
    z-index: -1;
    inset: 0;
    content: '';
    background: linear-gradient(90deg, #211932 8%, #211932 34%, #211932b8 52%, transparent 83%),
      linear-gradient(0deg, #2119329c, transparent 42%);
  }

  @media (max-width: 670px) {
    padding-top: clamp(116px, 38vw, 180px);
    min-height: 0;

    &::after {
      background: linear-gradient(0deg, #211932 35%, #211932e6 56%, #21193240 80%, transparent 100%);
    }
  }
`

export const CoverArtwork = styled.div`
  position: absolute;
  z-index: -2;
  inset: 0 0 0 34%;

  img {
    object-fit: cover;
    object-position: center;
  }

  @media (max-width: 670px) {
    inset: 0 0 auto;
    height: min(62vw, 250px);
  }
`

export const CoverContent = styled.div`
  display: grid;
  justify-items: start;
  gap: 14px;
  width: min(100%, 620px);

  @media (min-width: 671px) {
    width: min(65%, 620px);
  }
`

export const CoverTitle = styled.h1`
  margin: 0;
  font-size: clamp(2rem, 1.1rem + 4vw, 4.65rem);
  line-height: 0.99;
  letter-spacing: -0.055em;
  font-weight: 800;
  overflow-wrap: anywhere;
`

export const CoverDescription = styled.p`
  max-width: 48ch;
  margin: 0;
  color: #f0e4f8;
  font-weight: 500;
  line-height: 1.55;
  overflow-wrap: anywhere;
  white-space: pre-line;
`

export const CoverLabels = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

export const CoverBadge = styled.span<{ $tone?: 'community' | 'partner' | 'Live' | 'Upcoming' | 'Finished' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.75rem;
  line-height: 1.35;
  font-weight: 700;
  color: ${({ $tone }) =>
    $tone === 'community' || $tone === 'Live' ? '#acf5da' : $tone === 'Upcoming' ? '#ffe29c' : '#eee0ff'};
  background: #211932bf;
`

export const CoverActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 5px;

  > :is(button, a) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 46px;
    padding: 9px 14px;
    border: 1px solid #f4e5fa48;
    border-radius: 12px;
    color: #fff8ff;
    background: #231934ba;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  > a {
    background: #fff4fc;
    color: #211932;
  }
  > :is(a, button):hover {
    box-shadow: inset 0 0 0 1px currentColor;
  }
  > :is(a, button):focus-visible {
    outline: 2px solid white;
    outline-offset: 3px;
  }
`

export const ShareFeedback = styled.div`
  font-size: 0.875rem;
  overflow-wrap: anywhere;
  color: #fff4fc;
  &[data-empty='true'] {
    position: absolute;
  }
  input {
    width: 100%;
    margin-top: 7px;
    padding: 7px;
    border-radius: 6px;
    color: #211932;
    background: white;
  }
`

export const ShowroomFacts = styled.dl`
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  margin: 12px 0 0;
  padding: 6px 0;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.backgroundAlt};

  > div {
    min-width: 0;
    padding: 10px clamp(12px, 2vw, 24px);
  }
  > div + div {
    border-inline-start: 1px solid ${({ theme }) => theme.colors.cardBorder};
  }
  dt {
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: 0.8125rem;
  }
  dd {
    margin: 5px 0 0;
    font-weight: 750;
    overflow-wrap: anywhere;
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    padding: 0;
    margin: 5px 0 0;
  }
  li {
    display: flex;
    align-items: center;
    gap: 5px;
    overflow-wrap: anywhere;
  }

  @media (max-width: 580px) {
    grid-template-columns: 1fr 1fr;
    > div:first-child {
      grid-column: 1 / -1;
      border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
    }
    > div:nth-child(2) {
      border-inline-start: 0;
    }
  }
`

export const ShowroomSection = styled(V3Section)`
  margin-block: var(--showroom-space, 32px) 0;
  scroll-margin-top: 90px;

  > header > h2 {
    font-size: clamp(1.4rem, 1rem + 2.1vw, 2.35rem);
    line-height: 1.15;
  }
`

export const PoolStage = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr);
  align-items: start;
  gap: clamp(18px, 4vw, 52px);
  padding: clamp(10px, 3vw, 30px);
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 24px;
  background: radial-gradient(ellipse at 16% 18%, ${({ theme }) => theme.colors.primary}20, transparent 60%),
    radial-gradient(ellipse at 86% 92%, ${({ theme }) => theme.colors.secondary}22, transparent 63%),
    ${({ theme }) => theme.colors.backgroundAlt};

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const FarmCardSlot = styled.div`
  justify-self: center;
  width: min(100%, 350px);
  min-width: 0;
`

export const CollectionShelf = styled.aside`
  min-width: 0;
  padding: 4px clamp(4px, 1.8vw, 18px) 8px;

  h3 {
    margin: 0 0 12px;
    font-size: 1.12rem;
    font-weight: 750;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 10px;
    min-height: 62px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  }
  img,
  li > span:first-child {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    object-fit: cover;
    background: ${({ theme }) => theme.colors.background};
  }
  li > span:first-child {
    display: grid;
    place-items: center;
    font-weight: 800;
  }
  strong,
  small {
    display: block;
    overflow-wrap: anywhere;
  }
  small {
    color: ${({ theme }) => theme.colors.textSubtle};
  }
  li > small {
    font-weight: 700;
    text-align: right;
  }
`

export const DiscoverHeader = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 16px;
  flex-wrap: wrap;
`

export const RelatedPools = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr));
  gap: 14px;

  a {
    display: grid;
    grid-template-columns: clamp(62px, 9vw, 94px) minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    min-height: 84px;
    padding: 8px;
    border-radius: 14px;
    border: 1px solid ${({ theme }) => theme.colors.cardBorder};
    background: ${({ theme }) => theme.colors.backgroundAlt};
    color: ${({ theme }) => theme.colors.text};
  }
  a:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  a:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
  img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    border-radius: 8px;
  }
  strong,
  small {
    display: block;
    overflow-wrap: anywhere;
  }
  small {
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.textSubtle};
  }
`
