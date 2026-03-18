import { useState } from 'react'
import { X, DollarSign, Calendar, User, Archive, Trash2 } from 'lucide-react'
import type { JewelryPiece, PieceStatus } from '../types'
import { PIECE_STATUSES } from '../types'
import { useScrollLock } from '../lib/useScrollLock'

interface Props {
  piece: JewelryPiece
  onRetire: (id: string, opts: { status: PieceStatus; date_departed: string; sale_price?: number | null; departed_to?: string | null }) => Promise<unknown>
  onHardDelete: (id: string) => Promise<unknown>
  onClose: () => void
}

export default function RetireModal({ piece, onRetire, onHardDelete, onClose }: Props) {
  useScrollLock()
  const [status, setStatus] = useState<PieceStatus | null>(null)
  const [dateDeparted, setDateDeparted] = useState(new Date().toISOString().split('T')[0])
  const [salePrice, setSalePrice] = useState('')
  const [departedTo, setDepartedTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHardDelete, setShowHardDelete] = useState(false)

  const handleRetire = async () => {
    if (!status) return
    setLoading(true)
    await onRetire(piece.id, {
      status,
      date_departed: dateDeparted,
      sale_price: status === 'sold' && salePrice ? parseFloat(salePrice) : null,
      departed_to: departedTo || null,
    })
    setLoading(false)
    onClose()
  }

  const handleHardDelete = async () => {
    if (!window.confirm(`Permanently delete "${piece.name}"? This cannot be undone and will remove it from all historical data.`)) return
    setLoading(true)
    await onHardDelete(piece.id)
    setLoading(false)
    onClose()
  }

  const departedToLabel = status === 'sold' ? 'Sold to' : status === 'gifted_away' ? 'Gifted to' : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md border border-neutral-800">
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Archive Piece</h2>
            <p className="text-sm text-neutral-500 mt-0.5 truncate max-w-[280px]">{piece.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-neutral-500 hover:text-white transition rounded-lg hover:bg-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">What happened?</label>
            <div className="grid grid-cols-2 gap-2">
              {PIECE_STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition border ${
                    status === s.value
                      ? 'bg-gold-400/10 border-gold-400/50 text-gold-400'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {status && (
            <>
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={dateDeparted}
                  onChange={e => setDateDeparted(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 transition"
                />
              </div>

              {/* Sale price (sold only) */}
              {status === 'sold' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    <DollarSign className="w-3.5 h-3.5 inline mr-1" />
                    Sale Price
                  </label>
                  <input
                    type="number"
                    value={salePrice}
                    onChange={e => setSalePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 transition"
                  />
                </div>
              )}

              {/* Departed to (sold or gifted) */}
              {departedToLabel && (
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    <User className="w-3.5 h-3.5 inline mr-1" />
                    {departedToLabel} <span className="text-neutral-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={departedTo}
                    onChange={e => setDepartedTo(e.target.value)}
                    placeholder="Name"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 transition"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-5 border-t border-neutral-800 space-y-3">
          <button
            onClick={handleRetire}
            disabled={!status || loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition disabled:opacity-50 text-sm"
          >
            <Archive className="w-4 h-4" />
            {loading ? 'Archiving...' : 'Archive Piece'}
          </button>

          {!showHardDelete ? (
            <button
              onClick={() => setShowHardDelete(true)}
              className="w-full text-center text-xs text-neutral-600 hover:text-red-400 transition py-1"
            >
              Permanently delete instead
            </button>
          ) : (
            <button
              onClick={handleHardDelete}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 bg-red-950/50 hover:bg-red-950 text-red-400 font-medium rounded-lg transition text-sm border border-red-900/50"
            >
              <Trash2 className="w-4 h-4" />
              {loading ? 'Deleting...' : 'Permanently Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
