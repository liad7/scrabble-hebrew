import type { GameMove } from "@/lib/game-logic"

interface MoveHistoryProps {
  moves: GameMove[]
  playerNames: string[]
}

export function MoveHistory({ moves, playerNames }: MoveHistoryProps) {
  const getActionText = (action: string): string => {
    switch (action) {
      case "place-word":
        return "הניח מילה"
      case "exchange-tiles":
        return "החליף אותיות"
      case "pass":
        return "פאס"
      default:
        return action
    }
  }

  const recentMoves = moves.slice(-5).reverse() // 5 המהלכים האחרונים

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm text-gray-700">מהלכים אחרונים</h4>
      {recentMoves.length === 0 ? (
        <div className="text-xs text-gray-500 italic">אין מהלכים עדיין</div>
      ) : (
        <div className="space-y-1">
          {recentMoves.map((move, index) => (
            <div key={index} className="text-xs bg-gray-50 p-2 rounded">
              <div className="flex justify-between items-center">
                <span className="font-medium">{playerNames[move.playerId]}</span>
                <span className="text-gray-500">
                  {move.timestamp.toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span>{getActionText(move.action)}</span>
                {move.score !== undefined && <span className="font-bold text-green-600">+{move.score}</span>}
              </div>
              {move.word && <div className="text-blue-600 font-hebrew">{move.word}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
