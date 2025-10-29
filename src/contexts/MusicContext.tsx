import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

type MusicContextValue = {
  isMusicEnabled: boolean
  toggleMusic: () => void
  setMusicEnabled: (enabled: boolean) => void
}

const MusicContext = createContext<MusicContextValue | undefined>(undefined)

const MUSIC_STORAGE_KEY = 'coincollect-music-enabled'

const PIXEL_DREAMS_SRC = '/PixelDreams.mp3'

type MusicProviderProps = {
  children: ReactNode
}

export const MusicProvider = ({ children }: MusicProviderProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isMusicEnabled, setIsMusicEnabled] = useState(false)

  useEffect(() => {
    audioRef.current = new Audio(PIXEL_DREAMS_SRC)
    audioRef.current.loop = true
    audioRef.current.volume = 0.35

    if (typeof window !== 'undefined') {
      const storedPreference = window.localStorage.getItem(MUSIC_STORAGE_KEY)
      if (storedPreference !== null) {
        setIsMusicEnabled(storedPreference === 'true')
      }
    }

    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!audioRef.current) {
      return
    }

    if (isMusicEnabled) {
      const playAudio = async () => {
        try {
          await audioRef.current?.play()
        } catch (error) {
          console.warn('Unable to start background music automatically:', error)
          setIsMusicEnabled(false)
        }
      }
      playAudio()
    } else {
      audioRef.current.pause()
    }
  }, [isMusicEnabled])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MUSIC_STORAGE_KEY, JSON.stringify(isMusicEnabled))
    }
  }, [isMusicEnabled])

  const toggleMusic = useCallback(() => {
    setIsMusicEnabled((prev) => {
      const next = !prev
      const audioElement = audioRef.current
      if (audioElement) {
        if (next) {
          audioElement.play().catch(() => {
            // Playback will be retried inside the effect and revert if it still fails.
          })
        } else {
          audioElement.pause()
        }
      }
      return next
    })
  }, [])

  const setMusicEnabled = useCallback((enabled: boolean) => {
    setIsMusicEnabled(enabled)
  }, [])

  const value = useMemo(
    () => ({
      isMusicEnabled,
      toggleMusic,
      setMusicEnabled,
    }),
    [isMusicEnabled, toggleMusic, setMusicEnabled],
  )

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>
}

export const useMusic = () => {
  const context = useContext(MusicContext)
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider')
  }
  return context
}
