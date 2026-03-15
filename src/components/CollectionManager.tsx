import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import type { Collection } from '../types'
import { useScrollLock } from '../lib/useScrollLock'

interface Props {
  collections: Collection[]
  onAdd: (name: string, description?: string) => Promise<{ error: unknown }>
  onDelete: (id: string) => Promise<{ error: unknown }>
  onClose: () => void
}

export default function CollectionManager({ collections, onAdd, onDelete, onClose }: Props) {
  useScrollLock()
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    if (!name.trim()) return
    setAdding(true)
    await onAdd(name.trim())
    setName('')
    setAdding(false)
  }

  const inputCls = 'w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition text-sm text-white placeholder-neutral-500'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm border border-neutral-800">
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">Manage Collections</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg transition">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className={inputCls}
              placeholder="New collection name"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !name.trim()}
              className="px-3 py-2 bg-gold-400 hover:bg-gold-300 text-black rounded-lg transition disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {collections.length === 0 ? (
              <p className="text-xs text-neutral-500">No collections yet. Create one to organize your pieces.</p>
            ) : (
              collections.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-neutral-800 rounded-lg p-3">
                  <span className="text-sm text-white">{c.name}</span>
                  <button
                    onClick={() => { if (window.confirm(`Delete "${c.name}"?`)) onDelete(c.id) }}
                    className="p-1 hover:bg-neutral-700 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-neutral-500 hover:text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
