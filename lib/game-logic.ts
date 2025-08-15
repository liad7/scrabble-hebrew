// סוגי מצבי המשחק
export type GamePhase = "setup" | "playing" | "finished"
export type TurnAction = "place-word" | "exchange-tiles" | "pass"

// מבנה מהלך במשחק
export interface GameMove {
  playerId: number
  action: TurnAction
  timestamp: Date
  score?: number
  word?: string
  tilesUsed?: string[]
  wordScores?: { word: string; score: number }[]
  bingoBonus?: number
}

// מבנה מצב המשחק
export interface GameState {
  phase: GamePhase
  turnNumber: number
  consecutivePasses: number
  isFirstMove: boolean
  moveHistory: GameMove[]
  timePerTurn: number // בשניות
  currentTurnStartTime?: Date
}

// חוקי המשחק
export const GAME_RULES = {
  MAX_CONSECUTIVE_PASSES: 6, // 3 פאסים לכל שחקן = סיום המשחק
  TILES_PER_PLAYER: 7,
  FIRST_WORD_MUST_USE_CENTER: true,
  TIME_PER_TURN: 120, // 2 דקות לתור
  MIN_WORD_LENGTH: 2,
  EXCHANGE_PENALTY: 0, // ללא קנס על החלפת אותיות
}

// בדיקה אם המשחק הסתיים
export function isGameFinished(gameState: GameState, players: any[]): boolean {
  // המשחק נגמר אם:
  // 1. שחקן סיים את כל האותיות שלו
  // 2. 6 פאסים רצופים (3 לכל שחקן)
  // 3. החפיסה ריקה ואף שחקן לא יכול לשחק

  const hasPlayerFinishedTiles = players.some((player: { tiles: string[] }) =>
    player.tiles.filter((t) => t !== "").length === 0,
  )
  const tooManyPasses = gameState.consecutivePasses >= GAME_RULES.MAX_CONSECUTIVE_PASSES

  return hasPlayerFinishedTiles || tooManyPasses
}

// חישוב זמן שנותר לתור
export function getRemainingTurnTime(gameState: GameState): number {
  if (!gameState.currentTurnStartTime) return gameState.timePerTurn

  const elapsed = Math.floor((Date.now() - gameState.currentTurnStartTime.getTime()) / 1000)
  return Math.max(0, gameState.timePerTurn - elapsed)
}

// פורמט זמן לתצוגה
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

// רישום מהלך חדש
export function recordMove(gameState: GameState, move: Omit<GameMove, "timestamp">): GameState {
  const newMove: GameMove = {
    ...move,
    timestamp: new Date(),
  }

  return {
    ...gameState,
    moveHistory: [...gameState.moveHistory, newMove],
    turnNumber: gameState.turnNumber + 1,
    consecutivePasses: move.action === "pass" ? gameState.consecutivePasses + 1 : 0,
    isFirstMove: move.action === "place-word" ? false : gameState.isFirstMove,
    currentTurnStartTime: new Date(),
  }
}

// אתחול מצב משחק חדש
export function createNewGameState(overrides?: Partial<Pick<GameState, "timePerTurn" | "phase">>): GameState {
  return {
    phase: overrides?.phase ?? "setup",
    turnNumber: 1,
    consecutivePasses: 0,
    isFirstMove: true,
    moveHistory: [],
    timePerTurn: overrides?.timePerTurn ?? GAME_RULES.TIME_PER_TURN,
    currentTurnStartTime: new Date(),
  }
}
