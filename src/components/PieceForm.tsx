import { useState } from 'react'
import { X } from 'lucide-react'
import type { JewelryPiece, JewelryPieceInsert, Gemstone, Category, AcquisitionType, Collection, CropArea } from '../types'
import { CATEGORIES } from '../types'
import { normalizeMetalType } from '../lib/prices'
import { useScrollLock } from '../lib/useScrollLock'
import GemstoneFields from './GemstoneFields'
import PhotoManager from './PhotoManager'

interface Props {
  piece?: JewelryPiece | null
  onSave: (data: JewelryPieceInsert) => Promise<{ error: unknown }>
  onClose: () => void
  defaultWishlist?: boolean
  collections?: Collection[]
  pieceCollections?: string[]
  onAssignCollection?: (collectionId: string) => void
  onUnassignCollection?: (collectionId: string) => void
  allStylingPhotos?: string[]
}

const metalOptions = [
  { value: 'yellow_gold', label: 'Yellow Gold' },
  { value: 'white_gold', label: 'White Gold' },
  { value: 'rose_gold', label: 'Rose Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'palladium', label: 'Palladium' },
  { value: 'other', label: 'Other' },
]

export default function PieceForm({ piece, onSave, onClose, defaultWishlist, collections, pieceCollections, onAssignCollection, onUnassignCollection, allStylingPhotos }: Props) {
  useScrollLock()

  // Core
  const [name, setName] = useState(piece?.name ?? '')
  const [description, setDescription] = useState(piece?.description ?? '')
  const [category, setCategory] = useState<Category>(piece?.category ?? 'ring')
  const [metalType, setMetalType] = useState(normalizeMetalType(piece?.metal_type ?? 'yellow_gold'))
  const [weightGrams, setWeightGrams] = useState(piece?.metal_weight_grams?.toString() ?? '')
  const [karat, setKarat] = useState(piece?.metal_karat?.toString() ?? '')
  const [history, setHistory] = useState(piece?.history ?? '')
  const [significance, setSignificance] = useState(piece?.significance ?? '')
  const [appraisedValue, setAppraisedValue] = useState(piece?.appraised_value?.toString() ?? '')
  const [acquisitionType, setAcquisitionType] = useState<AcquisitionType>(piece?.acquisition_type ?? 'purchased')
  const [pricePaid, setPricePaid] = useState(piece?.price_paid?.toString() ?? '')
  const [datePurchased, setDatePurchased] = useState(piece?.date_purchased ?? '')
  const [giftedBy, setGiftedBy] = useState(piece?.gifted_by ?? '')
  const [inheritedFrom, setInheritedFrom] = useState(piece?.inherited_from ?? '')
  const [dateReceived, setDateReceived] = useState(piece?.date_received ?? '')
  const [isWishlist, setIsWishlist] = useState(piece?.is_wishlist ?? defaultWishlist ?? false)

  // Gemstones
  const [gemstones, setGemstones] = useState<Gemstone[]>(piece?.gemstones ?? [])

  // Photos
  const [photoUrls, setPhotoUrls] = useState<string[]>(piece?.photo_urls ?? [])
  const [stylingPhotoUrls, setStylingPhotoUrls] = useState<string[]>(piece?.styling_photo_urls ?? [])
  const [hallmarkPhotoUrls, setHallmarkPhotoUrls] = useState<string[]>(piece?.hallmark_photo_urls ?? [])
  const [profilePhotoIndex, setProfilePhotoIndex] = useState(piece?.profile_photo_index ?? 0)
  const [photoCrops, setPhotoCrops] = useState<Record<string, CropArea>>(() => {
    // Initialize from photo_crops if available, otherwise migrate from profile_photo_crop
    if (piece?.photo_crops) return piece.photo_crops
    if (piece?.profile_photo_crop) return { [String(piece.profile_photo_index ?? 0)]: piece.profile_photo_crop }
    return {}
  })

  // Category-specific
  const [ringSize, setRingSize] = useState(piece?.ring_size ?? '')
  const [chainLength, setChainLength] = useState(piece?.chain_length?.toString() ?? '')
  const [chainWidth, setChainWidth] = useState(piece?.chain_width?.toString() ?? '')
  const [braceletLength, setBraceletLength] = useState(piece?.bracelet_length?.toString() ?? '')
  const [braceletWidth, setBraceletWidth] = useState(piece?.bracelet_width?.toString() ?? '')
  const [braceletType, setBraceletType] = useState<'bracelet' | 'bangle'>(piece?.bracelet_type ?? 'bracelet')
  const [bangleSize, setBangleSize] = useState(piece?.bangle_size?.toString() ?? '')
  const [ankletLength, setAnkletLength] = useState(piece?.anklet_length?.toString() ?? '')
  const [ankletWidth, setAnkletWidth] = useState(piece?.anklet_width?.toString() ?? '')
  const [pendantLength, setPendantLength] = useState(piece?.pendant_length?.toString() ?? '')
  const [pendantWidth, setPendantWidth] = useState(piece?.pendant_width?.toString() ?? '')
  const [earringLength, setEarringLength] = useState(piece?.earring_length?.toString() ?? '')
  const [earringWidth, setEarringWidth] = useState(piece?.earring_width?.toString() ?? '')
  const [ringBandWidth, setRingBandWidth] = useState(piece?.ring_band_width?.toString() ?? '')
  const [watchMaker, setWatchMaker] = useState(piece?.watch_maker ?? '')
  const [watchMovement, setWatchMovement] = useState(piece?.watch_movement ?? '')
  const [watchDialSize, setWatchDialSize] = useState(piece?.watch_dial_size?.toString() ?? '')
  const [watchCaseMaterial, setWatchCaseMaterial] = useState(piece?.watch_case_material ?? '')
  const [watchBandMaterial, setWatchBandMaterial] = useState(piece?.watch_band_material ?? '')
  const [watchReference, setWatchReference] = useState(piece?.watch_reference ?? '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const numOrNull = (v: string) => v ? parseFloat(v) : null
    const strOrNull = (v: string) => v.trim() || null

    const data: JewelryPieceInsert = {
      name: name.trim(),
      description: strOrNull(description),
      category,
      metal_type: metalType as JewelryPiece['metal_type'],
      metal_weight_grams: numOrNull(weightGrams),
      metal_karat: numOrNull(karat),
      gemstones,
      history: strOrNull(history),
      significance: strOrNull(significance),
      appraised_value: numOrNull(appraisedValue),
      acquisition_type: acquisitionType,
      price_paid: acquisitionType === 'purchased' ? numOrNull(pricePaid) : null,
      date_purchased: acquisitionType === 'purchased' ? (datePurchased || null) : null,
      gifted_by: acquisitionType === 'gift' ? strOrNull(giftedBy) : null,
      inherited_from: acquisitionType === 'inheritance' ? strOrNull(inheritedFrom) : null,
      date_received: acquisitionType !== 'purchased' ? (dateReceived || null) : null,
      is_wishlist: isWishlist,
      photo_urls: photoUrls,
      styling_photo_urls: stylingPhotoUrls,
      hallmark_photo_urls: hallmarkPhotoUrls,
      profile_photo_index: profilePhotoIndex,
      profile_photo_crop: photoCrops[String(profilePhotoIndex)] ?? null,
      photo_crops: Object.keys(photoCrops).length > 0 ? photoCrops : null,
      ring_size: strOrNull(ringSize),
      chain_length: numOrNull(chainLength),
      chain_width: numOrNull(chainWidth),
      bracelet_length: numOrNull(braceletLength),
      bracelet_width: numOrNull(braceletWidth),
      bracelet_type: category === 'bracelet' ? braceletType : null,
      bangle_size: braceletType === 'bangle' ? numOrNull(bangleSize) : null,
      anklet_length: numOrNull(ankletLength),
      anklet_width: numOrNull(ankletWidth),
      pendant_length: numOrNull(pendantLength),
      pendant_width: numOrNull(pendantWidth),
      earring_length: numOrNull(earringLength),
      earring_width: numOrNull(earringWidth),
      ring_band_width: numOrNull(ringBandWidth),
      watch_maker: strOrNull(watchMaker),
      watch_movement: strOrNull(watchMovement),
      watch_dial_size: numOrNull(watchDialSize),
      watch_case_material: strOrNull(watchCaseMaterial),
      watch_band_material: strOrNull(watchBandMaterial),
      watch_reference: strOrNull(watchReference),
    }

    const { error } = await onSave(data)
    if (error) {
      setError((error as { message?: string }).message ?? 'Failed to save')
    } else {
      onClose()
    }
    setSaving(false)
  }

  const inputCls = 'w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition text-sm text-white placeholder-neutral-500'
  const labelCls = 'block text-sm font-medium text-neutral-400 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg relative border border-neutral-800">
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">
            {piece ? 'Edit Piece' : isWishlist ? 'Add to Wishlist' : 'Add Piece'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg transition">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="bg-red-900/30 text-red-400 text-sm rounded-lg p-3 border border-red-900/50">{error}</div>}

          {/* Wishlist toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isWishlist}
              onChange={e => setIsWishlist(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-gold-400 focus:ring-gold-400"
            />
            <span className="text-sm text-neutral-400">Wishlist item (not in collection)</span>
          </label>

          {/* Name */}
          <div>
            <label className={labelCls}>Name *</label>
            <input required value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="e.g. Grandma's Wedding Band" />
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>Category</label>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    category === c.value
                      ? 'bg-gold-400 text-black'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={inputCls} placeholder="Brief description..." />
          </div>

          {/* Metal info — hidden for watches (they have their own material fields) */}
          {category !== 'watch' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Metal</label>
                <select value={metalType} onChange={e => setMetalType(e.target.value as JewelryPiece['metal_type'])} className={inputCls}>
                  {metalOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Weight (g)</label>
                <input type="number" step="0.01" min="0" value={weightGrams} onChange={e => setWeightGrams(e.target.value)} className={inputCls} placeholder="31.1" />
              </div>
              <div>
                <label className={labelCls}>{['yellow_gold', 'white_gold', 'rose_gold', 'gold'].includes(metalType) ? 'Karat' : 'Purity'}</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={['yellow_gold', 'white_gold', 'rose_gold', 'gold'].includes(metalType) ? '24' : undefined}
                  value={karat}
                  onChange={e => setKarat(e.target.value)}
                  className={inputCls}
                  placeholder={['yellow_gold', 'white_gold', 'rose_gold', 'gold'].includes(metalType) ? '14' : metalType === 'silver' ? '925' : '950'}
                />
              </div>
            </div>
          )}

          {/* Category-specific fields */}
          {category === 'ring' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Ring Size</label>
                <input value={ringSize} onChange={e => setRingSize(e.target.value)} className={inputCls} placeholder="e.g. 7, 7.5" />
              </div>
              <div>
                <label className={labelCls}>Band Width (mm)</label>
                <input type="number" step="0.1" min="0" value={ringBandWidth} onChange={e => setRingBandWidth(e.target.value)} className={inputCls} placeholder="2.5" />
              </div>
            </div>
          )}

          {category === 'chain' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Length (in)</label>
                <input type="number" step="0.1" value={chainLength} onChange={e => setChainLength(e.target.value)} className={inputCls} placeholder="20" />
              </div>
              <div>
                <label className={labelCls}>Width (mm)</label>
                <input type="number" step="0.1" value={chainWidth} onChange={e => setChainWidth(e.target.value)} className={inputCls} placeholder="3" />
              </div>
            </div>
          )}

          {category === 'necklace' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Length (in)</label>
                <input type="number" step="0.1" value={chainLength} onChange={e => setChainLength(e.target.value)} className={inputCls} placeholder="18" />
              </div>
              <div>
                <label className={labelCls}>Width (mm)</label>
                <input type="number" step="0.1" value={chainWidth} onChange={e => setChainWidth(e.target.value)} className={inputCls} placeholder="2" />
              </div>
            </div>
          )}

          {category === 'bracelet' && (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBraceletType('bracelet')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${braceletType === 'bracelet' ? 'bg-gold-400 text-black' : 'bg-neutral-800 text-neutral-400'}`}
                >
                  Bracelet
                </button>
                <button
                  type="button"
                  onClick={() => setBraceletType('bangle')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${braceletType === 'bangle' ? 'bg-gold-400 text-black' : 'bg-neutral-800 text-neutral-400'}`}
                >
                  Bangle
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Length (in)</label>
                  <input type="number" step="0.1" value={braceletLength} onChange={e => setBraceletLength(e.target.value)} className={inputCls} placeholder="7.5" />
                </div>
                <div>
                  <label className={labelCls}>Width (mm)</label>
                  <input type="number" step="0.1" value={braceletWidth} onChange={e => setBraceletWidth(e.target.value)} className={inputCls} placeholder="5" />
                </div>
              </div>
              {braceletType === 'bangle' && (
                <div>
                  <label className={labelCls}>Bangle Size (mm diameter)</label>
                  <input type="number" step="0.1" value={bangleSize} onChange={e => setBangleSize(e.target.value)} className={inputCls} placeholder="65" />
                </div>
              )}
            </>
          )}

          {category === 'anklet' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Length (in)</label>
                <input type="number" step="0.1" value={ankletLength} onChange={e => setAnkletLength(e.target.value)} className={inputCls} placeholder="10" />
              </div>
              <div>
                <label className={labelCls}>Width (mm)</label>
                <input type="number" step="0.1" value={ankletWidth} onChange={e => setAnkletWidth(e.target.value)} className={inputCls} placeholder="2" />
              </div>
            </div>
          )}

          {category === 'pendant' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Length (mm)</label>
                <input type="number" step="0.1" value={pendantLength} onChange={e => setPendantLength(e.target.value)} className={inputCls} placeholder="25" />
              </div>
              <div>
                <label className={labelCls}>Width (mm)</label>
                <input type="number" step="0.1" value={pendantWidth} onChange={e => setPendantWidth(e.target.value)} className={inputCls} placeholder="15" />
              </div>
            </div>
          )}

          {category === 'earring' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Length (mm)</label>
                <input type="number" step="0.1" value={earringLength} onChange={e => setEarringLength(e.target.value)} className={inputCls} placeholder="20" />
              </div>
              <div>
                <label className={labelCls}>Width (mm)</label>
                <input type="number" step="0.1" value={earringWidth} onChange={e => setEarringWidth(e.target.value)} className={inputCls} placeholder="10" />
              </div>
            </div>
          )}

          {category === 'watch' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Maker</label>
                  <input value={watchMaker} onChange={e => setWatchMaker(e.target.value)} className={inputCls} placeholder="Rolex, Omega, Seiko..." />
                </div>
                <div>
                  <label className={labelCls}>Reference / Model</label>
                  <input value={watchReference} onChange={e => setWatchReference(e.target.value)} className={inputCls} placeholder="126710BLNR" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Movement</label>
                  <select value={watchMovement} onChange={e => setWatchMovement(e.target.value)} className={inputCls}>
                    <option value="">Select...</option>
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual Wind</option>
                    <option value="Quartz">Quartz</option>
                    <option value="Solar">Solar</option>
                    <option value="Spring Drive">Spring Drive</option>
                    <option value="Kinetic">Kinetic</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Case Material</label>
                  <select value={watchCaseMaterial} onChange={e => setWatchCaseMaterial(e.target.value)} className={inputCls}>
                    <option value="">Select...</option>
                    <option value="Stainless Steel">Stainless Steel</option>
                    <option value="Titanium">Titanium</option>
                    <option value="Ceramic">Ceramic</option>
                    <option value="Carbon Fiber">Carbon Fiber</option>
                    <option value="Yellow Gold">Yellow Gold</option>
                    <option value="White Gold">White Gold</option>
                    <option value="Rose Gold">Rose Gold</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Two-Tone">Two-Tone</option>
                    <option value="Bronze">Bronze</option>
                    <option value="Resin">Resin</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Dial Size (mm)</label>
                  <input type="number" step="0.1" value={watchDialSize} onChange={e => setWatchDialSize(e.target.value)} className={inputCls} placeholder="40" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Band Material</label>
                <select value={watchBandMaterial} onChange={e => setWatchBandMaterial(e.target.value)} className={inputCls}>
                  <option value="">Select...</option>
                  <option value="Stainless Steel">Stainless Steel</option>
                  <option value="Leather">Leather</option>
                  <option value="Rubber">Rubber</option>
                  <option value="NATO / Canvas">NATO / Canvas</option>
                  <option value="Titanium">Titanium</option>
                  <option value="Yellow Gold">Yellow Gold</option>
                  <option value="White Gold">White Gold</option>
                  <option value="Rose Gold">Rose Gold</option>
                  <option value="Two-Tone">Two-Tone</option>
                  <option value="Ceramic">Ceramic</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <p className="text-xs text-neutral-500">Watches use Appraised Value for portfolio tracking since melt value rarely applies.</p>
            </div>
          )}

          {/* Gemstones */}
          <GemstoneFields gemstones={gemstones} onChange={setGemstones} />

          {/* Acquisition */}
          <div>
            <label className={labelCls}>How acquired</label>
            <div className="flex gap-1.5">
              {([['purchased', 'Purchased'], ['gift', 'Gift'], ['inheritance', 'Inheritance / Heirloom']] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAcquisitionType(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    acquisitionType === val ? 'bg-gold-400 text-black' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {acquisitionType === 'purchased' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Price Paid ($)</label>
                <input type="number" step="0.01" min="0" value={pricePaid} onChange={e => setPricePaid(e.target.value)} className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>Date Purchased</label>
                <input type="date" value={datePurchased} onChange={e => setDatePurchased(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          {acquisitionType === 'gift' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Gifted By</label>
                <input value={giftedBy} onChange={e => setGiftedBy(e.target.value)} className={inputCls} placeholder="Name" />
              </div>
              <div>
                <label className={labelCls}>Date Received</label>
                <input type="date" value={dateReceived} onChange={e => setDateReceived(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          {acquisitionType === 'inheritance' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Inherited From</label>
                <input value={inheritedFrom} onChange={e => setInheritedFrom(e.target.value)} className={inputCls} placeholder="Name" />
              </div>
              <div>
                <label className={labelCls}>Date Received</label>
                <input type="date" value={dateReceived} onChange={e => setDateReceived(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          {/* Collections */}
          {collections && collections.length > 0 && piece && (
            <div>
              <label className={labelCls}>Collections</label>
              <div className="flex flex-wrap gap-1.5">
                {collections.map(c => {
                  const assigned = pieceCollections?.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => assigned ? onUnassignCollection?.(c.id) : onAssignCollection?.(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        assigned ? 'bg-gold-400 text-black' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      {c.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Appraised value */}
          <div>
            <label className={labelCls}>Appraised Value ($)</label>
            <input type="number" step="0.01" min="0" value={appraisedValue} onChange={e => setAppraisedValue(e.target.value)} className={inputCls} placeholder="Professional appraisal value" />
          </div>

          {/* History & Significance */}
          <div>
            <label className={labelCls}>History</label>
            <textarea value={history} onChange={e => setHistory(e.target.value)} rows={2} className={inputCls} placeholder="Where it was purchased, when..." />
          </div>
          <div>
            <label className={labelCls}>Significance</label>
            <textarea value={significance} onChange={e => setSignificance(e.target.value)} rows={2} className={inputCls} placeholder="Family heirloom, engagement ring..." />
          </div>

          {/* Photos */}
          <PhotoManager
            label="Photos"
            urls={photoUrls}
            onChange={setPhotoUrls}
            showProfileSelect
            profileIndex={profilePhotoIndex}
            onSetProfile={(i) => { setProfilePhotoIndex(i) }}
            onCropPhoto={(i, crop) => setPhotoCrops(prev => ({ ...prev, [String(i)]: crop }))}
            photoCrops={photoCrops}
          />

          <PhotoManager
            label="Styling Examples"
            urls={stylingPhotoUrls}
            onChange={setStylingPhotoUrls}
            existingPhotos={allStylingPhotos}
          />

          <PhotoManager
            label="Hallmark Photos"
            urls={hallmarkPhotoUrls}
            onChange={setHallmarkPhotoUrls}
          />
        </form>

        <div className="flex gap-3 p-5 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-neutral-700 text-neutral-400 font-medium rounded-lg hover:bg-neutral-800 transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition disabled:opacity-50 text-sm"
          >
            {saving ? 'Saving...' : piece ? 'Update' : isWishlist ? 'Add to Wishlist' : 'Add Piece'}
          </button>
        </div>
      </div>
    </div>
  )
}
