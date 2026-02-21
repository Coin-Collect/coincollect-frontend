import { useEffect, useRef } from 'react'
import { useAudioModeManager } from 'state/user/hooks'

const INTERACTIVE_SELECTOR = 'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]'

const HOVER_COOLDOWN_MS = 80

const resolveInteractiveTarget = (target: EventTarget | null): HTMLElement | null => {
  if (!(target instanceof Element)) {
    return null
  }

  return target.closest(INTERACTIVE_SELECTOR) as HTMLElement | null
}

const isDisabledTarget = (element: HTMLElement): boolean => {
  if (element.matches(':disabled')) {
    return true
  }

  if (element.getAttribute('aria-disabled') === 'true') {
    return true
  }

  return element.classList.contains('pancake-button--disabled')
}

const GlobalButtonSoundEffects = () => {
  const [audioPlay] = useAudioModeManager()
  const audioContextRef = useRef<AudioContext | null>(null)
  const lastHoverAtRef = useRef(0)

  useEffect(() => {
    if (!audioPlay || typeof window === 'undefined') {
      return undefined
    }

    const globalWindow = window as Window & { webkitAudioContext?: typeof AudioContext }
    const AudioContextClass = window.AudioContext ?? globalWindow.webkitAudioContext

    if (!AudioContextClass) {
      return undefined
    }

    const getAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass()
      }

      const context = audioContextRef.current

      if (!context) {
        return null
      }

      if (context.state === 'suspended') {
        void context.resume()
      }

      return context
    }

    const playTone = (
      context: AudioContext,
      frequency: number,
      endFrequency: number,
      durationSeconds: number,
      gainAmount: number,
      type: OscillatorType,
    ) => {
      const now = context.currentTime
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, now)
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + durationSeconds)

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(gainAmount, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds)

      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + durationSeconds)
    }

    const playHoverSound = () => {
      const context = getAudioContext()
      if (!context) {
        return
      }
      playTone(context, 620, 840, 0.045, 0.012, 'triangle')
    }

    const playClickSound = () => {
      const context = getAudioContext()
      if (!context) {
        return
      }
      playTone(context, 320, 180, 0.07, 0.02, 'triangle')
      playTone(context, 980, 660, 0.04, 0.008, 'sine')
    }

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        return
      }

      const interactiveElement = resolveInteractiveTarget(event.target)
      if (!interactiveElement || isDisabledTarget(interactiveElement)) {
        return
      }

      const relatedElement = event.relatedTarget
      if (relatedElement instanceof Node && interactiveElement.contains(relatedElement)) {
        return
      }

      const now = performance.now()
      if (now - lastHoverAtRef.current < HOVER_COOLDOWN_MS) {
        return
      }

      lastHoverAtRef.current = now
      playHoverSound()
    }

    const onPointerDown = (event: PointerEvent) => {
      const interactiveElement = resolveInteractiveTarget(event.target)
      if (!interactiveElement || isDisabledTarget(interactiveElement)) {
        return
      }

      playClickSound()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return
      }

      const activeElement = document.activeElement
      const interactiveElement = resolveInteractiveTarget(activeElement)
      if (!interactiveElement || isDisabledTarget(interactiveElement)) {
        return
      }

      playClickSound()
    }

    document.addEventListener('pointerover', onPointerOver)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerover', onPointerOver)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [audioPlay])

  return null
}

export default GlobalButtonSoundEffects
