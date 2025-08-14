import type { GameStats } from "@/lib/scoring"

interface GameStatsProps {
  stats: GameStats
  players: { name: string; score: number }[]
}

export function GameStatsComponent({ stats, players }: GameStatsProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-gray-700 mb-2">סטטיסטיקות המשחק</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-blue-50 p-2 rounded">
            <div className="font-semibold text-blue-800">מילים שנוצרו</div>
            <div className="text-lg font-bold text-blue-600">{stats.totalWords}</div>
          </div>

          <div className="bg-green-50 p-2 rounded">
            <div className="font-semibold text-green-800">אורך מילה ממוצע</div>
            <div className="text-lg font-bold text-green-600">{stats.averageWordLength}</div>
          </div>

          <div className="bg-purple-50 p-2 rounded">
            <div className="font-semibold text-purple-800">בינגו (7 אותיות)</div>
            <div className="text-lg font-bold text-purple-600">{stats.bingoCount}</div>
          </div>

          <div className="bg-orange-50 p-2 rounded">
            <div className="font-semibold text-orange-800">אותיות ששוחקו</div>
            <div className="text-lg font-bold text-orange-600">{stats.totalTilesPlayed}</div>
          </div>
        </div>

        {stats.highestScoringWord && (
          <div className="mt-2 p-2 bg-yellow-50 rounded">
            <div className="text-xs font-semibold text-yellow-800">המילה עם הניקוד הגבוה ביותר</div>
            <div className="font-bold text-yellow-700">
              {stats.highestScoringWord.word} ({stats.highestScoringWord.score} נקודות)
            </div>
          </div>
        )}
      </div>

      <div>
        <h4 className="font-semibold text-gray-700 mb-2">דירוג סופי</h4>
        <div className="space-y-1">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.name}
              className={`flex justify-between items-center p-2 rounded text-sm ${
                index === 0 ? "bg-gold-50 border border-yellow-300" : "bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="font-bold text-gray-600">#{index + 1}</span>
                <span className={index === 0 ? "font-bold text-yellow-700" : ""}>{player.name}</span>
                {index === 0 && <span>🏆</span>}
              </span>
              <span className={`font-bold ${index === 0 ? "text-yellow-700" : "text-gray-700"}`}>{player.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
