'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function useRestTimer() {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [total, setTotal] = useState(0)
  const [running, setRunning] = useState(false)
  const endRef = useRef<number | null>(null)

  const start = useCallback((seconds: number) => {
    if (seconds <= 0) return
    setTotal(seconds)
    setSecondsLeft(seconds)
    endRef.current = Date.now() + seconds * 1000
    setRunning(true)
  }, [])

  const stop = useCallback(() => {
    setRunning(false)
    setSecondsLeft(0)
    endRef.current = null
  }, [])

  const add = useCallback((seconds: number) => {
    if (!endRef.current) return
    endRef.current += seconds * 1000
    setTotal((t) => t + seconds)
  }, [])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      if (!endRef.current) return
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) {
        setRunning(false)
        endRef.current = null
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(200)
      }
    }, 250)
    return () => clearInterval(id)
  }, [running])

  return { secondsLeft, total, running, start, stop, add }
}
