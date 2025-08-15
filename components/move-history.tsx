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

  const recentMoves = moves.slice(-50).reverse()

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm text-gray-700">מהלכים אחרונים</h4>
      <div className="h-48 overflow-y-auto pr-1">
        {recentMoves.length === 0 ? (
          <div className="text-xs text-gray-500 italic">אין מהלכים עדיין</div>
        ) : (
          <div className="space-y-1">
            {recentMoves.map((move, index) => (
              <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{playerNames[move.playerId]}</span>
                  <span className="text-gray-500">
                    {(() => {
                      const d = typeof (move as any).timestamp === 'string' ? new Date((move as any).timestamp) : (move as any).timestamp
                      return d && typeof (d as any).toLocaleTimeString === 'function'
                        ? d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
                        : ''
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span>{getActionText(move.action)}</span>
                  {move.score !== undefined && <span className="font-bold text-green-600">+{move.score}</span>}
                </div>
                {move.word && <div className="text-blue-600 font-hebrew">{move.word}</div>}
                {move.wordScores && move.wordScores.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {move.wordScores.map((ws, i) => (
                      <div key={i} className="flex justify-between text-[11px] text-gray-700">
                        <span>{ws.word}</span>
                        <span>{ws.score} נק׳</span>
                      </div>
                    ))}
                    {move.bingoBonus ? (
                      <div className="flex justify-between text-[11px] text-purple-700">
                        <span>בונוס בינגו</span>
                        <span>+{move.bingoBonus} נק׳</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
