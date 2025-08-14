import { isValidWord } from "./hebrew-dictionary"

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

// בדיקת תקינות מהלך
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

  // בדיקה שהאותיות החדשות יוצרות רצף רציף
  if (newTiles.length > 1) {
    const positions = newTiles.map((t) => t.position)
    const isHorizontal = positions.every((p) => p.row === positions[0].row)
    const isVertical = positions.every((p) => p.col === positions[0].col)

    if (!isHorizontal && !isVertical) {
      errors.push("האותיות חייבות להיות באותה שורה או עמודה")
    }

    if (isHorizontal) {
      positions.sort((a, b) => a.col - b.col)
      for (let i = 1; i < positions.length; i++) {
        const prevCol = positions[i - 1].col
        const currentCol = positions[i].col

        // בדיקה שאין פערים (או שיש אותיות קיימות במקומות הפערים)
        for (let col = prevCol + 1; col < currentCol; col++) {
          if (!hasTileAt(board, positions[0].row, col)) {
            errors.push("האותיות חייבות ליצור רצף רציף")
            break
          }
        }
      }
    }

    if (isVertical) {
      positions.sort((a, b) => a.row - b.row)
      for (let i = 1; i < positions.length; i++) {
        const prevRow = positions[i - 1].row
        const currentRow = positions[i].row

        // בדיקה שאין פערים
        for (let row = prevRow + 1; row < currentRow; row++) {
          if (!hasTileAt(board, row, positions[0].col)) {
            errors.push("האותיות חייבות ליצור רצף רציף")
            break
          }
        }
      }
    }
  }

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

  // בדיקת תקינות כל המילים החדשות
  for (const word of newWords) {
    if (!isValidWord(word.word)) {
      errors.push(`המילה "${word.word}" לא קיימת במילון`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    words: newWords,
  }
}
