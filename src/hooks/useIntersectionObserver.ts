import { useEffect, useState } from 'react'

const useIntersectionObserver = () => {
  const [observedElement, observerRef] = useState<Element | null>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    if (!observedElement || typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry?.isIntersecting ?? false)
    }, { rootMargin: '0px', threshold: 1 })

    observer.observe(observedElement)
    return () => observer.disconnect()
  }, [observedElement])

  return { observerRef, isIntersecting: Boolean(observedElement) && isIntersecting }
}

export default useIntersectionObserver
