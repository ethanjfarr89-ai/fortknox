import { useState } from 'react'
import { TrendingUp, Camera, FolderOpen, Sparkles, BarChart3, X, Plus, Users } from 'lucide-react'

interface Props {
  onAddPiece: () => void
  pieceCount: number
  hasFriends: boolean
}

const features = [
  {
    icon: TrendingUp,
    title: 'Know your worth',
    description: 'Live melt values powered by real-time spot prices',
  },
  {
    icon: Camera,
    title: 'Document everything',
    description: 'Photos, gemstones, hallmarks, and provenance',
  },
  {
    icon: FolderOpen,
    title: 'Organize your way',
    description: 'Collections, categories, wishlists, and archives',
  },
  {
    icon: Sparkles,
    title: 'Show & Tell',
    description: 'Share pieces with friends and discover the Daily Gem',
  },
  {
    icon: BarChart3,
    title: 'Track over time',
    description: 'Portfolio charts that follow your collection\'s journey',
  },
]

export default function Onboarding({ onAddPiece, pieceCount, hasFriends }: Props) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('trove_onboarding_step') ?? '0'
  )

  const dismiss = (step: string) => {
    localStorage.setItem('trove_onboarding_step', step)
    setDismissed(step)
  }

  // Stage 0: Brand new user — full welcome with feature showcase
  if (pieceCount === 0 && dismissed < '1') {
    return (
      <div className="bg-neutral-900 border border-gold-400/20 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Your Collection, Your Way
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              Everything you need to catalog, value, and protect what matters most.
            </p>
          </div>
          <button
            onClick={() => dismiss('1')}
            className="p-1 text-neutral-500 hover:text-neutral-300 transition shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex flex-col items-start gap-2 p-3 rounded-xl bg-neutral-800/50 border border-neutral-800"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold-400/10">
                <f.icon className="w-4 h-4 text-gold-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white leading-tight">{f.title}</p>
                <p className="text-xs text-neutral-500 mt-0.5 leading-snug">{f.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onAddPiece}
            className="flex items-center gap-2 px-5 py-2.5 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Your First Piece
          </button>
          <button
            onClick={() => dismiss('1')}
            className="text-sm text-neutral-500 hover:text-neutral-300 transition"
          >
            I'll explore first
          </button>
        </div>
      </div>
    )
  }

  // Stage 1: Has 1-2 pieces — encourage building out their collection
  if (pieceCount > 0 && pieceCount <= 2 && dismissed < '2') {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold-400/10 flex items-center justify-center shrink-0 mt-0.5">
            <Camera className="w-4 h-4 text-gold-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">Nice start! Keep building your trove.</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Add more pieces to unlock portfolio charts and value tracking. Include photos, gemstone details, and purchase prices to get the most out of Trove.
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
              Share your favorite pieces, react to friends' collections, and discover the Daily Gem. Tap the friends icon in the header to search for people.
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
