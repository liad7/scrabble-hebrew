"use client"

import { useState, useEffect } from "react"
import { formatTime } from "@/lib/game-logic"

interface GameTimerProps {
  timeRemaining: number
  isActive: boolean
  onTimeUp: () => void
}

export function GameTimer({ timeRemaining, isActive, onTimeUp }: GameTimerProps) {
  const [time, setTime] = useState(timeRemaining)

  useEffect(() => {
    setTime(timeRemaining)
  }, [timeRemaining])

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          onTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, onTimeUp])

  const isUrgent = time <= 30
  const isCritical = time <= 10

  return (
    <div
      className={`
      text-center p-2 rounded-lg font-mono text-lg font-bold
      ${
        isCritical
          ? "bg-red-100 text-red-700 animate-pulse"
          : isUrgent
            ? "bg-orange-100 text-orange-700"
            : "bg-blue-100 text-blue-700"
      }
    `}
    >
      <div className="text-xs text-gray-600 mb-1">זמן נותר</div>
      <div>{formatTime(time)}</div>
    </div>
  )
}
