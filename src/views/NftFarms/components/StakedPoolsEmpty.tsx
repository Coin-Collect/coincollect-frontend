import { useId } from 'react'
import styled from 'styled-components'
import { ArrowForwardIcon, Button, HistoryIcon, WalletIcon } from '@pancakeswap/uikit'
import ConnectWalletButton from 'components/ConnectWalletButton'
import { useTranslation } from 'contexts/Localization'
import WalletHeroCards from './WalletHeroCards'

const Panel = styled.section`
  display: grid;
  grid-template-areas: 'copy artwork';
  grid-template-columns: minmax(0, 1fr) minmax(170px, 0.62fr);
  align-items: center;
  gap: clamp(20px, 6vw, 64px);
  width: min(100%, 860px);
  margin: 8px auto 24px;
  padding: clamp(24px, 5vw, 52px);
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 16px;
  background: radial-gradient(ellipse at 90% 100%, rgba(134, 100, 239, 0.12), transparent 64%),
    ${({ theme }) => theme.colors.backgroundAlt};

  &[data-history='true'] {
    background: radial-gradient(ellipse at 90% 100%, rgba(217, 144, 62, 0.12), transparent 64%),
      ${({ theme }) => theme.colors.backgroundAlt};
  }

  @media (max-width: 600px) {
    grid-template-areas: 'artwork' 'copy';
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    text-align: center;
  }
`

const Copy = styled.div`
  grid-area: copy;
  min-width: 0;

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
    font-size: clamp(28px, 4vw, 44px);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1.08;
    text-wrap: balance;
  }

  p {
    max-width: 37ch;
    margin: 12px 0 0;
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: 15px;
    line-height: 1.6;
  }

  button {
    max-width: 100%;
    margin-top: 22px;
  }

  @media (max-width: 600px) {
    p {
      margin-inline: auto;
    }
  }
`

const Artwork = styled.div`
  grid-area: artwork;
  display: grid;
  place-items: center;
  min-height: 168px;

  @media (prefers-reduced-motion: no-preference) {
    transition: opacity 200ms cubic-bezier(0.23, 1, 0.32, 1), transform 250ms cubic-bezier(0.23, 1, 0.32, 1);

    @starting-style {
      & {
        opacity: 0.55;
        transform: translateY(8px) scale(0.95);
      }
    }
  }

  @media (max-width: 600px) {
    min-height: 144px;
  }
`

const MascotCard = styled.div`
  position: relative;
  isolation: isolate;
  display: grid;
  place-items: center;
  width: 116px;
  height: 132px;
  border-radius: 16px;
  background: linear-gradient(150deg, #ede4ff, #ba9ef4);
  box-shadow: 0 14px 30px rgba(33, 16, 63, 0.22);

  &::before,
  &::after {
    content: '';
    position: absolute;
    z-index: -1;
    inset: 0;
    border-radius: inherit;
    border: 1px solid rgba(149, 117, 207, 0.28);
    background: ${({ theme }) => theme.colors.backgroundAlt};
  }

  &::before {
    transform: translateX(-20px) rotate(-14deg);
    z-index: -2;
  }

  &::after {
    transform: translateX(20px) rotate(14deg);
  }
`

const MascotFace = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: inherit;
  background: inherit;

  img {
    width: 88px;
    height: 88px;
    filter: drop-shadow(0 7px 8px rgba(31, 16, 56, 0.2));
  }

  [data-history='true'] & {
    background: linear-gradient(150deg, #fff0d9, #e8b675);
  }
`

const Marker = styled.span`
  position: absolute;
  right: -11px;
  bottom: -8px;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.backgroundAlt};
`

type Props = {
  history: boolean
  connected: boolean
  filtered: boolean
  onBrowse: () => void
}

export default function StakedPoolsEmpty({ history, connected, filtered, onBrowse }: Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const title = !connected
    ? t('Connect your wallet')
    : filtered
    ? t('No matching staked positions')
    : history
    ? t('No stakes in finished pools')
    : t('No staked positions yet')
  const description = !connected
    ? t('Connect a wallet to see its NFT staking positions.')
    : filtered
    ? t('Try a different search or collection filter.')
    : history
    ? t('If a pool ends while your NFTs are still staked, its position will appear here.')
    : t('Stake an NFT in a live pool to track the position here.')

  return (
    <Panel aria-labelledby={titleId} data-history={history}>
      <Copy>
        <div role="status">
          <h2 id={titleId}>{title}</h2>
          <p>{description}</p>
        </div>
        {!connected ? (
          <ConnectWalletButton type="button" />
        ) : (
          <Button
            type="button"
            endIcon={<ArrowForwardIcon color="currentColor" aria-hidden="true" />}
            onClick={onBrowse}
          >
            {t('Turn off Staked only')}
          </Button>
        )}
      </Copy>
      <Artwork aria-hidden={connected || undefined}>
        {connected ? (
          <MascotCard>
            <MascotFace>
              <img src="/logo2.png" width="88" height="88" alt="" />
            </MascotFace>
            <Marker>
              {history ? (
                <HistoryIcon width="17px" color="currentColor" />
              ) : (
                <WalletIcon width="17px" color="currentColor" />
              )}
            </Marker>
          </MascotCard>
        ) : (
          <WalletHeroCards />
        )}
      </Artwork>
    </Panel>
  )
}
