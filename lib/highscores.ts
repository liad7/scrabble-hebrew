"use client"

export type HighscoreCategory =
  | "turn-points"
  | "game-points"
  | "word-points"
  | "longest-word"
  | "bingo-count"

export interface HighscoreEntryBase {
  id: string
  category: HighscoreCategory
  playerName: string
  points: number
  dateISO: string
  gameId?: string
}

export interface WordHighscoreEntry extends HighscoreEntryBase {
  category: "word-points" | "longest-word"
  word: string
}

export interface BingoHighscoreEntry extends HighscoreEntryBase {
  category: "bingo-count"
  bingos: number
}

export type HighscoreEntry = HighscoreEntryBase | WordHighscoreEntry | BingoHighscoreEntry

const STORAGE_KEY = "hebrew-scrabble-highscores"

function getNowISO(): string {
  return new Date().toISOString()
}

export function loadHighscores(): HighscoreEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as HighscoreEntry[]
  } catch {
    return []
  }
}

export function saveHighscores(entries: HighscoreEntry[]): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function addHighscore(entry: Omit<HighscoreEntry, "id" | "dateISO">): HighscoreEntry[] {
  const newEntry: HighscoreEntry = {
    ...entry,
    id: cryptoRandomId(),
    dateISO: getNowISO(),
  } as HighscoreEntry
  const all = loadHighscores()
  const next = [newEntry, ...all]
  saveHighscores(next)
  return next
}

export function getTop(category: HighscoreCategory, limit: number): HighscoreEntry[] {
  const all = loadHighscores().filter((e) => e.category === category)
  return all.sort((a, b) => b.points - a.points).slice(0, limit)
}

export function cryptoRandomId(): string {
  if (typeof window !== "undefined" && window.crypto && "randomUUID" in window.crypto) {
    // @ts-expect-error - randomUUID may not be in older TS lib
    return window.crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}


