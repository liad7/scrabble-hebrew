import { ScrabbleGame } from "@/components/scrabble-game"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="container mx-auto max-w-6xl">
        <ScrabbleGame />
      </div>
    </main>
  )
}
