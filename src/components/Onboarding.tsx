import { useState } from 'react'
import { Plus, Gem, Users, Camera, X } from 'lucide-react'

interface Props {
  onAddPiece: () => void
  pieceCount: number
  hasFriends: boolean
}

/**
 * Context-aware onboarding that shows different messages based on user progress.
 * - 0 pieces: welcome + add first piece
 * - 1-2 pieces: encourage adding more, mention features they haven't seen
 * - 3+ pieces with no friends: nudge social features
 * - Otherwise: nothing (they're rolling)
 */
export default function Onboarding({ onAddPiece, pieceCount, hasFriends }: Props) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('trove_onboarding_step') ?? '0'
  )

  const dismiss = (step: string) => {
    localStorage.setItem('trove_onboarding_step', step)
    setDismissed(step)
  }

  // Stage 0: Brand new user, no pieces
  if (pieceCount === 0 && dismissed < '1') {
    return (
      <div className="bg-neutral-900 border border-gold-400/20 rounded-2xl p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gold-400/10 flex items-center justify-center mx-auto mb-4">
          <Gem className="w-8 h-8 text-gold-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Welcome to Trove</h2>
        <p className="text-sm text-neutral-400 max-w-md mx-auto mb-6">
          Catalog your jewelry, track its value with live market prices, and share your collection with friends.
        </p>
        <button
          onClick={onAddPiece}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gold-400 hover:bg-gold-300 text-black font-semibold rounded-lg transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Your First Piece
        </button>
        <button
          onClick={() => dismiss('1')}
          className="block mx-auto mt-3 text-xs text-neutral-600 hover:text-neutral-400 transition"
        >
          I'll explore first
        </button>
      </div>
    )
  }

  // Stage 1: Has 1-2 pieces, show what's possible
  if (pieceCount > 0 && pieceCount <= 2 && dismissed < '2') {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold-400/10 flex items-center justify-center shrink-0 mt-0.5">
            <Camera className="w-4 h-4 text-gold-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">Nice start! Keep going.</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Add more pieces to see your portfolio chart come alive. Include photos, gemstone details, and purchase info to get the most out of Trove.
            </p>
          </div>
          <button onClick={() => dismiss('2')} className="p-1 text-neutral-600 hover:text-neutral-400 transition shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Stage 2: Has pieces but no friends — nudge social
  if (pieceCount >= 3 && !hasFriends && dismissed < '3') {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold-400/10 flex items-center justify-center shrink-0 mt-0.5">
            <Users className="w-4 h-4 text-gold-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">Add friends to unlock Show & Tell</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Share pieces to the feed, react to friends' collections, and discover the Daily Gem. Tap the friends icon in the header to search for people.
            </p>
          </div>
          <button onClick={() => dismiss('3')} className="p-1 text-neutral-600 hover:text-neutral-400 transition shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return null
}
