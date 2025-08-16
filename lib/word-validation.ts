import { isValidWord, normalizeWordVariants } from "./hebrew-dictionary"

// API Configuration
const DICTIONARY_API_URL = 'http://localhost:3002'

// Cache for API calls to avoid duplicate lookups within a turn
const wordValidationCache = new Map<string, boolean>()

/**
 * Validate a single word using the dictionary API
 */
export async function validateWordAPI(word: string): Promise<boolean> {
  if (!word || word.length < 2) return false
  
  // Check cache first
  if (wordValidationCache.has(word)) {
    return wordValidationCache.get(word)!
  }
  
  try {
    const response = await fetch(`${DICTIONARY_API_URL}/dictionary/search?q=${encodeURIComponent(word)}`)
    if (!response.ok) {
      console.error('Dictionary API error:', response.status)
      // Fallback to local validation
      return isValidWord(word)
    }
    
    const result = await response.json()
    const isValid = result.valid === true
    
    // Cache the result
    wordValidationCache.set(word, isValid)
    return isValid
    
  } catch (error) {
    console.error('Error validating word via API:', error)
    // Fallback to local validation
    return isValidWord(word)
  }
}

/**
 * Validate multiple words at once using batch API
 */
export async function validateWordsAPI(words: string[]): Promise<{word: string, valid: boolean}[]> {
  if (!words || words.length === 0) return []
  
  // Check cache for already validated words
  const uncachedWords: string[] = []
  const results: {word: string, valid: boolean}[] = []
  
  for (const word of words) {
    if (wordValidationCache.has(word)) {
      results.push({ word, valid: wordValidationCache.get(word)! })
    } else {
      uncachedWords.push(word)
    }
  }
  
  // Validate uncached words via API
  if (uncachedWords.length > 0) {
    try {
      const response = await fetch(`${DICTIONARY_API_URL}/dictionary/validate-words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ words: uncachedWords })
      })
      
      if (response.ok) {
        const apiResult = await response.json()
        for (const result of apiResult.results) {
          // Cache the result
          wordValidationCache.set(result.word, result.valid)
          results.push(result)
        }
      } else {
        console.error('Dictionary batch API error:', response.status)
        // Fallback to local validation for uncached words
        for (const word of uncachedWords) {
          const isValid = isValidWord(word)
          wordValidationCache.set(word, isValid)
          results.push({ word, valid: isValid })
        }
      }
    } catch (error) {
      console.error('Error validating words via batch API:', error)
      // Fallback to local validation for uncached words
      for (const word of uncachedWords) {
        const isValid = isValidWord(word)
        wordValidationCache.set(word, isValid)
        results.push({ word, valid: isValid })
      }
    }
  }
  
  return results
}

/**
 * Clear validation cache (call at start of each turn)
 */
export function clearValidationCache() {
  wordValidationCache.clear()
}

// סוג של אות על הלוח
export interface BoardTile {
  letter: string
  isNew: boolean // האם האות הונחה בתור הנוכחי
  playerId?: number
}

// סוג של מיקום על הלוח
export interface Position {
  row: number
  col: number
}

// סוג של מילה שנמצאה על הלוח
export interface FoundWord {
  word: string
  positions: Position[]
  isNew: boolean // האם המילה נוצרה בתור הנוכחי
}

// בדיקה אם מיקום תקין בלוח
export function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < 15 && col >= 0 && col < 15
}

// בדיקה אם יש אות במיקום
export function hasTileAt(board: (BoardTile | null)[][], row: number, col: number): boolean {
  return isValidPosition(row, col) && board[row][col] !== null
}

// קבלת אות במיקום
export function getTileAt(board: (BoardTile | null)[][], row: number, col: number): BoardTile | null {
  if (!isValidPosition(row, col)) return null
  return board[row][col]
}

// מציאת כל המילים על הלוח
export function findAllWords(board: (BoardTile | null)[][]): FoundWord[] {
  const words: FoundWord[] = []

  // חיפוש מילים אופקיות
  for (let row = 0; row < 15; row++) {
    let currentWord = ""
    let positions: Position[] = []
    let hasNewTile = false

    for (let col = 0; col < 15; col++) {
      const tile = board[row][col]

      if (tile) {
        currentWord += tile.letter
        positions.push({ row, col })
        if (tile.isNew) hasNewTile = true
      } else {
        // סיום מילה
        if (currentWord.length >= 2) {
          words.push({
            word: currentWord,
            positions: [...positions],
            isNew: hasNewTile,
          })
        }
        currentWord = ""
        positions = []
        hasNewTile = false
      }
    }

    // בדיקת מילה בסוף השורה
    if (currentWord.length >= 2) {
      words.push({
        word: currentWord,
        positions: [...positions],
        isNew: hasNewTile,
      })
    }
  }

  // חיפוש מילים אנכיות
  for (let col = 0; col < 15; col++) {
    let currentWord = ""
    let positions: Position[] = []
    let hasNewTile = false

    for (let row = 0; row < 15; row++) {
      const tile = board[row][col]

      if (tile) {
        currentWord += tile.letter
        positions.push({ row, col })
        if (tile.isNew) hasNewTile = true
      } else {
        // סיום מילה
        if (currentWord.length >= 2) {
          words.push({
            word: currentWord,
            positions: [...positions],
            isNew: hasNewTile,
          })
        }
        currentWord = ""
        positions = []
        hasNewTile = false
      }
    }

    // בדיקת מילה בסוף העמודה
    if (currentWord.length >= 2) {
      words.push({
        word: currentWord,
        positions: [...positions],
        isNew: hasNewTile,
      })
    }
  }

  return words
}

// בדיקת תקינות מהלך (סינכרונית - לתאימות לאחור)
export function validateMove(
  board: (BoardTile | null)[][],
  newTiles: { position: Position; letter: string }[],
  isFirstMove: boolean,
): { isValid: boolean; errors: string[]; words: FoundWord[] } {
  const errors: string[] = []

  // יצירת לוח זמני עם האותיות החדשות
  const tempBoard = board.map((row) => [...row])

  // הוספת האותיות החדשות ללוח הזמני
  newTiles.forEach(({ position, letter }) => {
    tempBoard[position.row][position.col] = {
      letter,
      isNew: true,
    }
  })

  // בדיקה שהמהלך הראשון עובר דרך המרכז
  if (isFirstMove) {
    const usesCenterSquare = newTiles.some((t) => t.position.row === 7 && t.position.col === 7)
    if (!usesCenterSquare) {
      errors.push("המילה הראשונה חייבת לעבור דרך המרכז (★)")
    }
  } else {
    // בדיקה שהאותיות החדשות מתחברות לאותיות קיימות
    let isConnected = false

    for (const { position } of newTiles) {
      const { row, col } = position

      // בדיקת חיבור לאותיות סמוכות
      const adjacentPositions = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
      ]

      for (const adjPos of adjacentPositions) {
        if (hasTileAt(board, adjPos.row, adjPos.col)) {
          isConnected = true
          break
        }
      }

      if (isConnected) break
    }

    if (!isConnected) {
      errors.push("האותיות החדשות חייבות להתחבר לאותיות קיימות על הלוח")
    }
  }

  // מציאת כל המילים ובדיקת תקינותן
  const allWords = findAllWords(tempBoard)
  const newWords = allWords.filter((w) => w.isNew)

  if (newWords.length === 0) {
    errors.push("המהלך חייב ליצור לפחות מילה אחת חדשה")
  }

  // בדיקת תקינות כל המילים החדשות (כולל וריאציות סופיות) - fallback לוקלי
  for (const word of newWords) {
    const variants = normalizeWordVariants(word.word)
    if (!variants.some(isValidWord)) {
      errors.push(`המילה "${word.word}" לא קיימת במילון`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    words: newWords,
  }
}

// בדיקת תקינות מהלך אסינכרונית עם API
export async function validateMoveAPI(
  board: (BoardTile | null)[][],
  newTiles: { position: Position; letter: string }[],
  isFirstMove: boolean,
): Promise<{ isValid: boolean; errors: string[]; words: FoundWord[]; invalidWords?: string[] }> {
  const errors: string[] = []

  // יצירת לוח זמני עם האותיות החדשות
  const tempBoard = board.map((row) => [...row])

  // הוספת האותיות החדשות ללוח הזמני
  newTiles.forEach(({ position, letter }) => {
    tempBoard[position.row][position.col] = {
      letter,
      isNew: true,
    }
  })

  // בדיקה שהמהלך הראשון עובר דרך המרכז
  if (isFirstMove) {
    const usesCenterSquare = newTiles.some((t) => t.position.row === 7 && t.position.col === 7)
    if (!usesCenterSquare) {
      errors.push("המילה הראשונה חייבת לעבור דרך המרכז (★)")
    }
  } else {
    // בדיקה שהאותיות החדשות מתחברות לאותיות קיימות
    let isConnected = false

    for (const { position } of newTiles) {
      const { row, col } = position

      // בדיקת חיבור לאותיות סמוכות
      const adjacentPositions = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
      ]

      for (const adjPos of adjacentPositions) {
        if (hasTileAt(board, adjPos.row, adjPos.col)) {
          isConnected = true
          break
        }
      }

      if (isConnected) break
    }

    if (!isConnected) {
      errors.push("האותיות החדשות חייבות להתחבר לאותיות קיימות על הלוח")
    }
  }

  // מציאת כל המילים ובדיקת תקינותן
  const allWords = findAllWords(tempBoard)
  const newWords = allWords.filter((w) => w.isNew)

  if (newWords.length === 0) {
    errors.push("המהלך חייב ליצור לפחות מילה אחת חדשה")
  }

  // בדיקת תקינות כל המילים החדשות באמצעות API
  const invalidWords: string[] = []
  if (newWords.length > 0) {
    const wordsList = newWords.map(w => w.word)
    const validationResults = await validateWordsAPI(wordsList)
    
    for (const result of validationResults) {
      if (!result.valid) {
        invalidWords.push(result.word)
        errors.push(`המילה "${result.word}" לא קיימת במילון`)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    words: newWords,
    invalidWords
  }
}
