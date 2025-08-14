"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LetterTile } from "@/components/letter-tile"
import { GameTimer } from "@/components/game-timer"
import { MoveHistory } from "@/components/move-history"
import { ScoreDisplay } from "@/components/score-display"
import { GameStatsComponent } from "@/components/game-stats"
import { createLetterBag, drawTiles } from "@/lib/hebrew-letters"
import {
  type GameState,
  createNewGameState,
  recordMove,
  isGameFinished,
  getRemainingTurnTime,
  GAME_RULES,
} from "@/lib/game-logic"
import { type BoardTile, type Position, validateMove } from "@/lib/word-validation"
import {
  calculateMoveScore,
  calculateFinalScore,
  calculateFinishBonus,
  calculateGameStats,
  type MoveScore,
} from "@/lib/scoring"

// סוגי משבצות מיוחדות בלוח
type SpecialSquare = "triple-word" | "double-word" | "triple-letter" | "double-letter" | "center" | "normal"

// מיקומי המשבצות המיוחדות בלוח 15x15
const SPECIAL_SQUARES: Record<string, SpecialSquare> = {
  // Triple Word Score (פינות ומרכזי הצדדים)
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

function getSquareStyle(squareType: SpecialSquare): string {
  switch (squareType) {
    case "triple-word":
      return "bg-red-500 text-white font-bold text-xs"
    case "double-word":
      return "bg-pink-400 text-white font-bold text-xs"
    case "triple-letter":
      return "bg-blue-500 text-white font-bold text-xs"
    case "double-letter":
      return "bg-sky-300 text-white font-bold text-xs"
    case "center":
      return "bg-pink-500 text-white font-bold text-xs"
    default:
      return "bg-green-100 hover:bg-green-200"
  }
}

function getSquareText(squareType: SpecialSquare): string {
  switch (squareType) {
    case "triple-word":
      return "מילה x3"
    case "double-word":
      return "מילה x2"
    case "triple-letter":
      return "אות x3"
    case "double-letter":
      return "אות x2"
    case "center":
      return "★"
    default:
      return ""
  }
}

interface Player {
  name: string
  score: number
  tiles: string[]
  consecutivePasses: number
}

interface GameSettings {
  boardSize: number
  tilesPerPlayer: number
  includeJokers: boolean
  includeFinalForms: boolean
  timePerTurnSec: number
  bagSizeMultiplier: number
}

export function ScrabbleGame() {
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [letterBag, setLetterBag] = useState<string[]>([])
  const [selectedTiles, setSelectedTiles] = useState<number[]>([])
  const [gameState, setGameState] = useState<GameState>(createNewGameState({ phase: "setup" }))
  const [board, setBoard] = useState<(BoardTile | null)[][]>(() =>
    Array(15)
      .fill(null)
      .map(() => Array(15).fill(null)),
  )
  const [pendingTiles, setPendingTiles] = useState<{ position: Position; letter: string; tileIndex: number }[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [previewScore, setPreviewScore] = useState<MoveScore | null>(null)
  const [players, setPlayers] = useState<Player[]>([
    { name: "שחקן 1", score: 0, tiles: [], consecutivePasses: 0 },
    { name: "שחקן 2", score: 0, tiles: [], consecutivePasses: 0 },
  ])
  const [settings, setSettings] = useState<GameSettings>({
    boardSize: 15,
    tilesPerPlayer: GAME_RULES.TILES_PER_PLAYER,
    includeJokers: true,
    includeFinalForms: true,
    timePerTurnSec: GAME_RULES.TIME_PER_TURN,
    bagSizeMultiplier: 1,
  })
  const [nameDialogOpen, setNameDialogOpen] = useState(true)
  const [pendingNames, setPendingNames] = useState<{ p1: string; p2: string }>({ p1: "", p2: "" })
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)

  // אתחול המשחק
  useEffect(() => {
    // פתיחת חלון הזנת שמות בתחילת המשחק
    setNameDialogOpen(true)
  }, [])

  const initializeGame = () => {
    const bag = createLetterBag({
      includeJokers: settings.includeJokers,
      includeFinalForms: settings.includeFinalForms,
      bagSizeMultiplier: settings.bagSizeMultiplier,
    })
    let remainingBag = bag

    // חלוקת 7 אותיות לכל שחקן
    const updatedPlayers = players.map((player) => {
      const { tiles, remainingBag: newBag } = drawTiles(remainingBag, settings.tilesPerPlayer)
      remainingBag = newBag
      return { ...player, tiles, score: 0, consecutivePasses: 0 }
    })

    setPlayers(updatedPlayers)
    setLetterBag(remainingBag)
    setGameState(createNewGameState({ timePerTurn: settings.timePerTurnSec, phase: "playing" }))
    setCurrentPlayer(0)
    setSelectedTiles([])
    setBoard(
      Array(15)
        .fill(null)
        .map(() => Array(15).fill(null)),
    )
    setPendingTiles([])
    setValidationErrors([])
  }

  // יצירת לוח 15x15
  const renderBoard = () => {
    const board_render = []
    for (let row = 0; row < 15; row++) {
      const rowSquares = []
      for (let col = 0; col < 15; col++) {
        const key = `${row},${col}`
        const squareType = SPECIAL_SQUARES[key] || "normal"
        const squareStyle = getSquareStyle(squareType)
        const squareText = getSquareText(squareType)
        const boardTile = board[row][col]
        const pendingTile = pendingTiles.find((t) => t.position.row === row && t.position.col === col)

        rowSquares.push(
          <div
            key={key}
            className={`
              w-8 h-8 border border-gray-400 flex items-center justify-center
              cursor-pointer transition-colors duration-200 relative
              ${boardTile || pendingTile ? "bg-yellow-100" : squareStyle}
            `}
            onClick={() => handleSquareClick(row, col)}
          >
            {/* אות קיימת או ממתינה */}
            {boardTile || pendingTile ? (
              <div
                className={`
                absolute inset-0 flex items-center justify-center
                ${pendingTile ? "bg-yellow-200 border-2 border-blue-400 rounded" : ""}
              `}
              >
                <span className="text-sm font-bold text-amber-900">{boardTile?.letter || pendingTile?.letter}</span>
              </div>
            ) : (
              <span className="text-[8px] leading-none text-center px-0.5">{squareText}</span>
            )}
          </div>,
        )
      }
      board_render.push(
        <div key={row} className="flex">
          {rowSquares}
        </div>,
      )
    }
    return board_render
  }

  const handleSquareClick = (row: number, col: number) => {
    // אם יש אות במיקום, הסר אותה
    const existingPendingIndex = pendingTiles.findIndex((t) => t.position.row === row && t.position.col === col)
    if (existingPendingIndex !== -1) {
      const removedTile = pendingTiles[existingPendingIndex]
      setPendingTiles((prev) => prev.filter((_, i) => i !== existingPendingIndex))

      // החזר את האות לשחקן
      const updatedPlayers = [...players]
      updatedPlayers[currentPlayer].tiles[removedTile.tileIndex] = removedTile.letter
      setPlayers(updatedPlayers)
      return
    }

    // אם המיקום תפוס או אין אות נבחרת, לא עושים כלום
    if (board[row][col] || selectedTiles.length !== 1) return

    const tileIndex = selectedTiles[0]
    const letter = players[currentPlayer].tiles[tileIndex]

    // הנח את האות על הלוח
    setPendingTiles((prev) => [...prev, { position: { row, col }, letter, tileIndex }])

    // הסר את האות מהשחקן זמנית
    const updatedPlayers = [...players]
    updatedPlayers[currentPlayer].tiles[tileIndex] = ""
    setPlayers(updatedPlayers)
    setSelectedTiles([])
  }

  const handleTileClick = (tileIndex: number) => {
    const letter = players[currentPlayer].tiles[tileIndex]
    if (!letter) return // אות ריקה (כבר הונחה)

    setSelectedTiles((prev) => {
      if (prev.includes(tileIndex)) {
        return prev.filter((i) => i !== tileIndex)
      } else {
        return [tileIndex] // רק אות אחת בכל פעם
      }
    })
  }

  useEffect(() => {
    if (pendingTiles.length > 0) {
      // יצירת לוח זמני עם האותיות החדשות
      const tempBoard = board.map((row) => [...row])
      pendingTiles.forEach(({ position, letter }) => {
        tempBoard[position.row][position.col] = {
          letter,
          isNew: true,
        }
      })

      // בדיקת תקינות וחישוב ניקוד
      const validation = validateMove(
        board,
        pendingTiles.map((t) => ({ position: t.position, letter: t.letter })),
        gameState.isFirstMove,
      )

      if (validation.isValid) {
        const score = calculateMoveScore(
          validation.words,
          pendingTiles.map((t) => t.position),
          tempBoard,
          pendingTiles.length,
        )
        setPreviewScore(score)
      } else {
        setPreviewScore(null)
      }
    } else {
      setPreviewScore(null)
    }
  }, [pendingTiles, board, gameState.isFirstMove])

  const confirmMove = () => {
    if (pendingTiles.length === 0) return

    // בדיקת תקינות המהלך
    const validation = validateMove(
      board,
      pendingTiles.map((t) => ({ position: t.position, letter: t.letter })),
      gameState.isFirstMove,
    )

    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      return
    }

    // המהלך תקין - חישוב ניקוד
    const tempBoard = board.map((row) => [...row])
    pendingTiles.forEach(({ position, letter }) => {
      tempBoard[position.row][position.col] = {
        letter,
        isNew: true,
        playerId: currentPlayer,
      }
    })

    const moveScore = calculateMoveScore(
      validation.words,
      pendingTiles.map((t) => t.position),
      tempBoard,
      pendingTiles.length,
    )

    // עדכון הלוח
    const newBoard = board.map((row) => [...row])
    pendingTiles.forEach(({ position, letter }) => {
      newBoard[position.row][position.col] = {
        letter,
        isNew: false,
        playerId: currentPlayer,
      }
    })

    // עדכון ניקוד השחקן
    const updatedPlayers = [...players]
    updatedPlayers[currentPlayer] = {
      ...updatedPlayers[currentPlayer],
      score: updatedPlayers[currentPlayer].score + moveScore.totalScore,
      consecutivePasses: 0,
    }

    setBoard(newBoard)
    setPendingTiles([])
    setValidationErrors([])
    setPreviewScore(null)

    // רישום המהלך
    const wordsFormed = validation.words.map((w) => w.word).join(", ")
    const newGameState = recordMove(gameState, {
      playerId: currentPlayer,
      action: "place-word",
      word: wordsFormed,
      tilesUsed: pendingTiles.map((t) => t.letter),
      score: moveScore.totalScore,
      wordScores: moveScore.wordScores,
      bingoBonus: moveScore.bingoBonus,
    })

    setGameState(newGameState)

    // בדיקה אם השחקן סיים את כל האותיות
    const tilesUsed = pendingTiles.length
    const remainingPlayerTiles = updatedPlayers[currentPlayer].tiles.filter((t) => t !== "").length - tilesUsed

    if (remainingPlayerTiles === 0) {
      // השחקן סיים - חישוב בונוס
      const allOtherTiles = updatedPlayers
        .filter((_, index) => index !== currentPlayer)
        .flatMap((p) => p.tiles.filter((t) => t !== ""))

      const finishBonus = calculateFinishBonus([allOtherTiles])
      updatedPlayers[currentPlayer].score += finishBonus

      // חישוב ניקוד סופי לכל השחקנים
      updatedPlayers.forEach((player, index) => {
        if (index !== currentPlayer) {
          const remainingTiles = player.tiles.filter((t) => t !== "")
          player.score = calculateFinalScore(player.score, remainingTiles)
        }
      })

      setPlayers(updatedPlayers)
      setGameState((prev) => ({ ...prev, phase: "finished" }))
      return
    }

    // משיכת אותיות חדשות
    if (letterBag.length >= tilesUsed) {
      const { tiles: newTiles, remainingBag } = drawTiles(letterBag, tilesUsed)

      // מלא את המקומות הריקים באותיות חדשות
      let newTileIndex = 0
      for (let i = 0; i < updatedPlayers[currentPlayer].tiles.length; i++) {
        if (updatedPlayers[currentPlayer].tiles[i] === "" && newTileIndex < newTiles.length) {
          updatedPlayers[currentPlayer].tiles[i] = newTiles[newTileIndex]
          newTileIndex++
        }
      }

      setLetterBag(remainingBag)
    }

    setPlayers(updatedPlayers)
    switchPlayer()
  }

  const cancelMove = () => {
    // החזר את כל האותיות לשחקן
    const updatedPlayers = [...players]
    pendingTiles.forEach(({ letter, tileIndex }) => {
      updatedPlayers[currentPlayer].tiles[tileIndex] = letter
    })

    setPlayers(updatedPlayers)
    setPendingTiles([])
    setValidationErrors([])
    setSelectedTiles([])
  }

  const handleTimeUp = useCallback(() => {
    // כאשר הזמן נגמר - פאס אוטומטי
    passMove()
  }, [currentPlayer])

  const switchPlayer = () => {
    setSelectedTiles([])
    const nextPlayer = (currentPlayer + 1) % players.length
    setCurrentPlayer(nextPlayer)

    // עדכון זמן התור החדש
    setGameState((prev) => ({
      ...prev,
      currentTurnStartTime: new Date(),
    }))
  }

  const passMove = () => {
    // רישום מהלך פאס
    const newGameState = recordMove(gameState, {
      playerId: currentPlayer,
      action: "pass",
    })

    // עדכון מספר הפאסים של השחקן
    const updatedPlayers = [...players]
    updatedPlayers[currentPlayer] = {
      ...updatedPlayers[currentPlayer],
      consecutivePasses: updatedPlayers[currentPlayer].consecutivePasses + 1,
    }

    setPlayers(updatedPlayers)
    setGameState(newGameState)

    // בדיקה אם המשחק הסתיים
    if (isGameFinished(newGameState, updatedPlayers)) {
      setGameState((prev) => ({ ...prev, phase: "finished" }))
      return
    }

    switchPlayer()
  }

  const exchangeTiles = () => {
    if (selectedTiles.length === 0) return

    const currentPlayerData = players[currentPlayer]
    const tilesToExchange = selectedTiles.map((index) => currentPlayerData.tiles[index])
    const remainingTiles = currentPlayerData.tiles.filter((_, index) => !selectedTiles.includes(index))

    // החזרת האותיות לחפיסה וערבוב
    const newBag = [...letterBag, ...tilesToExchange]
    for (let i = newBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[newBag[i], newBag[j]] = [newBag[j], newBag[i]]
    }

    // משיכת אותיות חדשות
    const { tiles: newTiles, remainingBag } = drawTiles(newBag, selectedTiles.length)

    // עדכון השחקן
    const updatedPlayers = [...players]
    updatedPlayers[currentPlayer] = {
      ...currentPlayerData,
      tiles: [...remainingTiles, ...newTiles],
      consecutivePasses: 0, // איפוס פאסים כי השחקן פעיל
    }

    // רישום המהלך
    const newGameState = recordMove(gameState, {
      playerId: currentPlayer,
      action: "exchange-tiles",
      tilesUsed: tilesToExchange,
    })

    setPlayers(updatedPlayers)
    setLetterBag(remainingBag)
    setGameState(newGameState)
    setSelectedTiles([])
    switchPlayer()
  }

  const isGameOver = gameState.phase === "finished"
  const winner = isGameOver ? players.reduce((prev, current) => (prev.score > current.score ? prev : current)) : null
  const hasPendingMove = pendingTiles.length > 0
  const gameStats = calculateGameStats(gameState.moveHistory)

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* לוח המשחק */}
      <Card className="p-4 bg-white shadow-lg">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold text-amber-900">לוח המשחק</h2>
          {gameState.isFirstMove && (
            <div className="text-sm text-blue-600 mt-1">המילה הראשונה חייבת לעבור דרך המרכז ★</div>
          )}
          {hasPendingMove && (
            <div className="text-sm text-orange-600 mt-1">{pendingTiles.length} אותיות ממתינות לאישור</div>
          )}
        </div>
        <div className="inline-block border-2 border-amber-600 bg-green-50 p-2 rounded-lg">{renderBoard()}</div>

        {/* תצוגת ניקוד מקדים */}
        <ScoreDisplay moveScore={previewScore} isVisible={hasPendingMove && validationErrors.length === 0} />

        {/* הודעות שגיאה */}
        {validationErrors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">שגיאות במהלך:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* פאנל השחקנים */}
      <div className="flex flex-col gap-4 min-w-[280px]">
        {/* טיימר */}
        {!isGameOver && (
          <GameTimer
            timeRemaining={getRemainingTurnTime(gameState)}
            isActive={gameState.phase === "playing"}
            onTimeUp={handleTimeUp}
          />
        )}

        {/* מידע שחקנים */}
        <Card className="p-4 bg-white shadow-lg">
          <h3 className="text-lg font-bold text-amber-900 mb-3">{isGameOver ? "תוצאות סופיות" : "שחקנים"}</h3>
          {players.map((player, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg mb-2 ${
                isGameOver && winner?.name === player.name
                  ? "bg-green-100 border-2 border-green-500"
                  : currentPlayer === index && !isGameOver
                    ? "bg-amber-100 border-2 border-amber-500"
                    : "bg-gray-50"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">
                  {player.name}
                  {isGameOver && winner?.name === player.name && " 🏆"}
                </span>
                <span className="text-lg font-bold text-amber-700">{player.score}</span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                אותיות: {player.tiles.filter((t) => t !== "").length} | פאסים: {player.consecutivePasses}
              </div>
              {currentPlayer === index && !isGameOver && <div className="text-sm text-amber-600 mt-1">התור שלך!</div>}
            </div>
          ))}

          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              תור מספר: <span className="font-bold">{gameState.turnNumber}</span>
            </div>
            <div className="text-sm text-gray-600">
              אותיות בחפיסה: <span className="font-bold">{letterBag.length}</span>
            </div>
          </div>
        </Card>

        {/* סטטיסטיקות משחק */}
        {isGameOver && (
          <Card className="p-4 bg-white shadow-lg">
            <GameStatsComponent stats={gameStats} players={players} />
          </Card>
        )}

        {/* היסטוריית מהלכים */}
        {!isGameOver && (
          <Card className="p-4 bg-white shadow-lg">
            <MoveHistory moves={gameState.moveHistory} playerNames={players.map((p) => p.name)} />
          </Card>
        )}

        {/* כפתורי פעולה */}
        <Card className="p-4 bg-white shadow-lg">
          <h3 className="text-lg font-bold text-amber-900 mb-3">פעולות</h3>
          <div className="space-y-2">
            {!isGameOver ? (
              <>
                {hasPendingMove ? (
                  <>
                    <Button onClick={confirmMove} className="w-full bg-green-600 hover:bg-green-700">
                      אשר מהלך
                    </Button>
                    <Button
                      onClick={cancelMove}
                      variant="outline"
                      className="w-full border-red-500 text-red-700 hover:bg-red-50 bg-transparent"
                    >
                      בטל מהלך
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={passMove}
                      variant="outline"
                      className="w-full border-orange-500 text-orange-700 hover:bg-orange-50 bg-transparent"
                    >
                      פאס
                    </Button>
                    <Button
                      onClick={exchangeTiles}
                      disabled={selectedTiles.length === 0 || letterBag.length < selectedTiles.length}
                      variant="outline"
                      className="w-full border-amber-600 text-amber-700 hover:bg-amber-50 bg-transparent disabled:opacity-50"
                    >
                      החלף אותיות ({selectedTiles.length})
                    </Button>
                  </>
                )}
              </>
            ) : (
              <div className="text-center text-green-700 font-bold mb-2">המשחק הסתיים!</div>
            )}
            <Button
              onClick={initializeGame}
              variant="outline"
              className="w-full border-gray-400 text-gray-600 hover:bg-gray-50 bg-transparent"
            >
              משחק חדש
            </Button>
          </div>
        </Card>

        {/* אותיות השחקן */}
        {!isGameOver && (
          <Card className="p-4 bg-white shadow-lg">
            <h3 className="text-lg font-bold text-amber-900 mb-3">האותיות של {players[currentPlayer]?.name}</h3>
            <div className="text-xs text-gray-600 mb-2">
              {hasPendingMove ? "לחץ על אות כדי לבחור, לחץ על הלוח כדי להניח" : "בחר אות ולחץ על הלוח כדי להניח"}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {players[currentPlayer]?.tiles.map((letter, index) => (
                <LetterTile
                  key={index}
                  letter={letter}
                  isSelected={selectedTiles.includes(index)}
                  onClick={() => handleTileClick(index)}
                  className={letter === "" ? "opacity-50" : ""}
                />
              ))}
            </div>
            {selectedTiles.length > 0 && <div className="mt-2 text-sm text-blue-600">נבחרה אות להנחה על הלוח</div>}
          </Card>
        )}
      </div>

      {/* דיאלוג הזנת שמות והגדרות */}
      {nameDialogOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-xl p-4 space-y-3">
            <h3 className="text-lg font-bold text-amber-900">ברוך הבא! הזן שמות ובחר הגדרות</h3>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="border rounded p-2"
                placeholder="שם שחקן 1"
                value={pendingNames.p1}
                onChange={(e) => setPendingNames((s) => ({ ...s, p1: e.target.value }))}
              />
              <input
                className="border rounded p-2"
                placeholder="שם שחקן 2"
                value={pendingNames.p2}
                onChange={(e) => setPendingNames((s) => ({ ...s, p2: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.includeJokers}
                  onChange={(e) => setSettings((s) => ({ ...s, includeJokers: e.target.checked }))}
                />
                לשחק עם ג'וקר
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.includeFinalForms}
                  onChange={(e) => setSettings((s) => ({ ...s, includeFinalForms: e.target.checked }))}
                />
                לכלול אותיות סופיות
              </label>
              <label className="flex items-center gap-2">
                <span>מס׳ אותיות לשחקן</span>
                <input
                  type="number"
                  min={1}
                  max={14}
                  className="border rounded p-1 w-16"
                  value={settings.tilesPerPlayer}
                  onChange={(e) => setSettings((s) => ({ ...s, tilesPerPlayer: Number(e.target.value) || 7 }))}
                />
              </label>
              <label className="flex items-center gap-2">
                <span>זמן לתור (ש׳׳)</span>
                <input
                  type="number"
                  min={10}
                  max={600}
                  step={5}
                  className="border rounded p-1 w-20"
                  value={settings.timePerTurnSec}
                  onChange={(e) => setSettings((s) => ({ ...s, timePerTurnSec: Number(e.target.value) || 120 }))}
                />
              </label>
              <label className="flex items-center gap-2">
                <span>גודל חפיסה</span>
                <input
                  type="number"
                  min={0.5}
                  max={3}
                  step={0.5}
                  className="border rounded p-1 w-20"
                  value={settings.bagSizeMultiplier}
                  onChange={(e) => setSettings((s) => ({ ...s, bagSizeMultiplier: Number(e.target.value) || 1 }))}
                />
              </label>
            </div>

            <div className="flex gap-2">
              <button
                className="flex-1 bg-amber-600 text-white rounded p-2"
                onClick={() => {
                  setPlayers((prev) => [
                    { ...prev[0], name: pendingNames.p1 || "שחקן 1" },
                    { ...prev[1], name: pendingNames.p2 || "שחקן 2" },
                  ])
                  setNameDialogOpen(false)
                  initializeGame()
                }}
              >
                התחלת משחק
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
