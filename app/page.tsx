"use client"
import { useEffect, useState } from "react"
import { ScrabbleGame } from "@/components/scrabble-game"

export default function Home() {
  // קבלת פרמטרים מכתובת להזנת שמות/הגדרות אוטומטית
  const [query, setQuery] = useState<Record<string, string>>({})
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const obj: Record<string, string> = {}
    sp.forEach((v, k) => (obj[k] = v))
    setQuery(obj)
  }, [])
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="container mx-auto max-w-6xl">
        <ScrabbleGame />
      </div>
    </main>
  )
}
