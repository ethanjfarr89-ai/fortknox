import { Plus, X } from 'lucide-react'
import type { Gemstone } from '../types'

interface Props {
  gemstones: Gemstone[]
  onChange: (gemstones: Gemstone[]) => void
}

const emptyGemstone: Gemstone = {
  stone_type: '',
  cut: '',
  carat_weight: null,
  color: '',
  clarity: '',
  gia_number: '',
}

const stoneTypes = ['Diamond', 'Ruby', 'Sapphire', 'Emerald', 'Amethyst', 'Topaz', 'Opal', 'Pearl', 'Garnet', 'Aquamarine', 'Tanzanite', 'Tourmaline', 'Morganite', 'Peridot', 'Other']
const cuts = ['Round', 'Princess', 'Oval', 'Cushion', 'Emerald', 'Pear', 'Marquise', 'Asscher', 'Radiant', 'Heart', 'Baguette', 'Cabochon', 'Other']

const inputCls = 'w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition text-sm text-white placeholder-neutral-500'
const labelCls = 'block text-xs font-medium text-neutral-500 mb-1'

export default function GemstoneFields({ gemstones, onChange }: Props) {
  const add = () => onChange([...gemstones, { ...emptyGemstone }])
  const remove = (i: number) => onChange(gemstones.filter((_, idx) => idx !== i))
  const update = (i: number, field: keyof Gemstone, value: string | number | null) => {
    const updated = gemstones.map((g, idx) => idx === i ? { ...g, [field]: value } : g)
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-neutral-400">Gemstones</label>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-xs text-gold-400 hover:text-gold-300 transition"
        >
          <Plus className="w-3 h-3" /> Add gemstone
        </button>
      </div>

      {gemstones.map((gem, i) => (
        <div key={i} className="bg-neutral-800/50 rounded-lg p-3 space-y-2 relative border border-neutral-700/50">
          <button
            type="button"
            onClick={() => remove(i)}
            className="absolute top-2 right-2 p-0.5 hover:bg-neutral-700 rounded transition"
          >
            <X className="w-3.5 h-3.5 text-neutral-500" />
          </button>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Stone Type</label>
              <select
                value={gem.stone_type}
                onChange={e => update(i, 'stone_type', e.target.value)}
                className={inputCls}
              >
                <option value="">Select...</option>
                {stoneTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Cut</label>
              <select
                value={gem.cut}
                onChange={e => update(i, 'cut', e.target.value)}
                className={inputCls}
              >
                <option value="">Select...</option>
                {cuts.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>Carat Weight</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={gem.carat_weight ?? ''}
                onChange={e => update(i, 'carat_weight', e.target.value ? parseFloat(e.target.value) : null)}
                className={inputCls}
                placeholder="0.50"
              />
            </div>
            <div>
              <label className={labelCls}>Color</label>
              <input
                value={gem.color}
                onChange={e => update(i, 'color', e.target.value)}
                className={inputCls}
                placeholder="D-Z / color"
              />
            </div>
            <div>
              <label className={labelCls}>Clarity</label>
              <input
                value={gem.clarity}
                onChange={e => update(i, 'clarity', e.target.value)}
                className={inputCls}
                placeholder="VS1, SI2..."
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>GIA Certificate #</label>
            <input
              value={gem.gia_number}
              onChange={e => update(i, 'gia_number', e.target.value)}
              className={inputCls}
              placeholder="Optional"
            />
          </div>
        </div>
      ))}

      {gemstones.length === 0 && (
        <p className="text-xs text-neutral-600">No gemstones added.</p>
      )}
    </div>
  )
}
