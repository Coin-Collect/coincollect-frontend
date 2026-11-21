import { useEffect, useState } from 'react'
import { useAppDispatch } from 'state'
import { useLottery } from 'state/lottery/hooks'
import { fetchCurrentLottery, setLotteryIsTransitioning } from 'state/lottery'

const useNextEventCountdown = (nextEventTime: number | null): number | null => {
  const dispatch = useAppDispatch()
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null)
  const { currentLotteryId } = useLottery()

  useEffect(() => {
    dispatch(setLotteryIsTransitioning({ isTransitioning: false }))
    if (nextEventTime === null || !Number.isFinite(nextEventTime)) {
      setSecondsRemaining(null)
      return undefined
    }

    const getRemaining = () => Math.max(0, nextEventTime - Math.floor(Date.now() / 1000))
    setSecondsRemaining(getRemaining())

    const timer = setInterval(() => {
      const remaining = getRemaining()
      setSecondsRemaining(remaining)
      if (remaining === 0) {
        clearInterval(timer)
        if (currentLotteryId) {
          dispatch(setLotteryIsTransitioning({ isTransitioning: true }))
          dispatch(fetchCurrentLottery({ currentLotteryId }))
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [nextEventTime, currentLotteryId, dispatch])

  return secondsRemaining
}

export default useNextEventCountdown
