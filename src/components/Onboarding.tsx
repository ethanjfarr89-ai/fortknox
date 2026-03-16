import { useState } from 'react'
import { Gem, FolderOpen, Users, X } from 'lucide-react'

interface Props {
  pieceCount: number
  onAddPiece: () => void
}

export default function Onboarding({ pieceCount, onAddPiece }: Props) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('trove_onboarding_complete') === 'true'
  )

  if (dismissed || pieceCount > 0) return null

  const handleDismiss = () => {
    localStorage.setItem('trove_onboarding_complete', 'true')
    setDismissed(true)
  }

  const steps = [
    {
      icon: Gem,
      title: 'Add your first piece',
      description: 'Log a ring, necklace, watch, or any jewelry with metal and gemstone details.',
    },
    {
      icon: FolderOpen,
      title: 'Organize into collections',
      description: 'Group pieces by occasion, set, or however you like.',
    },
    {
      icon: Users,
      title: 'Share with friends',
      description: 'Connect with others and share collections privately.',
    },
  ]

  return (
    <div className="bg-neutral-900 border border-gold-400/20 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Welcome to Trove</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Your personal jewelry registry and portfolio tracker.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 text-neutral-500 hover:text-neutral-300 transition shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold-400/10 shrink-0 mt-0.5">
              <step.icon className="w-4 h-4 text-gold-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{step.title}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onAddPiece}
          className="flex items-center gap-2 px-5 py-2.5 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition text-sm"
        >
          <Gem className="w-4 h-4" />
          Add Your First Piece
        </button>
        <button
          onClick={handleDismiss}
          className="text-sm text-neutral-500 hover:text-neutral-300 transition"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
