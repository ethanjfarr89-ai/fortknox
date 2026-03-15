import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, FolderOpen, Settings, ArrowUpDown } from 'lucide-react'
import type { JewelryPiece, JewelryPieceInsert, ValuationMode, Category } from '../types'
import { CATEGORIES } from '../types'
import { usePieces } from '../lib/usePieces'
import { useSpotPrices } from '../lib/useSpotPrices'
import { useSnapshots } from '../lib/useSnapshots'
import { useProfile } from '../lib/useProfile'
import { useCollections } from '../lib/useCollections'
import { useStylingBoards } from '../lib/useStylingBoards'
import { useFriends } from '../lib/useFriends'
import { calculateMeltValue } from '../lib/prices'
import Header from '../components/Header'
import SpotPriceBar from '../components/SpotPriceBar'
import PortfolioSummary from '../components/PortfolioSummary'
import PortfolioChart from '../components/PortfolioChart'
import PieceCard from '../components/PieceCard'
import PieceForm from '../components/PieceForm'
import PieceDetail from '../components/PieceDetail'
import StylingBoards from '../components/StylingBoards'
import ProfileSettings from '../components/ProfileSettings'
import FriendsPanel from '../components/FriendsPanel'
import CollectionManager from '../components/CollectionManager'

interface Props {
  userId: string
  onSignOut: () => void
}

type Tab = 'portfolio' | 'wishlist' | 'styling'

export default function Dashboard({ userId, onSignOut }: Props) {
  const { pieces, loading, addPiece, updatePiece, deletePiece } = usePieces(userId)
  const { prices, loading: pricesLoading, refresh: refreshPrices } = useSpotPrices()
  const { saveSnapshot } = useSnapshots(userId)
  const { profile, updateProfile } = useProfile(userId)
  const { collections, pieceCollectionMap, addCollection, deleteCollection, assignPiece, unassignPiece } = useCollections(userId)
  const { boards, addBoard, deleteBoard } = useStylingBoards(userId)
  const { friends, pending, sendRequest, respondToRequest, removeFriend } = useFriends(userId)

  const [valuationMode, setValuationMode] = useState<ValuationMode>('melt')
  const [tab, setTab] = useState<Tab>('portfolio')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingPiece, setEditingPiece] = useState<JewelryPiece | null>(null)
  const [viewingPiece, setViewingPiece] = useState<JewelryPiece | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showFriends, setShowFriends] = useState(false)
  const [showCollections, setShowCollections] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'weight'>('name')

  const incomingRequests = pending.filter(f => f.addressee_id === userId)

  // Record daily snapshot
  useEffect(() => {
    const collectionPieces = pieces.filter(p => !p.is_wishlist)
    if (collectionPieces.length === 0 || !prices.gold) return

    let totalMelt = 0
    let totalAppraised = 0
    for (const piece of collectionPieces) {
      const melt = calculateMeltValue(piece.metal_type, piece.metal_weight_grams, piece.metal_karat, prices)
      if (melt != null) totalMelt += melt
      if (piece.appraised_value != null) totalAppraised += piece.appraised_value
    }
    saveSnapshot(totalMelt, totalAppraised)
  }, [pieces, prices, saveSnapshot])

  const collectionPieces = pieces.filter(p => !p.is_wishlist)
  const wishlistPieces = pieces.filter(p => p.is_wishlist)

  // Filter by selected sub-collection
  let activePieces = tab === 'wishlist' ? wishlistPieces : collectionPieces
  if (tab === 'portfolio' && selectedCollection) {
    const pieceIdsInCollection = Object.entries(pieceCollectionMap)
      .filter(([, colIds]) => colIds.includes(selectedCollection))
      .map(([pieceId]) => pieceId)
    activePieces = activePieces.filter(p => pieceIdsInCollection.includes(p.id))
  }

  // Filter by category
  if (selectedCategory) {
    activePieces = activePieces.filter(p => p.category === selectedCategory)
  }

  const filtered = activePieces.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.metal_type.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    (p.gemstones?.some(g => g.stone_type.toLowerCase().includes(search.toLowerCase())) ?? false)
  )

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'weight') {
      return (b.metal_weight_grams ?? 0) - (a.metal_weight_grams ?? 0)
    }
    if (sortBy === 'value') {
      const valA = (valuationMode === 'appraised' && a.appraised_value != null)
        ? a.appraised_value
        : calculateMeltValue(a.metal_type, a.metal_weight_grams, a.metal_karat, prices) ?? 0
      const valB = (valuationMode === 'appraised' && b.appraised_value != null)
        ? b.appraised_value
        : calculateMeltValue(b.metal_type, b.metal_weight_grams, b.metal_karat, prices) ?? 0
      return valB - valA
    }
    return a.name.localeCompare(b.name)
  })

  const handleSave = async (data: JewelryPieceInsert) => {
    if (editingPiece) return updatePiece(editingPiece.id, data)
    return addPiece(data)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this piece? This cannot be undone.')) await deletePiece(id)
  }

  const handleEdit = (piece: JewelryPiece) => {
    setEditingPiece(piece)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingPiece(null)
  }

  const portfolioLabel = profile?.display_name ? `${profile.display_name}'s Portfolio` : 'Portfolio'

  // Collect all unique styling photos across pieces for the "add existing" feature
  const allStylingPhotos = useMemo(() => {
    const urls = new Set<string>()
    for (const p of pieces) {
      if (p.styling_photo_urls) p.styling_photo_urls.forEach(u => urls.add(u))
    }
    return Array.from(urls)
  }, [pieces])

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header
        profile={profile}
        pendingFriendCount={incomingRequests.length}
        onSignOut={onSignOut}
        onOpenProfile={() => setShowProfile(true)}
        onOpenFriends={() => setShowFriends(true)}
      />
      <SpotPriceBar prices={prices} loading={pricesLoading} onRefresh={refreshPrices} />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {tab === 'portfolio' && (
          <>
            <PortfolioSummary
              pieces={activePieces}
              prices={prices}
              valuationMode={valuationMode}
              onToggleMode={() => setValuationMode(m => m === 'melt' ? 'appraised' : 'melt')}
            />
            <PortfolioChart pieces={activePieces} prices={prices} valuationMode={valuationMode} />
          </>
        )}

        {/* Main tabs */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-neutral-900 rounded-lg p-1 border border-neutral-800">
            <button
              onClick={() => { setTab('portfolio'); setSelectedCollection(null) }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                tab === 'portfolio' ? 'bg-gold-400 text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {portfolioLabel} ({collectionPieces.length})
            </button>
            <button
              onClick={() => setTab('wishlist')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                tab === 'wishlist' ? 'bg-gold-400 text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Wishlist ({wishlistPieces.length})
            </button>
            <button
              onClick={() => setTab('styling')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                tab === 'styling' ? 'bg-gold-400 text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Styling
            </button>
          </div>

          {/* Collection filter pills */}
          {tab === 'portfolio' && collections.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <FolderOpen className="w-3.5 h-3.5 text-neutral-500" />
              <button
                onClick={() => setSelectedCollection(null)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  !selectedCollection ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                All
              </button>
              {collections.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCollection(c.id === selectedCollection ? null : c.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                    selectedCollection === c.id ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {c.name}
                </button>
              ))}
              <button
                onClick={() => setShowCollections(true)}
                className="p-1 text-neutral-500 hover:text-gold-400 transition"
                title="Manage collections"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {tab === 'portfolio' && collections.length === 0 && (
            <button
              onClick={() => setShowCollections(true)}
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-gold-400 transition"
            >
              <FolderOpen className="w-3 h-3" /> Collections
            </button>
          )}
        </div>

        {/* Category filter + sort */}
        {tab !== 'styling' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  !selectedCategory ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                All Categories
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setSelectedCategory(c.value === selectedCategory ? null : c.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                    selectedCategory === c.value ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'name' | 'value' | 'weight')}
                className="bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-gold-400"
              >
                <option value="name">Name</option>
                <option value="value">Value</option>
                <option value="weight">Weight</option>
              </select>
            </div>
          </div>
        )}

        {/* Styling tab */}
        {tab === 'styling' && (
          <StylingBoards
            boards={boards}
            pieces={pieces}
            onAdd={addBoard}
            onDelete={deleteBoard}
          />
        )}

        {/* Portfolio / Wishlist content */}
        {tab !== 'styling' && (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search pieces..."
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition text-sm text-white placeholder-neutral-500"
                />
              </div>
              <button
                onClick={() => { setEditingPiece(null); setShowForm(true) }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition text-sm shrink-0"
              >
                <Plus className="w-4 h-4" />
                {tab === 'wishlist' ? 'Add to Wishlist' : 'Add Piece'}
              </button>
            </div>

            {loading ? (
              <div className="text-center py-16 text-neutral-500">Loading...</div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-neutral-500">
                  {activePieces.length === 0
                    ? tab === 'wishlist'
                      ? 'Your wishlist is empty.'
                      : selectedCollection
                        ? 'No pieces in this collection yet.'
                        : 'No pieces yet. Add your first piece!'
                    : 'No pieces match your search.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sorted.map(piece => (
                  <div key={piece.id} onClick={() => setViewingPiece(piece)} className="cursor-pointer">
                    <PieceCard
                      piece={piece}
                      prices={prices}
                      valuationMode={valuationMode}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {showForm && (
        <PieceForm
          piece={editingPiece}
          onSave={handleSave}
          onClose={closeForm}
          defaultWishlist={tab === 'wishlist'}
          collections={collections}
          pieceCollections={editingPiece ? pieceCollectionMap[editingPiece.id] : undefined}
          onAssignCollection={editingPiece ? (cid) => assignPiece(editingPiece.id, cid) : undefined}
          onUnassignCollection={editingPiece ? (cid) => unassignPiece(editingPiece.id, cid) : undefined}
          allStylingPhotos={allStylingPhotos}
        />
      )}

      {viewingPiece && (
        <PieceDetail
          piece={viewingPiece}
          prices={prices}
          onClose={() => setViewingPiece(null)}
          onEdit={handleEdit}
          pieceCollections={pieceCollectionMap[viewingPiece.id]}
          collections={collections}
        />
      )}

      {showProfile && profile && (
        <ProfileSettings
          profile={profile}
          onUpdate={updateProfile}
          onClose={() => setShowProfile(false)}
        />
      )}

      {showFriends && (
        <FriendsPanel
          friends={friends}
          pending={pending}
          userId={userId}
          onSendRequest={sendRequest}
          onRespond={respondToRequest}
          onRemove={removeFriend}
          onClose={() => setShowFriends(false)}
        />
      )}

      {showCollections && (
        <CollectionManager
          collections={collections}
          onAdd={addCollection}
          onDelete={deleteCollection}
          onClose={() => setShowCollections(false)}
        />
      )}
    </div>
  )
}
