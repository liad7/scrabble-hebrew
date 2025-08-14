import type { MoveScore } from "@/lib/scoring"

interface ScoreDisplayProps {
  moveScore: MoveScore | null
  isVisible: boolean
}

export function ScoreDisplay({ moveScore, isVisible }: ScoreDisplayProps) {
  if (!moveScore) return null
  // הופך ל-popover/מודאל קומפקטי בסוף תור בלבד
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm bg-white rounded-xl p-4 shadow-lg">
        <h4 className="font-bold text-green-800 mb-2 text-base">סיכום ניקוד לתור</h4>
        <div className="space-y-2 max-h-64 overflow-auto">
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
        <div className="mt-3 text-left">
          <button className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50" onClick={() => {
            // סוגר את הפופאפ באמצעות אירוע מותאם
            const ev = new CustomEvent('close-score-popup')
            window.dispatchEvent(ev)
          }}>סגירה</button>
        </div>
      </div>
    </div>
  )
}
