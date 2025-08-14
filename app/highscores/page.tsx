"use client"

import { useMemo, useState } from "react"
import { loadHighscores, getTop, type HighscoreCategory } from "@/lib/highscores"

const CATEGORIES: { key: HighscoreCategory; label: string }[] = [
  { key: "turn-points", label: "הכי הרבה נקודות לתור" },
  { key: "game-points", label: "הכי הרבה נקודות למשחק" },
  { key: "word-points", label: "הכי הרבה נקודות למילה" },
  { key: "longest-word", label: "המילה הארוכה ביותר" },
  { key: "bingos", label: "בינגוים במשחק" } as any,
]

export default function HighscoresPage() {
  const [category, setCategory] = useState<HighscoreCategory>("turn-points")
  const [limit, setLimit] = useState<number>(10)

  const entries = useMemo(() => getTop(category, limit), [category, limit])
  const allCount = useMemo(() => loadHighscores().length, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="container mx-auto max-w-3xl">
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <h1 className="text-xl font-bold text-amber-900">טבלת שיאים</h1>
            <a className="text-blue-700 underline" href="/">חזרה למשחק</a>
          </div>
          <div className="flex gap-2 flex-wrap items-center text-sm">
            <select
              className="border rounded p-2"
              value={category}
              onChange={(e) => setCategory(e.target.value as HighscoreCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <select className="border rounded p-2" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value={10}>טופ 10</option>
              <option value={50}>טופ 50</option>
              <option value={100}>טופ 100</option>
            </select>
            <span className="text-gray-500">סה"כ רשומות: {allCount}</span>
          </div>
          <div className="divide-y">
            {entries.length === 0 ? (
              <div className="text-gray-500 text-sm">אין שיאים עדיין</div>
            ) : (
              entries.map((e, idx) => (
                <div key={e.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">#{idx + 1}</span>
                    <span className="font-semibold">{e.playerName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-amber-700">{e.points} נק׳</span>
                    <span className="text-gray-500">{new Date(e.dateISO).toLocaleDateString("he-IL")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  )
}


