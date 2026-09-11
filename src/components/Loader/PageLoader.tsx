import { CSSProperties, useEffect, useState } from 'react'
import styled from 'styled-components'
import { Spinner } from '@pancakeswap/uikit'

const MAX_TETHER_DISTANCE = 124

const floatMotion = `
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`

const Wrapper = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
`

const Tether = styled.div`
  position: fixed;
  z-index: 0;
  height: 2px;
  border-radius: 999px;
  transform-origin: 0 50%;
  background: linear-gradient(90deg, rgba(119, 88, 255, 0.22), rgba(255, 182, 72, 0.62));
  box-shadow: 0 0 10px rgba(119, 88, 255, 0.16);
`

const LoaderOrb = styled.div`
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1;
  width: 220px;
  height: 220px;
  display: grid;
  place-items: center;
  transform: translate(-50%, -50%);
  will-change: transform;
`

const LoaderVideo = styled.video`
  width: 220px;
  height: 220px;
  object-fit: contain;
  display: block;
  animation: float 2.2s ease-in-out infinite;

  @keyframes float {
    ${floatMotion}
  }
`

const PageLoader: React.FC = () => {
  const [videoError, setVideoError] = useState(false)
  const [motion, setMotion] = useState<{
    x: number
    y: number
    pointerX: number
    pointerY: number
    active: boolean
  } | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    let frame = 0
    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    let velocityX = 0
    let velocityY = 0
    const pointer = { x, y }
    let hasPointer = false

    const handlePointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
      hasPointer = true
    }

    const animate = () => {
      const deltaX = pointer.x - x
      const deltaY = pointer.y - y
      velocityX = (velocityX + deltaX * 0.075) * 0.82
      velocityY = (velocityY + deltaY * 0.075) * 0.82
      x += velocityX
      y += velocityY

      const distance = Math.hypot(pointer.x - x, pointer.y - y)
      if (distance > MAX_TETHER_DISTANCE) {
        const scale = MAX_TETHER_DISTANCE / distance
        x = pointer.x - (pointer.x - x) * scale
        y = pointer.y - (pointer.y - y) * scale
        velocityX *= 0.35
        velocityY *= 0.35
      }

      setMotion({ x, y, pointerX: pointer.x, pointerY: pointer.y, active: hasPointer })
      frame = window.requestAnimationFrame(animate)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    frame = window.requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  const loaderStyle: CSSProperties | undefined = motion
    ? { transform: `translate3d(${motion.x}px, ${motion.y}px, 0) translate(-50%, -50%)` }
    : undefined
  const tetherStyle: CSSProperties | undefined = motion?.active
    ? {
        left: motion.pointerX,
        top: motion.pointerY,
        width: Math.hypot(motion.x - motion.pointerX, motion.y - motion.pointerY),
        transform: `rotate(${Math.atan2(motion.y - motion.pointerY, motion.x - motion.pointerX)}rad)`,
      }
    : undefined

  return (
    <Wrapper>
      {tetherStyle ? <Tether style={tetherStyle} /> : null}
      <LoaderOrb style={loaderStyle}>
        {videoError ? (
          <Spinner />
        ) : (
          <LoaderVideo autoPlay loop muted playsInline onError={() => setVideoError(true)}>
            <source src="/sheep.webm" type="video/webm" />
          </LoaderVideo>
        )}
      </LoaderOrb>
    </Wrapper>
  )
}

export default PageLoader
