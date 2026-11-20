import { useEffect, useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { useTranslation } from 'contexts/Localization'

const HEROES = [1, 3, 7] as const
const HERO_HOLD_MS = 5_000
const SHUFFLE_MS = 480

const moveToFront = keyframes`
  from { transform: var(--right-card); }
  to { transform: var(--front-card); }
`

const moveToLeft = keyframes`
  from { transform: var(--front-card); }
  to { transform: var(--left-card); }
`

const moveBehind = keyframes`
  from { transform: var(--left-card); }
  50% { transform: translate(0, 12%) rotate(0) scale(0.76); }
  to { transform: var(--right-card); }
`

const Showcase = styled.div`
  display: grid;
  justify-items: center;
`

const Deck = styled.div`
  --front-card: translate(0, 0) rotate(0) scale(1);
  --right-card: translate(40%, 5%) rotate(14deg) scale(0.86);
  --left-card: translate(-40%, 5%) rotate(-14deg) scale(0.86);

  position: relative;
  isolation: isolate;
  display: grid;
  place-items: center;
  width: min(100%, 230px);
  min-height: 166px;
`

const HeroCard = styled.div`
  grid-area: 1 / 1;
  position: relative;
  z-index: 3;
  display: grid;
  place-items: center;
  width: clamp(105px, 16vw, 126px);
  aspect-ratio: 0.83;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.34);
  border-radius: 16px;
  background: linear-gradient(150deg, #fde8e6, #d88891);
  box-shadow: 0 10px 24px rgba(30, 17, 54, 0.2);
  transform: var(--front-card);

  &[data-hero='3'] {
    background: linear-gradient(150deg, #fff1cc, #e5ac57);
  }

  &[data-hero='7'] {
    background: linear-gradient(150deg, #eee4ff, #a991d5);
  }

  &[data-slot='1'] {
    z-index: 2;
    transform: var(--right-card);
  }

  &[data-slot='2'] {
    z-index: 1;
    transform: var(--left-card);
  }

  @media (prefers-reduced-motion: no-preference) {
    [data-shuffling='true'] & {
      animation-duration: ${SHUFFLE_MS}ms;
      animation-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
      animation-fill-mode: both;
    }

    [data-shuffling='true'] &[data-slot='0'] {
      animation-name: ${moveToFront};
    }

    [data-shuffling='true'] &[data-slot='1'] {
      z-index: 1;
      animation-name: ${moveBehind};
    }

    [data-shuffling='true'] &[data-slot='2'] {
      z-index: 2;
      animation-name: ${moveToLeft};
    }
  }

  img,
  video {
    position: absolute;
    width: 94%;
    height: 94%;
    object-fit: contain;
    pointer-events: none;
  }

  video {
    opacity: 0;
  }

  video[data-playing='true'] {
    opacity: 1;
  }

  video[data-playing='true'] + img {
    visibility: hidden;
  }
`

const MotionControl = styled.button`
  display: inline-flex;
  min-width: 70px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`

export default function WalletHeroCards() {
  const { t } = useTranslation()
  const deckRef = useRef<HTMLDivElement>(null)
  const [front, setFront] = useState(0)
  const [shuffling, setShuffling] = useState(false)
  const [paused, setPaused] = useState(false)
  const [motionAllowed, setMotionAllowed] = useState(false)
  const [pageVisible, setPageVisible] = useState(false)
  const [inView, setInView] = useState(false)
  const playing = motionAllowed && pageVisible && inView && !paused

  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: no-preference)')
    const syncPreference = () => setMotionAllowed(preference?.matches === true)
    const syncVisibility = () => setPageVisible(!document.hidden)
    syncPreference()
    syncVisibility()
    if (preference?.addEventListener) preference.addEventListener('change', syncPreference)
    else preference?.addListener(syncPreference)
    document.addEventListener('visibilitychange', syncVisibility)
    return () => {
      if (preference?.removeEventListener) preference.removeEventListener('change', syncPreference)
      else preference?.removeListener(syncPreference)
      document.removeEventListener('visibilitychange', syncVisibility)
    }
  }, [])

  useEffect(() => {
    const deck = deckRef.current
    if (!deck) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return undefined
    }
    const observer = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), {
      threshold: 0.2,
    })
    observer.observe(deck)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!playing) {
      setShuffling(false)
      return undefined
    }

    // Hold each hero in front for a full turn before starting the next shuffle.
    const timer = window.setTimeout(
      () => {
        setShuffling(!shuffling)
        if (!shuffling) setFront((current) => (current + 1) % HEROES.length)
      },
      shuffling ? SHUFFLE_MS : HERO_HOLD_MS,
    )
    return () => window.clearTimeout(timer)
  }, [playing, shuffling])

  return (
    <Showcase>
      <Deck ref={deckRef} data-shuffling={playing && shuffling} aria-hidden="true">
        {HEROES.map((id, index) => {
          const slot = (index - front + HEROES.length) % HEROES.length
          const poster = `/images/superheroes/${id}-poster.webp`
          return (
            <HeroCard key={id} data-hero={id} data-slot={slot}>
              {playing && !shuffling && slot === 0 && (
                <video
                  src={`/images/superheroes/${id}.webm`}
                  poster={poster}
                  width="288"
                  height="288"
                  autoPlay
                  muted
                  playsInline
                  loop
                  onPlaying={(event) => {
                    event.currentTarget.dataset.playing = 'true'
                  }}
                />
              )}
              <img src={poster} width="288" height="288" alt="" />
            </HeroCard>
          )
        })}
      </Deck>
      {motionAllowed && (
        <MotionControl
          type="button"
          aria-label={paused ? t('Play hero animation') : t('Pause hero animation')}
          onClick={() => setPaused((current) => !current)}
        >
          {paused ? t('Play') : t('Pause')}
        </MotionControl>
      )}
    </Showcase>
  )
}
