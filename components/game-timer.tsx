"use client"

import { useState, useEffect, useRef } from "react"
import { formatTime } from "@/lib/game-logic"

interface GameTimerProps {
  timeRemaining: number
  isActive: boolean
  onTimeUp: () => void
}

export function GameTimer({ timeRemaining, isActive, onTimeUp }: GameTimerProps) {
  const [time, setTime] = useState(timeRemaining)
  const calledRef = useRef(false)

  useEffect(() => {
    setTime(timeRemaining)
    calledRef.current = false
  }, [timeRemaining])

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          if (!calledRef.current) {
            calledRef.current = true
            // invoke after tick to avoid setState during render chains
            queueMicrotask(() => onTimeUp())
          }
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
