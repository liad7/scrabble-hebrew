"use client"

import { useState, useEffect, useRef } from "react"
import { formatTime } from "@/lib/game-logic"

interface GameTimerProps {
  startTimestampMs: number | null
  durationSec: number
  isActive: boolean
  onTimeUp: () => void
}

export function GameTimer({ startTimestampMs, durationSec, isActive, onTimeUp }: GameTimerProps) {
  const computeRemaining = () => {
    if (!startTimestampMs) return durationSec
    const elapsed = Math.floor((Date.now() - startTimestampMs) / 1000)
    return Math.max(0, durationSec - elapsed)
  }

  const [time, setTime] = useState<number>(computeRemaining())
  const calledRef = useRef(false)

  useEffect(() => {
    setTime(computeRemaining())
    calledRef.current = false
  }, [startTimestampMs, durationSec])

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = computeRemaining()
      setTime(remaining)
      if (remaining <= 0 && !calledRef.current) {
        calledRef.current = true
        if (isActive) {
          queueMicrotask(() => onTimeUp())
        }
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isActive, onTimeUp, startTimestampMs, durationSec])

  const isUrgent = time <= 30
  const isCritical = time <= 10

  return (
    <div
      className={`
        text-center px-2 py-1 rounded-lg font-mono text-sm font-bold shadow
        ${
          isCritical
            ? "bg-red-100 text-red-700 animate-pulse"
            : isUrgent
              ? "bg-orange-100 text-orange-700"
              : "bg-blue-100 text-blue-700"
        }
      `}
    >
      <div className="text-[10px] leading-none text-gray-600 mb-0.5">זמן לתור</div>
      <div className="leading-none">{formatTime(time)}</div>
    </div>
  )
}
