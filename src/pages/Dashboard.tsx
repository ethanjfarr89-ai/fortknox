import { useEffect, useMemo, useState, useRef } from 'react'
import { Plus, Search, FolderOpen, Settings, ArrowUp, ArrowDown, Share2, Gem, SlidersHorizontal } from 'lucide-react'
import type { JewelryPiece, JewelryPieceInsert, ValuationMode, Category, CardDisplayPrefs, Friendship } from '../types'
import { CATEGORIES, DEFAULT_CARD_PREFS } from '../types'
import { usePieces } from '../lib/usePieces'
import { useSpotPrices } from '../lib/useSpotPrices'
import { useSnapshots } from '../lib/useSnapshots'
import { useProfile } from '../lib/useProfile'
import { useCollections } from '../lib/useCollections'
import { useStylingBoards } from '../lib/useStylingBoards'
import { useFriends } from '../lib/useFriends'
import { useNotifications } from '../lib/useNotifications'
import { calculateMeltValue, calculateGemstoneValue } from '../lib/prices'
import Header from '../components/Header'
import SpotPriceBar from '../components/SpotPriceBar'
import PortfolioSummary from '../components/PortfolioSummary'
import PortfolioChart from '../components/PortfolioChart'
import PieceCard from '../components/PieceCard'
import PieceForm from '../components/PieceForm'
import PieceDetail from '../components/PieceDetail'
import StylingBoards from '../components/StylingBoards'
import ProfileSettings from '../components/ProfileSettings'
import NotificationBanner from '../components/NotificationBanner'
import FriendsPanel from '../components/FriendsPanel'
import FriendProfile from '../components/FriendProfile'
import CollectionManager from '../components/CollectionManager'
import PiecePicker from '../components/PiecePicker'
import CollectionSharePicker from '../components/CollectionSharePicker'

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
  const { collections, pieceCollectionMap, shares, addCollection, renameCollection, deleteCollection, assignPiece, unassignPiece, shareCollection, unshareCollection, updateSharePrefs } = useCollections(userId)
  const { boards, addBoard, updateBoard, deleteBoard } = useStylingBoards(userId)
  const { friends, pending, sendRequest, searchProfiles, respondToRequest, removeFriend, fetchFriendPieces, fetchSharedCollections, fetchSharedPieceCollections } = useFriends(userId)
  const { notifications, dismiss: dismissNotif, dismissAll: dismissAllNotifs } = useNotifications(userId, pending)

  const [valuationMode, setValuationMode] = useState<ValuationMode>('melt')
  const [tab, setTab] = useState<Tab>('portfolio')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingPiece, setEditingPiece] = useState<JewelryPiece | null>(null)
  const [viewingPiece, setViewingPiece] = useState<JewelryPiece | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showFriends, setShowFriends] = useState(false)
  const [showCollections, setShowCollections] = useState(false)
  const [showPiecePicker, setShowPiecePicker] = useState(false)
  const [showSharePicker, setShowSharePicker] = useState(false)
  const [viewingFriend, setViewingFriend] = useState<Friendship | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'weight' | 'date' | 'gain_pct' | 'gain_amt'>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem('trove_privacy') === 'true')
  const [cardPrefs, setCardPrefs] = useState<CardDisplayPrefs>(() => {
    try { return JSON.parse(localStorage.getItem('trove_card_prefs') ?? '') }
    catch { return DEFAULT_CARD_PREFS }
  })
  const [showCardSettings, setShowCardSettings] = useState(false)
  const cardSettingsRef = useRef<HTMLDivElement>(null)

  // Sync card prefs from profile on load (profile is source of truth across devices)
  useEffect(() => {
    if (profile?.card_display_prefs) {
      setCardPrefs(profile.card_display_prefs)
      localStorage.setItem('trove_card_prefs', JSON.stringify(profile.card_display_prefs))
    }
  }, [profile?.card_display_prefs])

  // Close card settings on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cardSettingsRef.current && !cardSettingsRef.current.contains(e.target as Node)) setShowCardSettings(false)
    }
    if (showCardSettings) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCardSettings])

  const togglePrivacy = () => {
    setPrivacyMode(prev => {
      const next = !prev
      localStorage.setItem('trove_privacy', String(next))
      return next
    })
  }

  const updateCardPref = (key: keyof CardDisplayPrefs) => {
    setCardPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem('trove_card_prefs', JSON.stringify(next))
      updateProfile({ card_display_prefs: next })
      return next
    })
  }

  const incomingRequests = pending.filter(f => f.addressee_id === userId)

  // Record daily snapshot
  useEffect(() => {
    const collectionPieces = pieces.filter(p => !p.is_wishlist)
    if (collectionPieces.length === 0 || !prices.gold) return

    let totalMelt = 0
    let totalAppraised = 0
    for (const piece of collectionPieces) {
      const melt = calculateMeltValue(piece.metal_type, piece.metal_weight_grams, piece.metal_karat, prices)
      const gemVal = calculateGemstoneValue(piece.gemstones)
      if (melt != null) totalMelt += melt + gemVal
      else if (gemVal > 0) totalMelt += gemVal
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

  const metalDisplayLabels: Record<string, string> = {
    gold: 'yellow gold', yellow_gold: 'yellow gold', white_gold: 'white gold', rose_gold: 'rose gold',
    silver: 'silver', platinum: 'platinum', palladium: 'palladium', other: 'other',
  }

  const filtered = activePieces.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    const categoryLabel = CATEGORIES.find(c => c.value === p.category)?.label ?? ''
    return (
      p.name.toLowerCase().includes(q) ||
      (metalDisplayLabels[p.metal_type] ?? p.metal_type).includes(q) ||
      categoryLabel.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.description?.toLowerCase().includes(q) ?? false) ||
      (p.metal_karat && `${p.metal_karat}k`.includes(q)) ||
      (p.watch_maker?.toLowerCase().includes(q) ?? false) ||
      (p.watch_reference?.toLowerCase().includes(q) ?? false) ||
      (p.watch_case_material?.toLowerCase().includes(q) ?? false) ||
      (p.watch_band_material?.toLowerCase().includes(q) ?? false) ||
      (p.gifted_by?.toLowerCase().includes(q) ?? false) ||
      (p.inherited_from?.toLowerCase().includes(q) ?? false) ||
      (p.history?.toLowerCase().includes(q) ?? false) ||
      (p.significance?.toLowerCase().includes(q) ?? false) ||
      (p.gemstones?.some(g =>
        g.stone_type.toLowerCase().includes(q) ||
        g.cut.toLowerCase().includes(q) ||
        g.color.toLowerCase().includes(q) ||
        g.clarity.toLowerCase().includes(q)
      ) ?? false)
    )
  })

  const getAcquiredDate = (p: JewelryPiece): string => {
    if (p.acquisition_type === 'purchased' && p.date_purchased) return p.date_purchased
    if (p.date_received) return p.date_received
    return p.created_at?.split('T')[0] ?? ''
  }

  const getPieceValue = (p: JewelryPiece) => {
    if (valuationMode === 'appraised' && p.appraised_value != null) return p.appraised_value
    const melt = calculateMeltValue(p.metal_type, p.metal_weight_grams, p.metal_karat, prices) ?? 0
    const gem = calculateGemstoneValue(p.gemstones)
    return melt + gem
  }

  const getGainPct = (p: JewelryPiece) => {
    const val = getPieceValue(p)
    if (p.price_paid == null || p.price_paid <= 0) return -Infinity
    return ((val - p.price_paid) / p.price_paid) * 100
  }

  const getGainAmt = (p: JewelryPiece) => {
    const val = getPieceValue(p)
    if (p.price_paid == null) return -Infinity
    return val - p.price_paid
  }

  // Sort
  const dir = sortAsc ? 1 : -1
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'weight') {
      return dir * ((a.metal_weight_grams ?? 0) - (b.metal_weight_grams ?? 0))
    }
    if (sortBy === 'value') {
      return dir * (getPieceValue(a) - getPieceValue(b))
    }
    if (sortBy === 'gain_pct') {
      return dir * (getGainPct(a) - getGainPct(b))
    }
    if (sortBy === 'gain_amt') {
      return dir * (getGainAmt(a) - getGainAmt(b))
    }
    if (sortBy === 'date') {
      return dir * getAcquiredDate(a).localeCompare(getAcquiredDate(b))
    }
    return dir * a.name.localeCompare(b.name)
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

  const portfolioLabel = profile?.display_name ? `${profile.display_name}'s Trove` : 'My Trove'
  const selectedCollectionShares = selectedCollection ? (shares[selectedCollection] ?? []) : []
  const selectedCollectionName = selectedCollection ? collections.find(c => c.id === selectedCollection)?.name : null

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
      <NotificationBanner
        notifications={notifications}
        onDismiss={dismissNotif}
        onDismissAll={dismissAllNotifs}
        onOpenFriends={() => setShowFriends(true)}
        onViewFriend={(n) => {
          if (!n.senderUserId) return
          const friend = friends.find(f => {
            const fid = f.requester_id === userId ? f.addressee_id : f.requester_id
            return fid === n.senderUserId
          })
          if (friend) setViewingFriend(friend)
        }}
      />
      <SpotPriceBar prices={prices} loading={pricesLoading} onRefresh={refreshPrices} />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Friend profile inline view */}
        {viewingFriend && viewingFriend.friend_profile ? (
          <FriendProfile
            profile={viewingFriend.friend_profile}
            prices={prices}
            fetchPieces={fetchFriendPieces}
            fetchSharedCollections={fetchSharedCollections}
            fetchSharedPieceCollections={fetchSharedPieceCollections}
            onRemove={() => { removeFriend(viewingFriend.id); setViewingFriend(null) }}
            onBack={() => setViewingFriend(null)}
          />
        ) : (
        <>
        {tab === 'portfolio' && (
          <>
            <PortfolioSummary
              pieces={filtered}
              prices={prices}
              valuationMode={valuationMode}
              onToggleMode={() => setValuationMode(m => m === 'melt' ? 'appraised' : 'melt')}
              privacyMode={privacyMode}
              onTogglePrivacy={togglePrivacy}
            />
            <PortfolioChart pieces={filtered} prices={prices} valuationMode={valuationMode} privacyMode={privacyMode} />
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
          {/* Sharing info for selected collection */}
          {tab === 'portfolio' && selectedCollection && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowSharePicker(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-800 border border-neutral-700 hover:border-gold-400/40 transition text-neutral-300"
              >
                <Share2 className="w-3 h-3 text-gold-400" />
                {selectedCollectionShares.length > 0
                  ? `Shared with ${selectedCollectionShares.length} friend${selectedCollectionShares.length > 1 ? 's' : ''}`
                  : 'Not shared'}
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
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setSortAsc(prev => !prev)}
                className="p-1 text-neutral-500 hover:text-gold-400 transition rounded-md hover:bg-neutral-800"
                title={sortAsc ? 'Ascending — click to reverse' : 'Descending — click to reverse'}
              >
                {sortAsc ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
              </button>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-gold-400"
              >
                <option value="name">Name</option>
                <option value="value">Value</option>
                <option value="gain_pct">Gain %</option>
                <option value="gain_amt">Gain $</option>
                <option value="weight">Weight</option>
                <option value="date">Date Acquired</option>
              </select>
              <div className="relative" ref={cardSettingsRef}>
                <button
                  onClick={() => setShowCardSettings(!showCardSettings)}
                  className="p-1.5 text-neutral-500 hover:text-gold-400 transition rounded-md hover:bg-neutral-800"
                  title="Card display settings"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
                {showCardSettings && (
                  <div className="absolute right-0 mt-1 w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 py-2">
                    <p className="px-3 py-1.5 text-xs font-medium text-neutral-500 uppercase tracking-wide">Show on cards</p>
                    {([
                      ['value', 'Value'],
                      ['roi', 'ROI / Change'],
                      ['weight', 'Weight'],
                      ['metal', 'Metal & Karat'],
                      ['category', 'Category'],
                      ['gemstones', 'Gemstones'],
                    ] as [keyof CardDisplayPrefs, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => updateCardPref(key)}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 transition"
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          cardPrefs[key] ? 'bg-gold-400 border-gold-400' : 'border-neutral-600'
                        }`}>
                          {cardPrefs[key] && <span className="text-black text-xs font-bold">✓</span>}
                        </div>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Styling tab */}
        {tab === 'styling' && (
          <StylingBoards
            boards={boards}
            pieces={pieces}
            onAdd={addBoard}
            onUpdateBoard={updateBoard}
            onDelete={deleteBoard}
            onUpdatePiece={updatePiece}
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
              {selectedCollection ? (
                <button
                  onClick={() => setShowPiecePicker(true)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition text-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add from Trove
                </button>
              ) : (
                <button
                  onClick={() => { setEditingPiece(null); setShowForm(true) }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition text-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  {tab === 'wishlist' ? 'Add to Wishlist' : 'Add Piece'}
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-16 text-neutral-500">Loading...</div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-16">
                {activePieces.length === 0 ? (
                  tab === 'wishlist' ? (
                    <p className="text-neutral-500">Your wishlist is empty.</p>
                  ) : selectedCollection ? (
                    <div className="space-y-3">
                      <Gem className="w-10 h-10 text-neutral-700 mx-auto" />
                      <p className="text-neutral-500">No pieces in "{selectedCollectionName}" yet.</p>
                      <button
                        onClick={() => setShowCollections(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add from Trove
                      </button>
                    </div>
                  ) : (
                    <p className="text-neutral-500">No pieces yet. Add your first piece!</p>
                  )
                ) : (
                  <p className="text-neutral-500">No pieces match your search.</p>
                )}
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
                      privacyMode={privacyMode}
                      onTogglePrivacy={togglePrivacy}
                      cardPrefs={cardPrefs}
                    />
                  </div>
                ))}
                {/* Add piece card at end of collection view */}
                {selectedCollection && (
                  <button
                    onClick={() => setShowPiecePicker(true)}
                    className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-700 rounded-xl p-8 hover:border-gold-400/40 hover:bg-neutral-900/50 transition cursor-pointer min-h-[200px]"
                  >
                    <Plus className="w-8 h-8 text-neutral-600" />
                    <span className="text-sm text-neutral-500">Add from Trove</span>
                  </button>
                )}
              </div>
            )}
          </>
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
          onSearchProfiles={searchProfiles}
          onRespond={respondToRequest}
          onViewFriend={(f) => setViewingFriend(f)}
          onClose={() => setShowFriends(false)}
        />
      )}

      {showCollections && (
        <CollectionManager
          collections={collections}
          pieces={collectionPieces}
          pieceCollectionMap={pieceCollectionMap}
          friends={friends}
          userId={userId}
          shares={shares}
          onAdd={addCollection}
          onRename={renameCollection}
          onDelete={deleteCollection}
          onAssignPiece={assignPiece}
          onUnassignPiece={unassignPiece}
          onShare={shareCollection}
          onUnshare={unshareCollection}
          onClose={() => setShowCollections(false)}
        />
      )}

      {showPiecePicker && selectedCollection && (
        <PiecePicker
          collectionName={selectedCollectionName ?? ''}
          pieces={collectionPieces}
          assignedPieceIds={
            Object.entries(pieceCollectionMap)
              .filter(([, colIds]) => colIds.includes(selectedCollection))
              .map(([pieceId]) => pieceId)
          }
          onAssign={(pieceId) => assignPiece(pieceId, selectedCollection)}
          onUnassign={(pieceId) => unassignPiece(pieceId, selectedCollection)}
          onClose={() => setShowPiecePicker(false)}
        />
      )}

      {showSharePicker && selectedCollection && (
        <CollectionSharePicker
          collectionName={selectedCollectionName ?? ''}
          friends={friends}
          userId={userId}
          sharedWith={selectedCollectionShares}
          onShare={(friendId) => shareCollection(selectedCollection, friendId)}
          onUnshare={(friendId) => unshareCollection(selectedCollection, friendId)}
          onUpdatePrefs={(friendId, prefs) => updateSharePrefs(selectedCollection, friendId, prefs)}
          onClose={() => setShowSharePicker(false)}
        />
      )}
    </div>
  )
}
