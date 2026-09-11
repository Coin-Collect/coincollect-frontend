import { ResetCSS, useTooltip } from '@pancakeswap/uikit'
import Script from 'next/script'
import BigNumber from 'bignumber.js'
import EasterEgg from 'components/EasterEgg'
import GlobalCheckClaimStatus from 'components/GlobalCheckClaimStatus'
import GlobalButtonSoundEffects from 'components/GlobalButtonSoundEffects'
import SubgraphHealthIndicator from 'components/SubgraphHealthIndicator'
import { ToastListener } from 'contexts/ToastsContext'
import useEagerConnect from 'hooks/useEagerConnect'
import { useAccountEventListener } from 'hooks/useAccountEventListener'
import useSentryUser from 'hooks/useSentryUser'
import useUserAgent from 'hooks/useUserAgent'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { PersistGate } from 'redux-persist/integration/react'
import { useStore, persistor } from 'state'
import { usePollBlockNumber } from 'state/block/hooks'
import { usePollCoreFarmData } from 'state/farms/hooks'
import { NextPage } from 'next'
import { Blocklist, Updaters } from '..'
import ErrorBoundary from '../components/ErrorBoundary'
import Menu from '../components/Menu'
import BlockCountry from '../components/BlockCountry'
import Providers from '../Providers'
import GlobalStyle from '../style/Global'
import React from 'react'
import styled from 'styled-components'
import { useRouter } from 'next/router'
import { DEFAULT_META } from 'config/constants/meta'

// This config is required for number formatting
BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

function GlobalHooks() {
  usePollBlockNumber()
  //useEagerConnect()
  usePollCoreFarmData()
  useUserAgent()
  useAccountEventListener()
  useSentryUser()
  return null
}

const WizardLinkBase = styled.a<{ $isDragging: boolean; $isReady: boolean }>`
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.1));
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  cursor: ${({ $isDragging }) => ($isDragging ? 'grabbing' : 'grab')};
  opacity: ${({ $isReady }) => ($isReady ? 1 : 0)};
  pointer-events: ${({ $isReady }) => ($isReady ? 'auto' : 'none')};
  touch-action: none;
  user-select: none;
  -webkit-user-drag: none;
  will-change: transform;
  transition: box-shadow 0.2s ease, filter 0.2s ease;
  text-decoration: none;
  &:hover {
    box-shadow: 0 10px 32px rgba(0, 0, 0, 0.28);
    filter: brightness(1.04);
  }
  &:active {
    filter: brightness(0.98);
  }
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 4px;
  }

  @media (max-width: 768px) {
    width: 68px;
    height: 68px;
  }
`

const WizardVideoBase = styled.video`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  pointer-events: none; /* allow clicks to hit the anchor */
`

type WizardPosition = {
  x: number
  y: number
}

type WizardVelocity = WizardPosition

type WizardPointerState = {
  pointerId: number
  offsetX: number
  offsetY: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  lastTime: number
  velocityX: number
  velocityY: number
  moved: boolean
}

type FloatingWizardProps = {
  assistantUrl: string
  targetRef?: React.Dispatch<React.SetStateAction<HTMLElement | null>>
}

const WIZARD_EDGE_GAP = 16
const WIZARD_DRAG_THRESHOLD = 6
const WIZARD_BOUNCE = 0.72
const WIZARD_FRICTION = 0.94
const WIZARD_MAX_FLING_SPEED = 2200

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const getWizardBounds = (element: HTMLElement | null) => {
  const width = element?.getBoundingClientRect().width ?? 84
  const height = element?.getBoundingClientRect().height ?? 84
  const maxX = Math.max(WIZARD_EDGE_GAP, window.innerWidth - width - WIZARD_EDGE_GAP)
  const maxY = Math.max(WIZARD_EDGE_GAP, window.innerHeight - height - WIZARD_EDGE_GAP)

  return {
    minX: WIZARD_EDGE_GAP,
    minY: WIZARD_EDGE_GAP,
    maxX,
    maxY,
  }
}

const FloatingWizard: React.FC<FloatingWizardProps> = ({ assistantUrl, targetRef }) => {
  const linkRef = useRef<HTMLAnchorElement | null>(null)
  const pointerRef = useRef<WizardPointerState | null>(null)
  const positionRef = useRef<WizardPosition | null>(null)
  const velocityRef = useRef<WizardVelocity>({ x: 0, y: 0 })
  const animationFrameRef = useRef<number | null>(null)
  const animationTimeRef = useRef<number | null>(null)
  const draggedRef = useRef(false)
  const [position, setPosition] = useState<WizardPosition | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const setLinkRef = useCallback(
    (node: HTMLAnchorElement | null) => {
      linkRef.current = node
      targetRef?.(node)
    },
    [targetRef],
  )

  const updatePosition = useCallback((nextPosition: WizardPosition) => {
    positionRef.current = nextPosition
    setPosition(nextPosition)
  }, [])

  const stopPhysics = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    animationTimeRef.current = null
  }, [])

  const startPhysics = useCallback(() => {
    stopPhysics()

    const tick = (timestamp: number) => {
      const currentPosition = positionRef.current
      if (!currentPosition) {
        animationFrameRef.current = null
        return
      }

      const previousTimestamp = animationTimeRef.current ?? timestamp
      const deltaSeconds = Math.min((timestamp - previousTimestamp) / 1000, 0.035)
      animationTimeRef.current = timestamp

      const bounds = getWizardBounds(linkRef.current)
      const velocity = velocityRef.current
      const damping = Math.pow(WIZARD_FRICTION, deltaSeconds * 60)
      let nextX = currentPosition.x + velocity.x * deltaSeconds
      let nextY = currentPosition.y + velocity.y * deltaSeconds
      let nextVelocityX = velocity.x * damping
      let nextVelocityY = velocity.y * damping

      if (nextX <= bounds.minX && nextVelocityX < 0) {
        nextX = bounds.minX
        nextVelocityX = Math.abs(nextVelocityX) * WIZARD_BOUNCE
      } else if (nextX >= bounds.maxX && nextVelocityX > 0) {
        nextX = bounds.maxX
        nextVelocityX = -Math.abs(nextVelocityX) * WIZARD_BOUNCE
      }

      if (nextY <= bounds.minY && nextVelocityY < 0) {
        nextY = bounds.minY
        nextVelocityY = Math.abs(nextVelocityY) * WIZARD_BOUNCE
      } else if (nextY >= bounds.maxY && nextVelocityY > 0) {
        nextY = bounds.maxY
        nextVelocityY = -Math.abs(nextVelocityY) * WIZARD_BOUNCE
      }

      const nextVelocity = { x: nextVelocityX, y: nextVelocityY }
      velocityRef.current = nextVelocity
      updatePosition({ x: nextX, y: nextY })

      if (Math.hypot(nextVelocity.x, nextVelocity.y) < 14) {
        velocityRef.current = { x: 0, y: 0 }
        animationFrameRef.current = null
        animationTimeRef.current = null
        return
      }

      animationFrameRef.current = window.requestAnimationFrame(tick)
    }

    animationFrameRef.current = window.requestAnimationFrame(tick)
  }, [stopPhysics, updatePosition])

  useEffect(() => {
    const element = linkRef.current
    if (!element) return undefined

    const bounds = getWizardBounds(element)
    updatePosition({ x: bounds.maxX, y: bounds.maxY })

    const handleResize = () => {
      const currentPosition = positionRef.current
      if (!currentPosition) return

      const nextBounds = getWizardBounds(element)
      updatePosition({
        x: clamp(currentPosition.x, nextBounds.minX, nextBounds.maxX),
        y: clamp(currentPosition.y, nextBounds.minY, nextBounds.maxY),
      })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      stopPhysics()
    }
  }, [stopPhysics, updatePosition])

  const handlePointerDown = (event: React.PointerEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || !positionRef.current) return

    stopPhysics()
    velocityRef.current = { x: 0, y: 0 }
    draggedRef.current = false
    pointerRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - positionRef.current.x,
      offsetY: event.clientY - positionRef.current.y,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: performance.now(),
      velocityX: 0,
      velocityY: 0,
      moved: false,
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLAnchorElement>) => {
    const pointer = pointerRef.current
    if (!pointer || pointer.pointerId !== event.pointerId) return

    const distanceFromStart = Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY)
    if (!pointer.moved && distanceFromStart < WIZARD_DRAG_THRESHOLD) return
    pointer.moved = true
    draggedRef.current = true

    const bounds = getWizardBounds(linkRef.current)
    const nextPosition = {
      x: clamp(event.clientX - pointer.offsetX, bounds.minX, bounds.maxX),
      y: clamp(event.clientY - pointer.offsetY, bounds.minY, bounds.maxY),
    }
    const now = performance.now()
    const deltaSeconds = Math.max((now - pointer.lastTime) / 1000, 0.008)
    const instantVelocityX = (event.clientX - pointer.lastX) / deltaSeconds
    const instantVelocityY = (event.clientY - pointer.lastY) / deltaSeconds

    pointer.velocityX = pointer.velocityX * 0.35 + instantVelocityX * 0.65
    pointer.velocityY = pointer.velocityY * 0.35 + instantVelocityY * 0.65
    pointer.lastX = event.clientX
    pointer.lastY = event.clientY
    pointer.lastTime = now
    updatePosition(nextPosition)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLAnchorElement>) => {
    const pointer = pointerRef.current
    if (!pointer || pointer.pointerId !== event.pointerId) return

    pointerRef.current = null
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (!pointer.moved) {
      velocityRef.current = { x: 0, y: 0 }
      return
    }

    const speed = Math.hypot(pointer.velocityX, pointer.velocityY)
    const velocityScale = speed > WIZARD_MAX_FLING_SPEED ? WIZARD_MAX_FLING_SPEED / speed : 1
    velocityRef.current = {
      x: pointer.velocityX * velocityScale,
      y: pointer.velocityY * velocityScale,
    }
    startPhysics()
  }

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!draggedRef.current) return

    event.preventDefault()
    event.stopPropagation()
    draggedRef.current = false
  }

  return (
    <WizardLinkBase
      ref={setLinkRef}
      $isDragging={isDragging}
      $isReady={position !== null}
      style={position ? { transform: `translate3d(${position.x}px, ${position.y}px, 0)` } : undefined}
      href={assistantUrl}
      target={assistantUrl.startsWith('http') ? '_blank' : undefined}
      rel={assistantUrl.startsWith('http') ? 'noreferrer noopener' : undefined}
      aria-label="Open AI Assistant"
      title={
        assistantUrl === '#' ? 'AI Assistant coming soon' : 'Drag or throw Wizard, or click to open the AI Assistant'
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
      onDragStart={(event) => event.preventDefault()}
    >
      <WizardVideoBase src="/wizzard.webm" autoPlay loop muted playsInline />
    </WizardLinkBase>
  )
}

function MyApp(props: AppProps) {
  const { pageProps } = props
  // @ts-ignore
  const store = useStore(pageProps.initialReduxState)
  const router = useRouter()

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL ?? 'https://app.coincollect.org'
  const normalizedBaseUrl = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl

  const pageLevelMeta = ((pageProps as unknown as { meta?: Record<string, string>; initialMeta?: Record<string, string> })
    ?.meta ??
    (pageProps as unknown as { meta?: Record<string, string>; initialMeta?: Record<string, string> })?.initialMeta) ?? {}

  const title = pageLevelMeta.title ?? DEFAULT_META.title
  const description = pageLevelMeta.description ?? DEFAULT_META.description

  const toAbsoluteUrl = (value?: string) => {
    if (!value) {
      return undefined
    }
    if (value.startsWith('http')) {
      return value
    }
    const path = value.startsWith('/') ? value : `/${value}`
    return `${normalizedBaseUrl}${path}`
  }

  const image = toAbsoluteUrl(pageLevelMeta.image) ?? DEFAULT_META.image
  const canonical =
    pageLevelMeta.url ??
    `${normalizedBaseUrl}${router?.asPath ? router.asPath.split('#')[0].split('?')[0] : ''}`

  return (
    <>
      <Head>
        <title key="app:title">{title}</title>
        <meta key="app:description" name="description" content={description} />
        <meta key="app:og:title" property="og:title" content={title} />
        <meta key="app:og:description" property="og:description" content={description} />
        <meta key="app:og:image" property="og:image" content={image} />
        <meta key="app:og:url" property="og:url" content={canonical} />
        <meta key="app:og:type" property="og:type" content="website" />
        <meta key="app:twitter:card" name="twitter:card" content="summary_large_image" />
        <meta key="app:twitter:title" name="twitter:title" content={title} />
        <meta key="app:twitter:description" name="twitter:description" content={description} />
        <meta key="app:twitter:image" name="twitter:image" content={image} />
        <link key="app:canonical" rel="canonical" href={canonical} />
        <meta
          key="app:viewport"
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, minimum-scale=1, viewport-fit=cover"
        />
        <meta key="app:theme-color" name="theme-color" content="#E91E63" />
      </Head>
      <Providers store={store}>
        <Blocklist>
          <GlobalHooks />
          <GlobalButtonSoundEffects />
          <Updaters />
          <ResetCSS />
          <GlobalStyle />
          <GlobalCheckClaimStatus excludeLocations={[]} />
          <PersistGate loading={null} persistor={persistor}>
            <BlockCountry />
            <App {...props} />
          </PersistGate>
        </Blocklist>
      </Providers>
      <Script
        strategy="afterInteractive"
        id="google-tag"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer', '${process.env.NEXT_PUBLIC_GTAG}');
          `,
        }}
      />
    </>
  )
}

type NextPageWithLayout = NextPage & {
  Layout?: React.FC
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

const ProductionErrorBoundary = process.env.NODE_ENV === 'production' ? ErrorBoundary : Fragment

const App = ({ Component, pageProps }: AppPropsWithLayout) => {
  // Use the layout defined at the page level, if available
  const Layout = Component.Layout || Fragment
  const assistantUrl = process.env.NEXT_PUBLIC_AI_ASSISTANT_URL || 'https://chatgpt.com/g/g-68be838798b88191be7523dce0b90b2c-coincollect-wizard'
  
  // Detect if device is mobile to conditionally show tooltip
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window)
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])
  
  const { targetRef, tooltip, tooltipVisible } = useTooltip(
    <div>
      Meet Wizard, your AI assistant here to help you navigate CoinCollect.
      <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>
        AI Assistant powered by OpenAI, created by <a href="https://sapienx.app/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>SapienX</a>
      </div>
    </div>,
    { placement: 'top' }
  )
  
  return (
    <ProductionErrorBoundary>
      <Menu>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </Menu>
      <EasterEgg iterations={2} />
      <ToastListener />
      <FloatingWizard assistantUrl={assistantUrl} targetRef={isMobile ? undefined : targetRef} />
      {!isMobile && tooltipVisible && tooltip}
      {/* TODO: Activate later
      <SubgraphHealthIndicator />
      */}
    </ProductionErrorBoundary>
  )
}

export default MyApp
