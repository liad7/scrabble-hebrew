"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
import { addHighscore } from "@/lib/highscores"

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
  const [role, setRole] = useState<"host" | "join">(() => {
    if (typeof window === 'undefined') return "host"
    const sp = new URLSearchParams(window.location.search)
    return sp.get('r') === 'join' ? 'join' : 'host'
  })
  const isHost = role === 'host'
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [hydrated, setHydrated] = useState(false)
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
  const [showScorePopup, setShowScorePopup] = useState(false)
  const [players, setPlayers] = useState<Player[]>([
    { name: "שחקן 1", score: 0, tiles: [], consecutivePasses: 0 },
    { name: "שחקן 2", score: 0, tiles: [], consecutivePasses: 0 },
  ])
  const [settings, setSettings] = useState<GameSettings>({
    boardSize: 15,
    tilesPerPlayer: GAME_RULES.TILES_PER_PLAYER,
    includeJokers: true,
    includeFinalForms: false,
    timePerTurnSec: GAME_RULES.TIME_PER_TURN,
    bagSizeMultiplier: 1,
  })
  const [nameDialogOpen, setNameDialogOpen] = useState(true)
  const [pendingName, setPendingName] = useState<string>("")
  const [urlP1, setUrlP1] = useState<string>("")
  const [urlP2, setUrlP2] = useState<string>("")
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [waitingForJoin, setWaitingForJoin] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [connectedPlayers, setConnectedPlayers] = useState<Array<{ name: string; role: 'host' | 'join' }>>([])
  const [isConnected, setIsConnected] = useState(false)
  const nameLockedRefHost = useRef(false)
  const nameLockedRefJoin = useRef(false)
  const namesFinalizedRef = useRef(false)
  const startedRef = (typeof window !== 'undefined' ? (window as any).__startedRef : { current: false }) as { current: boolean }
  if (typeof window !== 'undefined' && !(window as any).__startedRef) {
    ;(window as any).__startedRef = { current: false }
  }
  const [gameId] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    const sp = new URLSearchParams(window.location.search)
    return sp.get('g') || Math.random().toString(36).slice(2)
  })
  const lastFatalWsErrorRef = useRef<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // אתחול המשחק
  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    // פתיחת חלון הזנת שמות בתחילת המשחק או התחלה אוטומטית מפרמטרים
    const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
    if (sp) {
      const p1 = sp.get("p1") || ""
      const p2 = sp.get("p2") || ""
      const r = sp.get("r")
      const j = sp.get("j")
      const f = sp.get("f")
      const t = sp.get("t")
      const n = sp.get("n")
      const m = sp.get("m")
      const auto = sp.get("auto")
      if (!sp.get('g')) {
        const url = new URL(window.location.href)
        url.searchParams.set('g', gameId)
        window.history.replaceState({}, '', url.toString())
      }

      setRole(r === "join" ? "join" : "host")
      setUrlP1(p1)
      setUrlP2(p2)
      setSettings((s) => ({
        ...s,
        includeJokers: j != null ? j === "1" : s.includeJokers,
        includeFinalForms: f != null ? f === "1" : s.includeFinalForms,
        timePerTurnSec: t ? Math.max(10, Math.min(1800, Number(t) || s.timePerTurnSec)) : s.timePerTurnSec,
        tilesPerPlayer: n ? Math.max(1, Math.min(14, Number(n) || s.tilesPerPlayer)) : s.tilesPerPlayer,
        bagSizeMultiplier: m ? Math.max(0.5, Math.min(3, Number(m) || s.bagSizeMultiplier)) : s.bagSizeMultiplier,
      }))

      if (auto === "1" && p1 && p2) {
        setPlayers((prev) => [
          { ...prev[0], name: p1 || prev[0].name },
          { ...prev[1], name: p2 || prev[1].name },
        ])
        setNameDialogOpen(false)
    initializeGame()
        return
      }
    }
    setNameDialogOpen(true)
  }, [hydrated])

    // WebSocket connection for real-time sync
  useEffect(() => {
    if (!hydrated) return
    
    // Prevent multiple connections
    if ((wsRef.current && wsRef.current.readyState === WebSocket.OPEN) || (ws && ws.readyState === WebSocket.OPEN)) {
      return
    }
    
    const connectWebSocket = () => {
      if (lastFatalWsErrorRef.current) return
      const wsUrl = 'ws://localhost:3001'
      const socket = new WebSocket(wsUrl)
      wsRef.current = socket
      
      socket.addEventListener('open', () => {
        setIsConnected(true)
        const nameToSend = role === 'host' ? (pendingName || players[0]?.name || 'שחקן 1') : (pendingName || players[1]?.name || 'שחקן 2')
        socket.send(JSON.stringify({ 
          type: 'join', 
          gameId, 
          payload: { name: nameToSend, role } 
        }))
      })
      
      socket.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          
          if (msg.type === 'error') {
            console.error('Server error:', msg.payload?.message || 'Unknown error')
            if (msg.payload?.message === 'Game is full') {
              lastFatalWsErrorRef.current = 'Game is full'
            }
            return
          }
          
          if (msg.type === 'state' && msg.payload) {
            const s = msg.payload
            // Update remote game state
            setBoard(s.board)
            setPlayers(s.players)
            setLetterBag(s.letterBag)
            setCurrentPlayer(s.currentPlayer)
            const gs = { ...s.gameState }
            if (gs.currentTurnStartTime && typeof gs.currentTurnStartTime === 'string') {
              gs.currentTurnStartTime = new Date(gs.currentTurnStartTime)
            }
            if (Array.isArray(gs.moveHistory)) {
              gs.moveHistory = gs.moveHistory.map((m: any) => ({
                ...m,
                timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : m.timestamp,
              }))
            }
            setGameState(gs)
            setPendingTiles([])
            setValidationErrors([])
            setNameDialogOpen(false)
          }
          
          if (msg.type === 'presence') {
            const count = msg.payload?.count || 0
            const participants: Array<{ name?: string; role?: 'host' | 'join' }> = msg.payload?.participants || []
            const validParticipants = participants.filter(p => p.name && p.role) as Array<{ name: string; role: 'host' | 'join' }>
            setConnectedPlayers(validParticipants)
            
            if (count >= 2) {
              const hostParticipant = participants.find((p) => p.role === 'host')
              const joinParticipant = participants.find((p) => p.role === 'join')
              
              if (!namesFinalizedRef.current && (hostParticipant?.name || joinParticipant?.name)) {
                setPlayers((prev) => {
                  const next = [...prev]
                  if (hostParticipant?.name) next[0] = { ...next[0], name: hostParticipant.name }
                  if (joinParticipant?.name) next[1] = { ...next[1], name: joinParticipant.name }
                  return next
                })
                if (hostParticipant?.name && joinParticipant?.name) namesFinalizedRef.current = true
              }
              
              setWaitingForJoin(false)
              
              if (role === 'host' && gameState.phase === 'setup') {
                const init = initializeGame()
                const starter = 0
                setCurrentPlayer(starter)
                const start = new Date()
                const outGs = { ...createNewGameState({ timePerTurn: settings.timePerTurnSec, phase: 'playing' }), currentTurnStartTime: start } as any
                setGameState(outGs)
                setTimeout(() => broadcastStateNow({ currentPlayer: starter, gameState: outGs, board: init?.initBoard, players: init?.updatedPlayers, letterBag: init?.remainingBag }), 0)
              }
            } else {
              const validParticipants2 = participants.filter(p => p.name && p.role) as Array<{ name: string; role: 'host' | 'join' }>
              setConnectedPlayers(validParticipants2)
              if (!namesFinalizedRef.current) {
                const hostParticipant = participants.find((p) => p.role === 'host')
                const joinParticipant = participants.find((p) => p.role === 'join')
                setPlayers((prev) => {
                  const next = [...prev]
                  if (hostParticipant?.name) next[0] = { ...next[0], name: hostParticipant.name }
                  if (joinParticipant?.name) next[1] = { ...next[1], name: joinParticipant.name }
                  return next
                })
                if (participants.find(p=>p.role==='host'&&p.name) && participants.find(p=>p.role==='join'&&p.name)) {
                  namesFinalizedRef.current = true
                }
              }
              setWaitingForJoin(true)
            }
          }
          
          if (msg.type === 'action') {
            // Handle real-time actions from other players
            const action = msg.payload
            // Host authoritative commits from non-host
            if (isHost && action.type === 'commit_move') {
              const { board: b, players: p, letterBag: lb, gameState: gs } = action
              setBoard(b)
              setPlayers(p)
              setLetterBag(lb)
              // switch turn and broadcast
              const nextPlayer = (currentPlayer + 1) % p.length
              const newStart = new Date()
              const normalizedHistory = Array.isArray(gs.moveHistory)
                ? gs.moveHistory.map((m: any) => ({ ...m, timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : m.timestamp }))
                : gs.moveHistory
              const outGameState = { ...gs, moveHistory: normalizedHistory, currentTurnStartTime: newStart }
              setCurrentPlayer(nextPlayer)
              setGameState(outGameState)
              broadcastStateNow({ currentPlayer: nextPlayer, gameState: outGameState, board: b, players: p, letterBag: lb })
            }
            if (isHost && action.type === 'commit_pass') {
              const { players: p, letterBag: lb, gameState: gs } = action
              setPlayers(p)
              setLetterBag(lb)
              const nextPlayer = (currentPlayer + 1) % p.length
              const newStart = new Date()
              const normalizedHistory = Array.isArray(gs.moveHistory)
                ? gs.moveHistory.map((m: any) => ({ ...m, timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : m.timestamp }))
                : gs.moveHistory
              const outGameState = { ...gs, moveHistory: normalizedHistory, currentTurnStartTime: newStart }
              setCurrentPlayer(nextPlayer)
              setGameState(outGameState)
              broadcastStateNow({ currentPlayer: nextPlayer, gameState: outGameState, players: p, letterBag: lb })
            }
            if (isHost && action.type === 'commit_exchange') {
              const { players: p, letterBag: lb, gameState: gs } = action
              setPlayers(p)
              setLetterBag(lb)
              const nextPlayer = (currentPlayer + 1) % p.length
              const newStart = new Date()
              const normalizedHistory = Array.isArray(gs.moveHistory)
                ? gs.moveHistory.map((m: any) => ({ ...m, timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : m.timestamp }))
                : gs.moveHistory
              const outGameState = { ...gs, moveHistory: normalizedHistory, currentTurnStartTime: newStart }
              setCurrentPlayer(nextPlayer)
              setGameState(outGameState)
              broadcastStateNow({ currentPlayer: nextPlayer, gameState: outGameState, players: p, letterBag: lb })
            }
            if (action.type === 'tile_placed') {
              // reflect as pending only (not committed)
              setPendingTiles(prev => {
                const exists = prev.some(p => p.position.row === action.position.row && p.position.col === action.position.col)
                return exists ? prev : [...prev, { position: action.position, letter: action.letter, tileIndex: -1 }]
              })
            }
            if (action.type === 'tile_removed') {
              setPendingTiles(prev => prev.filter(p => !(p.position.row === action.position.row && p.position.col === action.position.col)))
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      })
      
      socket.addEventListener('error', (error) => {
        console.log('WebSocket error, retrying in 2 seconds...', error)
        if (wsRef.current !== socket) return
        if (!lastFatalWsErrorRef.current && socket.readyState !== WebSocket.OPEN) {
          setTimeout(connectWebSocket, 2000)
        }
      })
      
      socket.addEventListener('close', () => {
        setIsConnected(false)
        console.log('WebSocket closed, retrying in 2 seconds...')
        if (wsRef.current !== socket) return
        if (!lastFatalWsErrorRef.current && socket.readyState !== WebSocket.OPEN) {
          setTimeout(connectWebSocket, 2000)
        }
      })
      
      setWs(socket)
    }
    
    connectWebSocket()
    
    return () => {
      const current = wsRef.current || ws
      if (current && current.readyState === WebSocket.OPEN) {
        try { current.close() } catch {}
      }
      wsRef.current = null
    }
  }, [hydrated, gameId, role, pendingName])

  const broadcastState = useCallback(() => {
    if (!ws || ws.readyState !== 1) return
    const outHistory = Array.isArray(gameState.moveHistory)
      ? gameState.moveHistory.map((m: any) => ({ ...m, timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp }))
      : gameState.moveHistory
    ws.send(JSON.stringify({
      type: 'state',
      gameId,
      payload: {
        board,
        players,
        letterBag,
        currentPlayer,
        gameState: { ...gameState, moveHistory: outHistory, currentTurnStartTime: gameState.currentTurnStartTime ? new Date(gameState.currentTurnStartTime).toISOString() : undefined },
      },
    }))
  }, [ws, gameId, board, players, letterBag, currentPlayer, gameState])

  const broadcastStateNow = (override?: Partial<{ currentPlayer: number; gameState: GameState; board: (BoardTile | null)[][]; players: Player[]; letterBag: string[] }>) => {
    if (!ws || ws.readyState !== 1) return
    const outCurrentPlayer = override?.currentPlayer ?? currentPlayer
    const outGameStateRaw = override?.gameState ?? gameState
    const outHistory = Array.isArray(outGameStateRaw.moveHistory)
      ? outGameStateRaw.moveHistory.map((m: any) => ({ ...m, timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp }))
      : outGameStateRaw.moveHistory
    const outGameState = { ...outGameStateRaw, moveHistory: outHistory }
    const outBoard = override?.board ?? board
    const outPlayers = override?.players ?? players
    const outLetterBag = override?.letterBag ?? letterBag
    ws.send(JSON.stringify({
      type: 'state',
      gameId,
      payload: {
        board: outBoard,
        players: outPlayers,
        letterBag: outLetterBag,
        currentPlayer: outCurrentPlayer,
        gameState: { ...outGameState, currentTurnStartTime: outGameState.currentTurnStartTime ? new Date(outGameState.currentTurnStartTime).toISOString() : undefined },
      },
    }))
  }

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
    setGameState(createNewGameState({ timePerTurn: settings.timePerTurnSec, phase: "setup" }))
    setSelectedTiles([])
    const initBoard = Array(15)
      .fill(null)
      .map(() => Array(15).fill(null))
    setBoard(initBoard)
    setPendingTiles([])
    setValidationErrors([])
    return { updatedPlayers, remainingBag, initBoard }
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
              w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 border border-gray-400 flex items-center justify-center
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
                <span className="text-xs sm:text-sm font-bold text-amber-900">{boardTile?.letter || pendingTile?.letter}</span>
              </div>
            ) : (
              <span className="text-[6px] sm:text-[8px] leading-none text-center px-0.5">{squareText}</span>
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
    if (gameState.phase !== "playing") return
    // enforce turn
    const myIndex = isHost ? 0 : 1
    if (currentPlayer !== myIndex) return
    // אם יש אות במיקום, הסר אותה
    const existingPendingIndex = pendingTiles.findIndex((t) => t.position.row === row && t.position.col === col)
    if (existingPendingIndex !== -1) {
      const removedTile = pendingTiles[existingPendingIndex]
      setPendingTiles((prev) => prev.filter((_, i) => i !== existingPendingIndex))

      // החזר את האות לשחקן
      const updatedPlayers = [...players]
      updatedPlayers[currentPlayer].tiles[removedTile.tileIndex] = removedTile.letter
      setPlayers(updatedPlayers)
      // Broadcast tile removal
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'action', gameId, payload: { type: 'tile_removed', position: { row, col }, playerId: currentPlayer } }))
      }
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
    // Broadcast tile placement
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'action', gameId, payload: { type: 'tile_placed', position: { row, col }, letter, playerId: currentPlayer } }))
    }
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

  useEffect(() => {
    const handler = () => setShowScorePopup(false)
    window.addEventListener('close-score-popup', handler as EventListener)
    return () => window.removeEventListener('close-score-popup', handler as EventListener)
  }, [])

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
    // החלת אותיות סופיות חזותית על אות אחרונה בכל מילה חדשה
    const toFinal: Record<string, string> = { "כ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "צ": "ץ" }
    validation.words.forEach((w) => {
      const last = w.positions[w.positions.length - 1]
      const t = newBoard[last.row][last.col]
      if (t && toFinal[t.letter]) {
        newBoard[last.row][last.col] = { ...t, letter: toFinal[t.letter] }
      }
    })

    // עדכון ניקוד השחקן והסרת האותיות ששומשו מהרביעייה שלו
    const updatedPlayers = [...players]
    const usedTileIndices = pendingTiles.map((t) => t.tileIndex)
    const clearedTiles = [...updatedPlayers[currentPlayer].tiles]
    usedTileIndices.forEach((idx) => {
      if (idx >= 0) clearedTiles[idx] = ""
    })
    updatedPlayers[currentPlayer] = {
      ...updatedPlayers[currentPlayer],
      tiles: clearedTiles,
      score: updatedPlayers[currentPlayer].score + moveScore.totalScore,
      consecutivePasses: 0,
    }

    setBoard(newBoard)
    setPendingTiles([])
    setValidationErrors([])
    setShowScorePopup(true)

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
    if (!isHost) {
      // בקשה מהמארח לבצע commit ולהעביר תור
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'action', gameId, payload: { type: 'commit_move', board: newBoard, players: updatedPlayers, letterBag: remainingBag, gameState: newGameState } }))
      }
      return
    }

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

      // שמירת שיאים בסיום משחק
      const winnerPlayer = updatedPlayers.reduce((prev, curr) => (prev.score > curr.score ? prev : curr))
      addHighscore({ category: "game-points", playerName: winnerPlayer.name, points: winnerPlayer.score })
      const bingos = newGameState.moveHistory.filter((m) => (m.tilesUsed?.length ?? 0) === 7).length
      if (bingos > 0) {
        addHighscore({ category: "bingo-count", playerName: winnerPlayer.name, points: bingos } as any)
      }
      
      // שדר מצב סיום
      setTimeout(broadcastStateNow, 0)
      return
    }

    // משיכת אותיות חדשות
    let didDraw = false
    let remainingBag = letterBag
    if (letterBag.length >= tilesUsed) {
      const draw = drawTiles(letterBag, tilesUsed)
      const newTiles = draw.tiles
      remainingBag = draw.remainingBag

      // מלא את המקומות הריקים באותיות חדשות
      let newTileIndex = 0
      for (let i = 0; i < updatedPlayers[currentPlayer].tiles.length; i++) {
        if (updatedPlayers[currentPlayer].tiles[i] === "" && newTileIndex < newTiles.length) {
          updatedPlayers[currentPlayer].tiles[i] = newTiles[newTileIndex]
          newTileIndex++
        }
      }

      setLetterBag(remainingBag)
      didDraw = true
    }

    setPlayers(updatedPlayers)
    
    // החלפת שחקן ושידור מצב ע"י המארח בלבד עם overrides טריים
    if (isHost) {
      let computedNext = 0
      setCurrentPlayer(prev => {
        computedNext = (prev + 1) % players.length
        return computedNext
      })
      const newStart = new Date()
      const outGameState = { ...newGameState, currentTurnStartTime: newStart }
      setGameState(outGameState)
      broadcastStateNow({
        currentPlayer: computedNext,
        gameState: outGameState,
        board: newBoard,
        players: updatedPlayers,
        letterBag: didDraw ? remainingBag : letterBag,
      })
    }

    // שמירת שיאים לתור ולמילה
    addHighscore({ category: "turn-points", playerName: updatedPlayers[currentPlayer].name, points: moveScore.totalScore })
    if (moveScore.wordScores.length > 0) {
      const bestWord = moveScore.wordScores.reduce((p, c) => (c.score > p.score ? c : p))
      addHighscore({ category: "word-points", playerName: updatedPlayers[currentPlayer].name, points: bestWord.score, word: bestWord.word } as any)
      const longest = moveScore.wordScores.reduce((p, c) => (c.word.length > p.word.length ? c : p))
      addHighscore({ category: "longest-word", playerName: updatedPlayers[currentPlayer].name, points: longest.word.length, word: longest.word } as any)
    }
  }

  const endTurn = () => {
    // אם יש מהלך ממתין, אשר אותו
    if (pendingTiles.length > 0) {
      confirmMove()
      return
    }
    
    // אחרת, פאס
    setPendingTiles([])
    setValidationErrors([])
    passMove()
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
    // כאשר הזמן נגמר - פאס אוטומטי רק אצל המארח
    if (isHost) {
      passMove()
    }
  }, [currentPlayer, isHost])

  const switchPlayer = (baseState?: GameState) => {
    if (!isHost) return
    setSelectedTiles([])
    const nextPlayer = ((prev => (prev + 1) % p.length))(currentPlayer)
    setCurrentPlayer(nextPlayer)

    // עדכון זמן התור החדש
    const base = baseState ?? gameState
    const newStart = new Date()
    setGameState((prev) => ({
      ...prev,
      currentTurnStartTime: newStart,
    }))
    // שדר מיידית עם הערכים החדשים כדי למנוע השהיה של ה-closure
    broadcastStateNow({ currentPlayer: nextPlayer, gameState: { ...base, currentTurnStartTime: newStart } })
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
    if (!isHost) {
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'action', gameId, payload: { type: 'commit_pass', players: updatedPlayers, letterBag, gameState: newGameState } }))
      }
      return
    }

    // בדיקה אם המשחק הסתיים
    if (isGameFinished(newGameState, updatedPlayers)) {
      setGameState((prev) => ({ ...prev, phase: "finished" }))
      setTimeout(broadcastStateNow, 0)
      return
    }

    if (isHost) {
      let computedNext = 0
      setCurrentPlayer(prev => {
        computedNext = (prev + 1) % players.length
        return computedNext
      })
      const newStart = new Date()
      const outGameState = { ...newGameState, currentTurnStartTime: newStart }
      setGameState(outGameState)
      broadcastStateNow({
        currentPlayer: computedNext,
        gameState: outGameState,
        players: updatedPlayers,
      })
    }
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
    if (!isHost) {
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'action', gameId, payload: { type: 'commit_exchange', players: updatedPlayers, letterBag: remainingBag, gameState: newGameState } }))
      }
      return
    }
    
    setSelectedTiles([])
  }

  const isGameOver = gameState.phase === "finished"
  const winner = isGameOver ? players.reduce((prev, current) => (prev.score > current.score ? prev : current)) : null
  const hasPendingMove = pendingTiles.length > 0
  const gameStats = calculateGameStats(gameState.moveHistory)

  if (!hydrated) {
    return <div className="min-h-screen" />
  }

  return (
    <div className="flex flex-col xl:flex-row gap-4 items-start max-w-full overflow-hidden">
      {/* לוח המשחק */}
              <Card className="p-3 bg-white shadow-lg relative flex-shrink-0 w-full max-w-fit">
        {!isGameOver && (
          <>
            <div className="absolute left-2 top-2 z-10">
              <div className="flex items-center gap-2">
                <GameTimer
                  startTimestampMs={gameState.currentTurnStartTime ? new Date(gameState.currentTurnStartTime).getTime() : null}
                  durationSec={gameState.timePerTurn}
                  isActive={gameState.phase === "playing" && currentPlayer === (isHost ? 0 : 1)}
                  onTimeUp={handleTimeUp}
                />
                {!isGameOver && currentPlayer === (isHost ? 0 : 1) && (
                  <Button size="sm" onClick={endTurn} className="bg-blue-600 hover:bg-blue-700">סיים תור</Button>
                )}
              </div>
            </div>
            <button
              className="absolute right-2 top-2 z-10 bg-white border rounded-full p-2 shadow hover:bg-gray-50"
              aria-label="פעולות"
              onClick={() => setActionsOpen(true)}
            >
              <span>⚙️</span>
            </button>
          </>
        )}
        <div className="mb-4 text-center">
          <h2 className="text-lg font-bold text-amber-900">לוח המשחק</h2>
          <div className="text-sm mt-1">
            תור נוכחי: <span className="font-bold text-amber-700">{players[currentPlayer]?.name || (currentPlayer===0? 'שחקן 1':'שחקן 2')}</span>
          </div>
          {gameState.isFirstMove && (
            <div className="text-sm text-blue-600 mt-1">המילה הראשונה חייבת לעבור דרך המרכז ★</div>
          )}
          {hasPendingMove && (
            <div className="text-sm text-orange-600 mt-1">{pendingTiles.length} אותיות ממתינות לאישור</div>
          )}
          {waitingForJoin && gameState.phase === "setup" && (
            <div className="text-sm text-gray-600 mt-1">ממתין לשחקן השני להצטרפות…</div>
          )}
          {connectedPlayers.length > 0 && (
            <div className="text-sm text-green-600 mt-1">
              שחקנים מחוברים: {connectedPlayers.map(p => p.name).join(', ')}
            </div>
          )}
        </div>
        <div className="inline-block border-2 border-amber-600 bg-green-50 p-1 rounded-lg relative overflow-hidden max-w-full">
          <div className="transform scale-90 sm:scale-100 origin-top-left">
            {renderBoard()}
          </div>
        </div>

        {/* תצוגת ניקוד מקדים */}
        <ScoreDisplay moveScore={previewScore} isVisible={showScorePopup} />

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
        
        {/* אותיות השחקן - צמוד לתחתית הלוח */}
        {!isGameOver && currentPlayer === (isHost ? 0 : 1) && (
          <div className="mt-3">
            <h3 className="text-base font-bold text-amber-900 mb-2">האותיות של {players[currentPlayer]?.name}</h3>
            <div className="text-[11px] text-gray-600 mb-2">
              {hasPendingMove ? "לחץ על אות כדי לבחור, לחץ על הלוח כדי להניח" : "בחר אות ולחץ על הלוח כדי להניח"}
            </div>
            <div className="grid grid-cols-7 gap-1 max-w-full">
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
            {selectedTiles.length > 0 && <div className="mt-2 text-xs text-blue-600">נבחרה אות להניח על הלוח</div>}
          </div>
        )}
      </Card>

      {/* פאנל השחקנים */}
      <div className="flex flex-col gap-3 w-full xl:min-w-[240px] xl:max-w-[260px] flex-shrink-0">
        {/* מידע שחקנים */}
        <Card className="p-3 bg-white shadow-lg">
          <h3 className="text-lg font-bold text-amber-900 mb-3">{isGameOver ? "תוצאות סופיות" : "שחקנים"}</h3>
          {players.map((player, index) => (
            <div
              key={index}
              className={`p-2 rounded-lg mb-2 ${
                isGameOver && winner?.name === player.name
                  ? "bg-green-100 border-2 border-green-500"
                  : currentPlayer === index && !isGameOver
                    ? "bg-amber-100 border-2 border-amber-500"
                    : "bg-gray-50"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">
                  {(() => {
                    const hostName = connectedPlayers.find(p=>p.role==='host')?.name
                    const joinName = connectedPlayers.find(p=>p.role==='join')?.name
                    const display = index===0 ? (hostName || player.name) : (joinName || player.name)
                    return (
                      <>
                        {display}
                        {isGameOver && winner?.name === player.name && " 🏆"}
                      </>
                    )
                  })()}
                </span>
                <span className="text-lg font-bold text-amber-700">{player.score}</span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                אותיות: {player.tiles.filter((t) => t !== "").length} | פאסים: {player.consecutivePasses}
              </div>
              {currentPlayer === index && !isGameOver && <div className="text-sm text-amber-600 mt-1">התור של {players[index].name}</div>}
            </div>
          ))}

          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              תור מספר: <span className="font-bold">{gameState.turnNumber}</span>
            </div>
            <div className="text-sm text-gray-600">
              אותיות בחפיסה: <span className="font-bold">{letterBag.length}</span>
            </div>
            <div className="text-sm text-gray-600">
              שחקנים מחוברים: <span className="font-bold">{connectedPlayers.length}/2</span>
            </div>
          </div>
        </Card>

        {/* סטטיסטיקות משחק */}
        {isGameOver && (
          <Card className="p-3 bg-white shadow-lg">
            <GameStatsComponent stats={gameStats} players={players} />
          </Card>
        )}

        {/* היסטוריית מהלכים */}
        {!isGameOver && (
          <Card className="p-3 bg-white shadow-lg">
            <MoveHistory moves={gameState.moveHistory} playerNames={players.map((p) => p.name)} />
          </Card>
        )}

        {/* סיידבר פעולות */}
        {actionsOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setActionsOpen(false)} />
            <div className="absolute top-0 bottom-0 right-0 w-full sm:w-72 bg-white shadow-xl p-4 overflow-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-amber-900">פעולות</h3>
                <button className="text-sm border px-2 py-1 rounded" onClick={() => setActionsOpen(false)}>x</button>
              </div>
              <div className="space-y-2">
                {!isGameOver ? (
                  <>
                    {hasPendingMove ? (
                      <>
                        <Button onClick={confirmMove} className="w-full bg-green-600 hover:bg-green-700">אשר מהלך</Button>
                        <Button onClick={cancelMove} variant="outline" className="w-full border-red-500 text-red-700 hover:bg-red-50 bg-transparent">בטל מהלך</Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={endTurn} className="w-full bg-blue-600 hover:bg-blue-700">סיום תור</Button>
                        <Button onClick={passMove} variant="outline" className="w-full border-orange-500 text-orange-700 hover:bg-orange-50 bg-transparent">פאס</Button>
                        <Button onClick={exchangeTiles} disabled={selectedTiles.length === 0 || letterBag.length < selectedTiles.length} variant="outline" className="w-full border-amber-600 text-amber-700 hover:bg-amber-50 bg-transparent disabled:opacity-50">החלף אותיות ({selectedTiles.length})</Button>
                      </>
                    )}
                    <Button onClick={() => setNameDialogOpen(true)} variant="outline" className="w-full border-blue-400 text-blue-700 hover:bg-blue-50 bg-transparent">הגדרות משחק</Button>
                  </>
                ) : (
                  <div className="text-center text-green-700 font-bold mb-2">המשחק הסתיים!</div>
                )}
                <Button onClick={initializeGame} variant="outline" className="w-full border-gray-400 text-gray-600 hover:bg-gray-50 bg-transparent" disabled={!isGameOver} title={!isGameOver ? "ניתן להתחיל משחק חדש רק לאחר שסיימתם את המשחק הנוכחי" : undefined}>משחק חדש</Button>
                <Button asChild variant="outline" className="w-full"><a href="/highscores">טבלת שיאים</a></Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* דיאלוג הזנת שמות והגדרות */}
      {nameDialogOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-xl p-4 space-y-3">
            <h3 className="text-lg font-bold text-amber-900">ברוך הבא! הזן את שמך {role === "join" ? "כדי להצטרף" : "ולהגדיר משחק"}</h3>
            <div className="grid grid-cols-1 gap-2">
              <input
                className="border rounded p-2"
                placeholder="השם שלך"
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
              />
            </div>

            {role === "host" && (
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
            )}

            <div className="flex gap-2">
              <button
                className="flex-1 bg-amber-600 text-white rounded p-2"
                onClick={() => {
                  if (role === "host") {
                    // המארח אינו מתחיל; רק מעתיק קישור הזמנה וסוגר חלון
                    if (!pendingName.trim()) return
                    const params = new URLSearchParams()
                    params.set("r", "join")
                    params.set("p1", (pendingName || urlP1 || "שחקן 1").trim())
                    params.set("j", String(settings.includeJokers ? 1 : 0))
                    params.set("f", String(settings.includeFinalForms ? 1 : 0))
                    params.set("t", String(settings.timePerTurnSec))
                    params.set("n", String(settings.tilesPerPlayer))
                    params.set("m", String(settings.bagSizeMultiplier))
                    params.set("auto", "1")
                    params.set("g", gameId)
                    params.set("g", gameId)
                    const url = `${window.location.origin}/?${params.toString()}`
                    setShareUrl(url)
                    navigator.clipboard?.writeText(url).catch(() => void 0)
                    setPlayers((prev) => [
                      { ...prev[0], name: (pendingName || "שחקן 1").trim() },
                      { ...prev[1], name: (urlP2 || prev[1].name).trim() },
                    ])
                    setWaitingForJoin(true)
                    setNameDialogOpen(false)
                    return
                  }
                  // מצטרף: רק קובע שם וסוגר. המארח יאתחל וישדר מצב.
                  if (!pendingName.trim()) return
                  setPlayers((prev) => [
                    { ...prev[0], name: (urlP1 || prev[0].name).trim() },
                    { ...prev[1], name: (pendingName || "שחקן 2").trim() },
                  ])
                  setNameDialogOpen(false)
                }}
              >
                {role === "host" ? "העתקת קישור להזמנה וסגירה" : "התחלת משחק"}
              </button>
      </div>
            {shareUrl && (
              <div className="text-[11px] text-gray-600 break-all">הקישור הועתק: {shareUrl}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
