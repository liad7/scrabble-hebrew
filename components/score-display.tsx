import type { MoveScore } from "@/lib/scoring"

interface ScoreDisplayProps {
  moveScore: MoveScore | null
  isVisible: boolean
}

export function ScoreDisplay({ moveScore, isVisible }: ScoreDisplayProps) {
  if (!isVisible || !moveScore) return null

  return (
    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      <h4 className="font-bold text-green-800 mb-2">ניקוד המהלך:</h4>

      <div className="space-y-2">
        {moveScore.wordScores.map((wordScore, index) => (
          <div key={index} className="flex justify-between items-center text-sm">
            <span className="font-hebrew font-semibold">{wordScore.word}</span>
            <span className="font-bold text-green-700">{wordScore.score} נקודות</span>
          </div>
        ))}

        {moveScore.hasBonus && (
          <div className="flex justify-between items-center text-sm border-t pt-2">
            <span className="font-semibold text-purple-700">בונוס בינגו! (7 אותיות)</span>
            <span className="font-bold text-purple-700">+{moveScore.bingoBonus} נקודות</span>
          </div>
        )}

        <div className="flex justify-between items-center font-bold text-lg border-t pt-2">
          <span>סה"כ:</span>
          <span className="text-green-800">{moveScore.totalScore} נקודות</span>
        </div>
      </div>
    </div>
  )
}
