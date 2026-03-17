import { useState, useEffect, useRef } from 'react'
import { Gem, Weight, Sparkles, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CATEGORIES } from '../types'
import type { Gemstone, CropArea } from '../types'
import CroppedImage from '../components/CroppedImage'

interface SharedPieceData {
  name: string
  description: string | null
  category: string
  metal_type: string
  metal_weight_grams: number | null
  metal_karat: number | null
  gemstones: Gemstone[]
  photo_urls: string[]
  profile_photo_index: number
  profile_photo_crop: CropArea | null
  photo_crops: Record<string, CropArea> | null
  history: string | null
  significance: string | null
  appraised_value: number | null
  ring_size: string | null
  chain_length: number | null
  chain_width: number | null
  bracelet_length: number | null
  bracelet_width: number | null
  bracelet_type: string | null
  bangle_size: number | null
  anklet_length: number | null
  anklet_width: number | null
  pendant_length: number | null
  pendant_width: number | null
  earring_length: number | null
  earring_width: number | null
  ring_band_width: number | null
  watch_maker: string | null
  watch_movement: string | null
  watch_dial_size: number | null
  watch_case_material: string | null
  watch_band_material: string | null
  watch_reference: string | null
  styling_photo_urls: string[]
  hallmark_photo_urls: string[]
}

interface SharedData {
  share: { id: string; share_token: string; show_value: boolean; created_at: string }
  piece: SharedPieceData
  owner: { display_name: string | null; avatar_url: string | null }
}

const metalLabels: Record<string, string> = {
  gold: 'Yellow Gold', yellow_gold: 'Yellow Gold', white_gold: 'White Gold', rose_gold: 'Rose Gold',
  silver: 'Silver', platinum: 'Platinum', palladium: 'Palladium', other: 'Other',
}

const metalBadgeClasses: Record<string, string> = {
  rose_gold: 'bg-pink-900/15 text-pink-200',
  white_gold: 'bg-slate-600/25 text-slate-200',
  gold: 'bg-gold-400/15 text-gold-400',
  yellow_gold: 'bg-gold-400/15 text-gold-400',
  silver: 'bg-violet-900/20 text-violet-300',
  platinum: 'bg-blue-900/30 text-blue-400',
  palladium: 'bg-teal-900/25 text-teal-300',
}

function isGoldType(t: string) {
  return t === 'gold' || t === 'yellow_gold' || t === 'white_gold' || t === 'rose_gold'
}

function fmtCurrency(val: number | null) {
  if (val == null) return '\u2014'
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

function FullscreenGallery({ photos, initialIndex, onClose }: { photos: string[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex(i => (i - 1 + photos.length) % photos.length)
      if (e.key === 'ArrowRight') setIndex(i => (i + 1) % photos.length)
    }
    document.addEventListener('keydown', handler)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', handler) }
  }, [photos.length, onClose])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) setIndex(i => (i + 1) % photos.length)
      else setIndex(i => (i - 1 + photos.length) % photos.length)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/60 hover:text-white z-10">
        <X className="w-6 h-6" />
      </button>
      <img
        src={photos[index]}
        alt=""
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
        onClick={e => e.stopPropagation()}
      />
      {photos.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIndex(i => (i - 1 + photos.length) % photos.length) }}
            className="absolute left-4 p-2 bg-black/50 rounded-full text-white/80 hover:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIndex(i => (i + 1) % photos.length) }}
            className="absolute right-4 p-2 bg-black/50 rounded-full text-white/80 hover:text-white"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setIndex(i) }}
                className={`w-2 h-2 rounded-full transition ${i === index ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function SharedPiece({ token }: { token: string }) {
  const [data, setData] = useState<SharedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null)
  const [stylingLightbox, setStylingLightbox] = useState<number | null>(null)

  // Touch swipe for hero photo
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const [heroIndex, setHeroIndex] = useState<number | null>(null)

  useEffect(() => {
    supabase.rpc('get_shared_piece', { token })
      .then(({ data: result, error }) => {
        if (error || !result) {
          setNotFound(true)
        } else {
          setData(result as SharedData)
        }
        setLoading(false)
      })
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-neutral-500">Loading...</div>
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <img src="/logo.png" alt="Trove" className="h-12 mx-auto rounded" />
          <h1 className="text-xl font-bold text-white">Piece Not Found</h1>
          <p className="text-neutral-500 text-sm">This share link may have been revoked or doesn't exist.</p>
          <a href="/" className="inline-block mt-4 px-5 py-2.5 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition text-sm">
            Discover Trove
          </a>
        </div>
      </div>
    )
  }

  const { piece, owner, share } = data
  const categoryLabel = CATEGORIES.find(c => c.value === piece.category)?.label
  const photos = piece.photo_urls ?? []
  const currentHeroIndex = heroIndex ?? (piece.profile_photo_index ?? 0)
  const currentPhoto = photos[currentHeroIndex] ?? photos[0]
  const currentCrop = piece.photo_crops?.[String(currentHeroIndex)]
    ?? (currentHeroIndex === (piece.profile_photo_index ?? 0) ? piece.profile_photo_crop : null)

  const handleHeroTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const handleHeroTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || photos.length <= 1) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) setHeroIndex(i => ((i ?? piece.profile_photo_index ?? 0) + 1) % photos.length)
      else setHeroIndex(i => ((i ?? piece.profile_photo_index ?? 0) - 1 + photos.length) % photos.length)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  const dimInfo: string[] = []
  if (piece.category === 'ring') {
    if (piece.ring_size) dimInfo.push(`Size ${piece.ring_size}`)
    if (piece.ring_band_width) dimInfo.push(`${piece.ring_band_width}mm band`)
  }
  if (piece.category === 'chain' || piece.category === 'necklace') {
    if (piece.chain_length) dimInfo.push(`${piece.chain_length}" long`)
    if (piece.chain_width) dimInfo.push(`${piece.chain_width}mm wide`)
  }
  if (piece.category === 'bracelet') {
    if (piece.bracelet_type) dimInfo.push(piece.bracelet_type === 'bangle' ? 'Bangle' : 'Bracelet')
    if (piece.bracelet_length) dimInfo.push(`${piece.bracelet_length}" long`)
    if (piece.bracelet_width) dimInfo.push(`${piece.bracelet_width}mm wide`)
    if (piece.bracelet_type === 'bangle' && piece.bangle_size) dimInfo.push(`${piece.bangle_size}mm diameter`)
  }
  if (piece.category === 'anklet') {
    if (piece.anklet_length) dimInfo.push(`${piece.anklet_length}" long`)
    if (piece.anklet_width) dimInfo.push(`${piece.anklet_width}mm wide`)
  }
  if (piece.category === 'pendant') {
    if (piece.pendant_length) dimInfo.push(`${piece.pendant_length}mm long`)
    if (piece.pendant_width) dimInfo.push(`${piece.pendant_width}mm wide`)
  }
  if (piece.category === 'earring') {
    if (piece.earring_length) dimInfo.push(`${piece.earring_length}mm long`)
    if (piece.earring_width) dimInfo.push(`${piece.earring_width}mm wide`)
  }
  if (piece.category === 'watch') {
    if (piece.watch_maker) dimInfo.push(piece.watch_maker)
    if (piece.watch_reference) dimInfo.push(`Ref. ${piece.watch_reference}`)
    if (piece.watch_movement) dimInfo.push(piece.watch_movement)
    if (piece.watch_dial_size) dimInfo.push(`${piece.watch_dial_size}mm dial`)
    if (piece.watch_case_material) dimInfo.push(`${piece.watch_case_material} case`)
    if (piece.watch_band_material) dimInfo.push(`${piece.watch_band_material} band`)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <a href="/"><img src="/logo.png" alt="Trove" className="h-10 rounded" /></a>
          {owner.display_name && (
            <span className="text-xs text-neutral-500">
              Shared by {owner.display_name}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hero photo — swipeable */}
        {currentPhoto ? (
          <div
            className="aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-800 cursor-pointer relative"
            onClick={() => setGalleryIndex(currentHeroIndex)}
            onTouchStart={handleHeroTouchStart}
            onTouchEnd={handleHeroTouchEnd}
          >
            <CroppedImage
              src={currentPhoto}
              alt={piece.name}
              crop={currentCrop}
              className="w-full h-full object-cover"
            />
            {/* Navigation arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setHeroIndex(i => ((i ?? piece.profile_photo_index ?? 0) - 1 + photos.length) % photos.length) }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 rounded-full text-white/80 hover:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setHeroIndex(i => ((i ?? piece.profile_photo_index ?? 0) + 1) % photos.length) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 rounded-full text-white/80 hover:text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={e => { e.stopPropagation(); setHeroIndex(i) }}
                      className={`w-2 h-2 rounded-full transition ${i === currentHeroIndex ? 'bg-white' : 'bg-white/40'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="aspect-[4/3] bg-neutral-800 rounded-2xl flex items-center justify-center">
            <Gem className="w-20 h-20 text-neutral-700" />
          </div>
        )}

        {/* Photo thumbnails */}
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className={`w-16 h-16 rounded-lg object-cover border-2 shrink-0 cursor-pointer hover:border-gold-400 transition ${
                  i === currentHeroIndex ? 'border-gold-400' : 'border-neutral-700'
                }`}
                onClick={() => setHeroIndex(i)}
              />
            ))}
          </div>
        )}

        {/* Piece info */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{piece.name}</h1>
            {piece.description && <p className="text-sm text-neutral-400 mt-1">{piece.description}</p>}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {categoryLabel && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-neutral-800 text-neutral-300">
                {categoryLabel}
              </span>
            )}
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${metalBadgeClasses[piece.metal_type] ?? 'bg-neutral-800 text-neutral-300'}`}>
              {metalLabels[piece.metal_type] ?? piece.metal_type} {isGoldType(piece.metal_type) && piece.metal_karat ? `${piece.metal_karat}K` : ''}
            </span>
            {piece.metal_weight_grams && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-neutral-800 text-neutral-300">
                <Weight className="w-3.5 h-3.5" /> {Math.round(piece.metal_weight_grams * 100) / 100}g
              </span>
            )}
          </div>

          {dimInfo.length > 0 && (
            <div className="text-sm text-neutral-400">{dimInfo.join(' \u00b7 ')}</div>
          )}

          {/* Value (only if owner opted in) */}
          {share.show_value && piece.appraised_value != null && (
            <div className="bg-neutral-800 rounded-xl p-4">
              <span className="text-xs text-neutral-500">Appraised Value</span>
              <div className="text-xl font-bold text-gold-400 mt-0.5">{fmtCurrency(piece.appraised_value)}</div>
            </div>
          )}

          {/* Gemstones */}
          {piece.gemstones?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-gold-400 mb-2">
                <Sparkles className="w-4 h-4" /> Gemstones
              </div>
              <div className="space-y-2">
                {piece.gemstones.map((gem, i) => (
                  <div key={i} className="bg-neutral-800 rounded-lg p-3 text-sm text-neutral-300">
                    <div className="font-medium text-white flex items-center gap-2">
                      <span>
                        {gem.is_pave && gem.quantity ? `${gem.quantity}x ` : ''}
                        {gem.stone_type}
                        {gem.carat_weight ? ` \u2014 ${gem.carat_weight}ct${gem.is_pave ? 'w' : ''}` : ''}
                      </span>
                      {gem.is_pave && <span className="text-xs px-1.5 py-0.5 bg-neutral-700 rounded text-neutral-400">Pave</span>}
                      {gem.origin === 'lab' && <span className="text-xs px-1.5 py-0.5 bg-blue-900/30 rounded text-blue-400">Lab</span>}
                      {gem.origin === 'natural' && <span className="text-xs px-1.5 py-0.5 bg-emerald-900/30 rounded text-emerald-400">Natural</span>}
                    </div>
                    {!gem.is_pave && (
                      <div className="text-xs text-neutral-400 mt-0.5">
                        {[gem.cut, gem.color && `Color: ${gem.color}`, gem.clarity && `Clarity: ${gem.clarity}`].filter(Boolean).join(' \u00b7 ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History & Significance */}
          {piece.history && (
            <div>
              <div className="text-sm font-medium text-gold-400 mb-1">History</div>
              <p className="text-sm text-neutral-400">{piece.history}</p>
            </div>
          )}
          {piece.significance && (
            <div>
              <div className="text-sm font-medium text-gold-400 mb-1">Significance</div>
              <p className="text-sm text-neutral-400">{piece.significance}</p>
            </div>
          )}

          {/* Styling photos — clickable to expand */}
          {piece.styling_photo_urls?.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gold-400 mb-2">Styling</div>
              <div className="flex gap-2 overflow-x-auto">
                {piece.styling_photo_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt="Styling"
                    className="w-20 h-20 rounded-lg object-cover border border-neutral-700 shrink-0 cursor-pointer hover:border-gold-400 transition"
                    onClick={() => setStylingLightbox(i)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center space-y-3 mt-8">
          <img src="/logo.png" alt="Trove" className="h-10 mx-auto rounded" />
          <h2 className="text-lg font-semibold text-white">Track Your Collection with Trove</h2>
          <p className="text-sm text-neutral-400 max-w-sm mx-auto">
            Catalog your jewelry, track real-time values, and share pieces with friends and family.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2.5 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition text-sm"
          >
            Get Started
          </a>
        </div>
      </main>

      {/* Fullscreen gallery for main photos */}
      {galleryIndex !== null && photos.length > 0 && (
        <FullscreenGallery
          photos={photos}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      )}

      {/* Fullscreen gallery for styling photos */}
      {stylingLightbox !== null && piece.styling_photo_urls?.length > 0 && (
        <FullscreenGallery
          photos={piece.styling_photo_urls}
          initialIndex={stylingLightbox}
          onClose={() => setStylingLightbox(null)}
        />
      )}
    </div>
  )
}
