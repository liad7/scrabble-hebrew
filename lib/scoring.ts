import { getLetterPoints } from "./hebrew-letters"
import type { FoundWord, Position, BoardTile } from "./word-validation"

// סוגי משבצות מיוחדות
type SpecialSquare = "triple-word" | "double-word" | "triple-letter" | "double-letter" | "center" | "normal"

// מיקומי המשבצות המיוחדות (זהה לקובץ הראשי)
const SPECIAL_SQUARES: Record<string, SpecialSquare> = {
  // Triple Word Score
  "0,0": "triple-word",
  "0,7": "triple-word",
  "0,14": "triple-word",
  "7,0": "triple-word",
  "7,14": "triple-word",
  "14,0": "triple-word",
  "14,7": "triple-word",
  "14,14": "triple-word",

  // Double Word Score
  "1,1": "double-word",
  "2,2": "double-word",
  "3,3": "double-word",
  "4,4": "double-word",
  "1,13": "double-word",
  "2,12": "double-word",
  "3,11": "double-word",
  "4,10": "double-word",
  "13,1": "double-word",
  "12,2": "double-word",
  "11,3": "double-word",
  "10,4": "double-word",
  "13,13": "double-word",
  "12,12": "double-word",
  "11,11": "double-word",
  "10,10": "double-word",

  // Triple Letter Score
  "1,5": "triple-letter",
  "1,9": "triple-letter",
  "5,1": "triple-letter",
  "5,5": "triple-letter",
  "5,9": "triple-letter",
  "5,13": "triple-letter",
  "9,1": "triple-letter",
  "9,5": "triple-letter",
  "9,9": "triple-letter",
  "9,13": "triple-letter",
  "13,5": "triple-letter",
  "13,9": "triple-letter",

  // Double Letter Score
  "0,3": "double-letter",
  "0,11": "double-letter",
  "2,6": "double-letter",
  "2,8": "double-letter",
  "3,0": "double-letter",
  "3,7": "double-letter",
  "3,14": "double-letter",
  "6,2": "double-letter",
  "6,6": "double-letter",
  "6,8": "double-letter",
  "6,12": "double-letter",
  "7,3": "double-letter",
  "7,11": "double-letter",
  "8,2": "double-letter",
  "8,6": "double-letter",
  "8,8": "double-letter",
  "8,12": "double-letter",
  "11,0": "double-letter",
  "11,7": "double-letter",
  "11,14": "double-letter",
  "12,6": "double-letter",
  "12,8": "double-letter",
  "14,3": "double-letter",
  "14,11": "double-letter",

  // Center square
  "7,7": "center",
}

// קבלת סוג המשבצת
function getSquareType(row: number, col: number): SpecialSquare {
  return SPECIAL_SQUARES[`${row},${col}`] || "normal"
}

// חישוב ניקוד מילה אחת
export function calculateWordScore(
  word: FoundWord,
  newTilePositions: Position[],
  board: (BoardTile | null)[][],
): number {
  let baseScore = 0
  let wordMultiplier = 1

  // חישוב ניקוד כל אות במילה
  for (const position of word.positions) {
    const { row, col } = position
    const tile = board[row][col]
    if (!tile) continue

    const letterPoints = getLetterPoints(tile.letter)
    let letterScore = letterPoints

    // אם האות הונחה בתור הנוכחי, החל כפלים
    const isNewTile = newTilePositions.some((pos) => pos.row === row && pos.col === col)
    if (isNewTile) {
      const squareType = getSquareType(row, col)

      switch (squareType) {
        case "triple-letter":
          letterScore *= 3
          break
        case "double-letter":
          letterScore *= 2
          break
        case "triple-word":
        case "center": // המרכז פועל כמו triple-word
          wordMultiplier *= 3
          break
        case "double-word":
          wordMultiplier *= 2
          break
      }
    }

    baseScore += letterScore
  }

  return baseScore * wordMultiplier
}

// חישוב ניקוד כולל למהלך
export interface MoveScore {
  totalScore: number
  wordScores: { word: string; score: number }[]
  bingoBonus: number
  hasBonus: boolean
}

export function calculateMoveScore(
  words: FoundWord[],
  newTilePositions: Position[],
  board: (BoardTile | null)[][],
  tilesUsedCount: number,
): MoveScore {
  let totalScore = 0
  const wordScores: { word: string; score: number }[] = []

  // חישוב ניקוד כל מילה
  for (const word of words) {
    const score = calculateWordScore(word, newTilePositions, board)
    totalScore += score
    wordScores.push({ word: word.word, score })
  }

  // בונוס בינגו - שימוש בכל 7 האותיות
  const bingoBonus = tilesUsedCount === 7 ? 50 : 0
  const hasBonus = bingoBonus > 0

  totalScore += bingoBonus

  return {
    totalScore,
    wordScores,
    bingoBonus,
    hasBonus,
  }
}

// חישוב ניקוד סופי בסוף המשחק
export function calculateFinalScore(currentScore: number, remainingTiles: string[]): number {
  // הפחתת ניקוד האותיות שנותרו
  const penalty = remainingTiles.reduce((total, letter) => {
    return total + getLetterPoints(letter)
  }, 0)

  return Math.max(0, currentScore - penalty)
}

// חישוב בונוס למי שסיים ראשון
export function calculateFinishBonus(allPlayersRemainingTiles: string[][]): number {
  let totalRemainingPoints = 0

  for (const tiles of allPlayersRemainingTiles) {
    totalRemainingPoints += tiles.reduce((sum, letter) => {
      return sum + getLetterPoints(letter)
    }, 0)
  }

  return totalRemainingPoints
}

// סטטיסטיקות משחק
export interface GameStats {
  totalWords: number
  averageWordLength: number
  highestScoringWord: { word: string; score: number } | null
  bingoCount: number
  totalTilesPlayed: number
}

export function calculateGameStats(moveHistory: any[]): GameStats {
  let totalWords = 0
  let totalWordLength = 0
  let highestScoringWord: { word: string; score: number } | null = null
  let bingoCount = 0
  let totalTilesPlayed = 0

  for (const move of moveHistory) {
    if (move.action === "place-word" && move.word && move.score) {
      const words = move.word.split(", ")
      totalWords += words.length

      for (const word of words) {
        totalWordLength += word.length

        // עדכון המילה עם הניקוד הגבוה ביותר (קירוב)
        const estimatedScore = Math.floor(move.score / words.length)
        if (!highestScoringWord || estimatedScore > highestScoringWord.score) {
          highestScoringWord = { word, score: estimatedScore }
        }
      }

      if (move.tilesUsed && move.tilesUsed.length === 7) {
        bingoCount++
      }

      totalTilesPlayed += move.tilesUsed ? move.tilesUsed.length : 0
    }
  }

  return {
    totalWords,
    averageWordLength: totalWords > 0 ? Math.round((totalWordLength / totalWords) * 10) / 10 : 0,
    highestScoringWord,
    bingoCount,
    totalTilesPlayed,
  }
}
