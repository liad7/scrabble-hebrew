import { ScrabbleGame } from "@/components/scrabble-game"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="container mx-auto max-w-6xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">שבץ נא עברית</h1>
          <p className="text-amber-700">משחק מילים קלאסי בעברית</p>
        </header>
        <ScrabbleGame />
      </div>
    </main>
  )
}
