"use client"

import { getLetterPoints } from "@/lib/hebrew-letters"

interface LetterTileProps {
  letter: string
  isSelected?: boolean
  onClick?: () => void
  className?: string
}

export function LetterTile({ letter, isSelected = false, onClick, className = "" }: LetterTileProps) {
  const points = getLetterPoints(letter)
  const isEmpty = letter === ""

  return (
    <div
      className={`
        relative w-10 h-10 rounded-md border-2 cursor-pointer
        flex items-center justify-center font-bold text-lg
        transition-all duration-200 hover:scale-105
        ${
          isEmpty ? "bg-yellow-200 border-yellow-400 text-yellow-600" : "bg-yellow-100 border-yellow-500 text-amber-900"
        }
        ${isSelected ? "ring-2 ring-blue-500 scale-105" : ""}
        ${className}
      `}
      onClick={onClick}
    >
      {/* הניקוד בפינה שמאלית עליונה */}
      {!isEmpty && (
        <span className="absolute top-0 left-0 text-[10px] text-amber-800 px-0.5">
          {points}
        </span>
      )}

      {/* האות */}
      <span className="text-xl font-bold">{isEmpty ? "★" : letter}</span>
    </div>
  )
}
