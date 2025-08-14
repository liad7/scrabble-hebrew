// מערכת האותיות העבריות עם ניקוד וכמות
export interface HebrewLetter {
  letter: string
  points: number
  count: number
}

export const HEBREW_LETTERS: HebrewLetter[] = [
  { letter: "א", points: 1, count: 12 },
  { letter: "ב", points: 3, count: 2 },
  { letter: "ג", points: 3, count: 3 },
  { letter: "ד", points: 2, count: 4 },
  { letter: "ה", points: 1, count: 9 },
  { letter: "ו", points: 1, count: 13 },
  { letter: "ז", points: 10, count: 1 },
  { letter: "ח", points: 4, count: 2 },
  { letter: "ט", points: 4, count: 2 },
  { letter: "י", points: 1, count: 12 },
  { letter: "כ", points: 5, count: 2 },
  { letter: "ל", points: 1, count: 4 },
  { letter: "מ", points: 3, count: 3 },
  { letter: "נ", points: 1, count: 6 },
  { letter: "ס", points: 1, count: 3 },
  { letter: "ע", points: 1, count: 6 },
  { letter: "פ", points: 8, count: 1 },
  { letter: "צ", points: 10, count: 1 },
  { letter: "ק", points: 5, count: 1 },
  { letter: "ר", points: 1, count: 6 },
  { letter: "ש", points: 4, count: 2 },
  { letter: "ת", points: 1, count: 6 },
  { letter: "ך", points: 5, count: 1 },
  { letter: "ם", points: 3, count: 2 },
  { letter: "ן", points: 1, count: 2 },
  { letter: "ף", points: 8, count: 1 },
  { letter: "ץ", points: 10, count: 1 },
  { letter: "", points: 0, count: 2 }, // אריחים ריקים (ג'וקר)
]

export interface LetterBagOptions {
  includeJokers?: boolean
  includeFinalForms?: boolean
  bagSizeMultiplier?: number // מכפיל לכמות האותיות בחפיסה (ברירת מחדל 1)
}

// יצירת חפיסת אותיות מעורבבת לפי אפשרויות המשחק
export function createLetterBag(options: LetterBagOptions = {}): string[] {
  const { includeJokers = true, includeFinalForms = true, bagSizeMultiplier = 1 } = options
  const finalForms = new Set(["ך", "ם", "ן", "ף", "ץ"]) 

  const bag: string[] = []

  HEBREW_LETTERS.forEach(({ letter, count }) => {
    if (!includeJokers && letter === "") return
    if (!includeFinalForms && finalForms.has(letter)) return

    const scaledCount = Math.max(0, Math.round(count * bagSizeMultiplier))
    for (let i = 0; i < scaledCount; i++) {
      bag.push(letter)
    }
  })

  // ערבוב החפיסה
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }

  return bag
}

// קבלת ניקוד של אות
export function getLetterPoints(letter: string): number {
  const letterData = HEBREW_LETTERS.find((l) => l.letter === letter)
  return letterData?.points || 0
}

// חלוקת אותיות לשחקן
export function drawTiles(bag: string[], count: number): { tiles: string[]; remainingBag: string[] } {
  const tiles = bag.slice(0, count)
  const remainingBag = bag.slice(count)
  return { tiles, remainingBag }
}
