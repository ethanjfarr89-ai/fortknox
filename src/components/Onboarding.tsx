import { useState } from 'react'
import { TrendingUp, FileText, FolderOpen, Shield, BarChart3, X, Plus } from 'lucide-react'

interface Props {
  onAddPiece: () => void
}

export default function Onboarding({ onAddPiece }: Props) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('trove_onboarding_complete') === 'true'
  )

  if (dismissed) return null

  const handleDismiss = () => {
    localStorage.setItem('trove_onboarding_complete', 'true')
    setDismissed(true)
  }

  const useCases = [
    {
      icon: TrendingUp,
      title: 'Know your worth',
      description: 'Track real-time melt and appraised values',
    },
    {
      icon: FileText,
      title: 'Document everything',
      description: 'Photos, gemstones, provenance for insurance',
    },
    {
      icon: FolderOpen,
      title: 'Organize freely',
      description: 'Collections, categories, however you like',
    },
    {
      icon: Shield,
      title: 'Share selectively',
      description: 'Control exactly what others see',
    },
    {
      icon: BarChart3,
      title: 'Watch the market',
      description: 'Portfolio charts track your value over time',
    },
  ]

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
          onClick={handleDismiss}
          className="p-1 text-neutral-500 hover:text-neutral-300 transition shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {useCases.map((useCase, i) => (
          <div
            key={i}
            className="flex flex-col items-start gap-2 p-3 rounded-xl bg-neutral-800/50 border border-neutral-800"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold-400/10">
              <useCase.icon className="w-4 h-4 text-gold-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white leading-tight">
                {useCase.title}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5 leading-snug">
                {useCase.description}
              </p>
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
          Get Started
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
