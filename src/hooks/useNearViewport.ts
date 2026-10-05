import { useCallback, useEffect, useState } from 'react'

const NEAR_VIEWPORT_ROOT_MARGIN = '420px 0px'

/** Tracks a single element near the viewport, with a layout-based fallback for older browsers. */
export default function useNearViewport<T extends Element>() {
  const [element, setElement] = useState<T | null>(null)
  const [isNearViewport, setIsNearViewport] = useState(false)
  const ref = useCallback((node: T | null) => setElement(node), [])

  useEffect(() => {
    if (!element) {
      setIsNearViewport(false)
      return undefined
    }

    if (typeof IntersectionObserver === 'undefined') {
      const checkLayout = () => {
        const rect = element.getBoundingClientRect()
        // Zero-layout environments (such as SSR test renderers) cannot establish visibility safely.
        if (rect.width === 0 && rect.height === 0) {
          setIsNearViewport(true)
          return
        }
        setIsNearViewport(rect.bottom >= -420 && rect.top <= window.innerHeight + 420)
      }
      checkLayout()
      window.addEventListener('scroll', checkLayout, { capture: true, passive: true })
      window.addEventListener('resize', checkLayout)
      return () => {
        window.removeEventListener('scroll', checkLayout, true)
        window.removeEventListener('resize', checkLayout)
      }
    }

    setIsNearViewport(false)
    const observer = new IntersectionObserver(([entry]) => setIsNearViewport(Boolean(entry?.isIntersecting)), {
      rootMargin: NEAR_VIEWPORT_ROOT_MARGIN,
      threshold: 0,
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return { ref, isNearViewport }
}
