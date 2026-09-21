'use client'

import { useEffect, useState } from 'react'

/** Segundos transcurridos desde un instante ISO, actualizado cada segundo. */
export function useElapsed(startedAt: string | null) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!startedAt) return
    const start = new Date(startedAt).getTime()
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return seconds
}
