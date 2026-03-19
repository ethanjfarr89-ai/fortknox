import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { Plus, Search, FolderOpen, Settings, ArrowUp, ArrowDown, Share2, Gem, SlidersHorizontal, FileText, Clock, CheckSquare, FolderPlus, LayoutGrid, List, ChevronDown, Heart, Archive, Sparkles } from 'lucide-react'
import type { JewelryPiece, JewelryPieceInsert, ValuationMode, Category, CardDisplayPrefs, Friendship } from '../types'
import { CATEGORIES, DEFAULT_CARD_PREFS } from '../types'
import type { SummaryDisplayPrefs } from '../components/PortfolioSummary'
import { DEFAULT_SUMMARY_PREFS } from '../components/PortfolioSummary'
import { usePieces } from '../lib/usePieces'
import { useSpotPrices } from '../lib/useSpotPrices'
import { useSnapshots } from '../lib/useSnapshots'
import { useProfile } from '../lib/useProfile'
import { useCollections } from '../lib/useCollections'
import { useStylingBoards } from '../lib/useStylingBoards'
import { useFriends } from '../lib/useFriends'
import { useNotifications } from '../lib/useNotifications'
import { usePriceAlerts } from '../lib/usePriceAlerts'
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
import ReportIssue from '../components/ReportIssue'
import FriendProfile from '../components/FriendProfile'
import CollectionManager from '../components/CollectionManager'
import PiecePicker from '../components/PiecePicker'
import CollectionSharePicker from '../components/CollectionSharePicker'
import ExportReport from '../components/ExportReport'
import Onboarding from '../components/Onboarding'
import PieceTimeline from '../components/PieceTimeline'
import { usePieceShares } from '../lib/usePieceShares'
import RetireModal from '../components/RetireModal'
import ShowAndTellFeed from '../components/ShowAndTellFeed'
import { useFeed } from '../lib/useFeed'

interface Props {
  userId: string
  onSignOut: () => void
}

type Tab = 'portfolio' | 'wishlist' | 'archive' | 'styling' | 'feed'

export default function Dashboard({ userId, onSignOut }: Props) {
  const { pieces, loading, addPiece, updatePiece, deletePiece, retirePiece, reactivatePiece, toggleFavorite } = usePieces(userId)
  const { prices, loading: pricesLoading, refresh: refreshPrices } = useSpotPrices()
  const { snapshots, saveSnapshot } = useSnapshots(userId)
  const { profile, updateProfile } = useProfile(userId)
  const { collections, pieceCollectionMap, shares, addCollection, renameCollection, deleteCollection, assignPiece, unassignPiece, shareCollection, unshareCollection, updateSharePrefs } = useCollections(userId)
  const { boards, addBoard, updateBoard, deleteBoard } = useStylingBoards(userId)
  const { friends, pending, sendRequest, searchProfiles, respondToRequest, removeFriend, fetchFriendPieces, fetchSharedCollections, fetchSharedPieceCollections } = useFriends(userId)
  const { createShare, deleteShare, updateShowValue, getShareForPiece } = usePieceShares(userId)
  const { posts: feedPosts, dailyGem, loading: feedLoading, createPost: createFeedPost, deletePost: deleteFeedPost, toggleReaction } = useFeed(userId)
  // Compute current total for price alerts
  const currentTotalValue = useMemo(() => {
    let total = 0
    for (const p of pieces.filter(p => !p.is_wishlist)) {
      const melt = calculateMeltValue(p.metal_type, p.metal_weight_grams, p.metal_karat, prices)
      const gem = calculateGemstoneValue(p.gemstones)
      total += (melt ?? 0) + gem
    }
    return total
  }, [pieces, prices])

  const priceAlerts = usePriceAlerts(snapshots, currentTotalValue, prices)
  const { notifications, unreadCount, history: notifHistory, dismiss: dismissNotif, dismissAll: dismissAllNotifs, markAllRead } = useNotifications(userId, pending, priceAlerts)

  const [valuationMode, setValuationMode] = useState<ValuationMode>('melt')
  const [tab, setTab] = useState<Tab>('portfolio')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingPiece, setEditingPiece] = useState<JewelryPiece | null>(null)
  const [viewingPiece, setViewingPiece] = useState<JewelryPiece | null>(null)
  const [defaultFormValues, setDefaultFormValues] = useState<Partial<JewelryPieceInsert> | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showCollections, setShowCollections] = useState(false)
  const [showPiecePicker, setShowPiecePicker] = useState(false)
  const [showSharePicker, setShowSharePicker] = useState(false)
  const [viewingFriend, setViewingFriend] = useState<Friendship | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'weight' | 'date' | 'gain_pct' | 'gain_amt'>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem('trove_privacy') === 'true')
  const [cardPrefs, setCardPrefs] = useState<CardDisplayPrefs>(() => {
    try { return JSON.parse(localStorage.getItem('trove_card_prefs') ?? '') }
    catch { return DEFAULT_CARD_PREFS }
  })
  const [summaryPrefs, setSummaryPrefs] = useState<SummaryDisplayPrefs>(() => {
    try { return JSON.parse(localStorage.getItem('trove_summary_prefs') ?? '') }
    catch { return DEFAULT_SUMMARY_PREFS }
  })
  const [showCardSettings, setShowCardSettings] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showReportIssue, setShowReportIssue] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [recentCollapsed, setRecentCollapsed] = useState(() => localStorage.getItem('trove_recent_collapsed') === 'true')
  const [bulkSelect, setBulkSelect] = useState(false)
  const [selectedPieceIds, setSelectedPieceIds] = useState<Set<string>>(new Set())
  const [retiringPiece, setRetiringPiece] = useState<JewelryPiece | null>(null)
  const [viewingFromFeed, setViewingFromFeed] = useState(false)
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Escape to close modals
      if (e.key === 'Escape') {
        if (retiringPiece) { setRetiringPiece(null); return }
        if (showForm) { closeForm(); return }
        if (viewingPiece) { setViewingPiece(null); return }
        if (showProfile) { setShowProfile(false); return }
        if (showCollections) { setShowCollections(false); return }
        if (showPiecePicker) { setShowPiecePicker(false); return }
        if (showSharePicker) { setShowSharePicker(false); return }
        if (showExport) { setShowExport(false); return }
        if (showReportIssue) { setShowReportIssue(false); return }
        if (viewingFriend) { setViewingFriend(null); return }
      }
      // Cmd/Ctrl+N to add piece
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        setEditingPiece(null)
        setDefaultFormValues(null)
        setShowForm(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showForm, viewingPiece, showProfile, showCollections, showPiecePicker, showSharePicker, showExport, showReportIssue, viewingFriend, retiringPiece])

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

  const updateSummaryPref = (key: keyof SummaryDisplayPrefs) => {
    setSummaryPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem('trove_summary_prefs', JSON.stringify(next))
      return next
    })
  }

  // Record daily snapshot (active pieces only)
  useEffect(() => {
    const collectionPieces = pieces.filter(p => !p.is_wishlist && (p.status === 'active' || !p.status))
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

  const collectionPieces = pieces.filter(p => !p.is_wishlist && (p.status === 'active' || !p.status))
  const archivedPieces = pieces.filter(p => !p.is_wishlist && p.status && p.status !== 'active')
  const wishlistPieces = pieces.filter(p => p.is_wishlist)

  // Filter by selected sub-collection
  let activePieces = tab === 'archive' ? archivedPieces : tab === 'wishlist' ? wishlistPieces : collectionPieces
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

  // Filter by favorites
  if (showFavorites) {
    activePieces = activePieces.filter(p => p.is_favorite)
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

  // Recently added (last 5 pieces added in the past 7 days)
  const recentlyAdded = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    return collectionPieces
      .filter(p => p.created_at > sevenDaysAgo)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5)
  }, [collectionPieces])

  const handleSave = async (data: JewelryPieceInsert) => {
    if (editingPiece) {
      const result = await updatePiece(editingPiece.id, data)
      // Update viewingPiece so PieceDetail shows fresh data after saving
      if (result.data) setViewingPiece(result.data)
      return result
    }
    return addPiece(data)
  }

  const handleDelete = (id: string) => {
    const piece = pieces.find(p => p.id === id)
    if (piece) setRetiringPiece(piece)
  }

  const handleHardDelete = async (id: string) => {
    await deletePiece(id)
    if (viewingPiece?.id === id) setViewingPiece(null)
  }

  const handleRetireConfirm = async (id: string, opts: Parameters<typeof retirePiece>[1]) => {
    await retirePiece(id, opts)
    if (viewingPiece?.id === id) setViewingPiece(null)
  }

  const handleEdit = (piece: JewelryPiece) => {
    setEditingPiece(piece)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingPiece(null)
    setDefaultFormValues(null)
  }

  const handleDuplicate = (piece: JewelryPiece) => {
    const { id, user_id, created_at, updated_at, ...rest } = piece
    setViewingPiece(null)
    setEditingPiece(null)
    setDefaultFormValues({ ...rest, name: `Copy of ${piece.name}` })
    setShowForm(true)
  }

  const togglePieceSelect = useCallback((pieceId: string) => {
    setSelectedPieceIds(prev => {
      const next = new Set(prev)
      if (next.has(pieceId)) next.delete(pieceId)
      else next.add(pieceId)
      return next
    })
  }, [])

  const bulkRetire = async () => {
    if (!window.confirm(`Archive ${selectedPieceIds.size} piece${selectedPieceIds.size > 1 ? 's' : ''} as retired?`)) return
    const today = new Date().toISOString().split('T')[0]
    for (const id of selectedPieceIds) {
      await retirePiece(id, { status: 'retired', date_departed: today })
    }
    setSelectedPieceIds(new Set())
    setBulkSelect(false)
  }

  const bulkAssignCollection = async (collectionId: string) => {
    for (const pieceId of selectedPieceIds) {
      await assignPiece(pieceId, collectionId)
    }
    setSelectedPieceIds(new Set())
    setBulkSelect(false)
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
        userId={userId}
        friends={friends}
        pending={pending}
        notifications={notifications}
        unreadCount={unreadCount}
        history={notifHistory}
        onDismissNotif={dismissNotif}
        onDismissAllNotifs={dismissAllNotifs}
        onMarkAllRead={markAllRead}
        onSendRequest={sendRequest}
        onSearchProfiles={searchProfiles}
        onRespond={respondToRequest}
        onViewFriend={(f) => setViewingFriend(f)}
        onViewFriendFromNotif={(n) => {
          if (!n.senderUserId) return
          const friend = friends.find(f => {
            const fid = f.requester_id === userId ? f.addressee_id : f.requester_id
            return fid === n.senderUserId
          })
          if (friend) setViewingFriend(friend)
        }}
        onSignOut={onSignOut}
        onOpenProfile={() => setShowProfile(true)}
        onReportIssue={() => setShowReportIssue(true)}
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
        {/* Onboarding — context-aware based on user progress */}
        <Onboarding
          onAddPiece={() => { setEditingPiece(null); setDefaultFormValues(null); setShowForm(true) }}
          pieceCount={collectionPieces.length}
          hasFriends={friends.length > 0}
        />

        {tab === 'portfolio' && (
          <>
            <PortfolioSummary
              pieces={filtered}
              prices={prices}
              valuationMode={valuationMode}
              onToggleMode={() => setValuationMode(m => m === 'melt' ? 'appraised' : 'melt')}
              privacyMode={privacyMode}
              onTogglePrivacy={togglePrivacy}
              summaryPrefs={summaryPrefs}
              onUpdateSummaryPref={updateSummaryPref}
            />
            <PortfolioChart pieces={pieces.filter(p => !p.is_wishlist)} prices={prices} valuationMode={valuationMode} privacyMode={privacyMode} snapshots={snapshots} />

            {/* Recently added */}
            {recentlyAdded.length > 0 && (
              <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
                <button
                  onClick={() => setRecentCollapsed(prev => { const next = !prev; localStorage.setItem('trove_recent_collapsed', String(next)); return next })}
                  className="w-full flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-gold-400" />
                  <h3 className="text-sm font-medium text-neutral-400">Recently Added</h3>
                  <span className="text-xs text-neutral-600 ml-1">{recentlyAdded.length}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-neutral-600 ml-auto transition-transform ${recentCollapsed ? '-rotate-90' : ''}`} />
                </button>
                {!recentCollapsed && <div className="flex gap-3 overflow-x-auto mt-3">
                  {recentlyAdded.map(piece => {
                    const photoUrl = piece.photo_urls?.[piece.profile_photo_index ?? 0] ?? piece.photo_urls?.[0]
                    return (
                      <button
                        key={piece.id}
                        onClick={() => setViewingPiece(piece)}
                        className="flex items-center gap-2.5 bg-neutral-800 rounded-lg p-2 pr-4 hover:bg-neutral-700 transition shrink-0"
                      >
                        {photoUrl ? (
                          <img src={photoUrl} alt="" className="w-9 h-9 rounded object-cover border border-neutral-700" />
                        ) : (
                          <div className="w-9 h-9 rounded bg-neutral-700 flex items-center justify-center">
                            <Gem className="w-4 h-4 text-neutral-500" />
                          </div>
                        )}
                        <div className="text-left">
                          <p className="text-sm text-white font-medium truncate max-w-[120px]">{piece.name}</p>
                          <p className="text-xs text-neutral-500">{new Date(piece.created_at).toLocaleDateString()}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>}
              </div>
            )}
          </>
        )}

        {/* Main tabs */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-neutral-900 rounded-lg p-1 border border-neutral-800 overflow-x-auto scrollbar-hide" style={{ overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => { setTab('portfolio'); setSelectedCollection(null) }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap shrink-0 ${
                tab === 'portfolio' ? 'bg-gold-400 text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {portfolioLabel} ({collectionPieces.length})
            </button>
            <button
              onClick={() => setTab('feed')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap shrink-0 ${
                tab === 'feed' ? 'bg-gold-400 text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Show & Tell
            </button>
            <button
              onClick={() => setTab('styling')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap shrink-0 ${
                tab === 'styling' ? 'bg-gold-400 text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Styling
            </button>
            <button
              onClick={() => setTab('wishlist')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap shrink-0 ${
                tab === 'wishlist' ? 'bg-gold-400 text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Wishlist ({wishlistPieces.length})
            </button>
            {archivedPieces.length > 0 && (
              <button
                onClick={() => setTab('archive')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap shrink-0 ${
                  tab === 'archive' ? 'bg-gold-400 text-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                Archive ({archivedPieces.length})
              </button>
            )}
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
              {collections.map(c => {
                // Find first piece in collection for cover photo
                const firstPieceId = Object.entries(pieceCollectionMap).find(([, colIds]) => colIds.includes(c.id))?.[0]
                const coverPiece = firstPieceId ? collectionPieces.find(p => p.id === firstPieceId) : null
                const coverUrl = coverPiece?.photo_urls?.[coverPiece.profile_photo_index ?? 0] ?? coverPiece?.photo_urls?.[0]

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCollection(c.id === selectedCollection ? null : c.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                      selectedCollection === c.id ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {coverUrl && (
                      <img src={coverUrl} alt="" className="w-4 h-4 rounded-sm object-cover" />
                    )}
                    {c.name}
                  </button>
                )
              })}
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
        {tab !== 'styling' && tab !== 'feed' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setShowFavorites(prev => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition whitespace-nowrap shrink-0 ${
                  showFavorites ? 'bg-red-900/30 text-red-400' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Heart className={`w-3 h-3 ${showFavorites ? 'fill-red-400' : ''}`} />
                Favorites
              </button>
              <div className="w-px h-4 bg-neutral-700 shrink-0" />
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition whitespace-nowrap shrink-0 ${
                  !selectedCategory ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                All Categories
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setSelectedCategory(c.value === selectedCategory ? null : c.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition whitespace-nowrap shrink-0 ${
                    selectedCategory === c.value ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex gap-0.5 bg-neutral-800 rounded-md p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded transition ${viewMode === 'grid' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`p-1 rounded transition ${viewMode === 'timeline' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                  title="Timeline view"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => { setBulkSelect(b => !b); setSelectedPieceIds(new Set()) }}
                className={`p-1.5 transition rounded-md hover:bg-neutral-800 ${bulkSelect ? 'text-gold-400' : 'text-neutral-500 hover:text-gold-400'}`}
                title={bulkSelect ? 'Exit bulk select' : 'Bulk select'}
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowExport(true)}
                className="p-1.5 text-neutral-500 hover:text-gold-400 transition rounded-md hover:bg-neutral-800"
                title="Export report"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
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

        {/* Feed tab */}
        {tab === 'feed' && (
          <ShowAndTellFeed
            posts={feedPosts}
            dailyGem={dailyGem}
            loading={feedLoading}
            currentUserId={userId}
            onToggleReaction={toggleReaction}
            onDeletePost={deleteFeedPost}
            onViewPiece={(piece) => { if (piece) { setViewingPiece(piece); setViewingFromFeed(true) } }}
            onSendFriendRequest={sendRequest}
            friends={friends.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id)}
          />
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
        {tab !== 'styling' && tab !== 'feed' && (
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

            {!loading && sorted.length > 0 && (
              <p className="text-xs text-neutral-500 font-medium">{sorted.length} Piece{sorted.length !== 1 ? 's' : ''}</p>
            )}

            {loading ? (
              <div className="text-center py-16 text-neutral-500">Loading...</div>
            ) : viewMode === 'timeline' ? (
              <PieceTimeline
                pieces={sorted}
                prices={prices}
                valuationMode={valuationMode}
                privacyMode={privacyMode}
                onViewPiece={setViewingPiece}
              />
            ) : sorted.length === 0 ? (
              <div className="text-center py-16">
                {activePieces.length === 0 ? (
                  tab === 'wishlist' ? (
                    <div className="text-center py-8">
                      <Gem className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                      <p className="text-sm text-neutral-500">Your wishlist is empty.</p>
                      <p className="text-xs text-neutral-600 mt-1">Track pieces you have your eye on.</p>
                    </div>
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
                    <div className="text-center py-8">
                      <Gem className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                      <p className="text-sm text-neutral-500">No pieces yet.</p>
                      <button
                        onClick={() => { setEditingPiece(null); setShowForm(true) }}
                        className="inline-flex items-center gap-2 px-4 py-2 mt-3 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add your first piece
                      </button>
                    </div>
                  )
                ) : (
                  <p className="text-neutral-500">No pieces match your search.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sorted.map(piece => (
                  <div
                    key={piece.id}
                    onClick={() => bulkSelect ? togglePieceSelect(piece.id) : setViewingPiece(piece)}
                    className={`cursor-pointer relative h-full ${bulkSelect && selectedPieceIds.has(piece.id) ? 'ring-2 ring-gold-400 rounded-xl' : ''}`}
                  >
                    {bulkSelect && (
                      <div className="absolute top-2 left-2 z-10">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                          selectedPieceIds.has(piece.id) ? 'bg-gold-400 border-gold-400' : 'border-neutral-500 bg-neutral-900/80'
                        }`}>
                          {selectedPieceIds.has(piece.id) && <span className="text-black text-xs font-bold">✓</span>}
                        </div>
                      </div>
                    )}
                    <PieceCard
                      piece={piece}
                      prices={prices}
                      valuationMode={valuationMode}
                      onEdit={handleEdit}
                      onDelete={tab === 'archive' ? (id) => { if (window.confirm('Permanently delete this piece? This cannot be undone.')) handleHardDelete(id) } : handleDelete}
                      privacyMode={privacyMode}
                      onTogglePrivacy={togglePrivacy}
                      cardPrefs={cardPrefs}
                      onToggleFavorite={tab === 'archive' ? undefined : toggleFavorite}
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

      {/* Bulk action bar */}
      {bulkSelect && selectedPieceIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl px-5 py-3">
          <span className="text-sm text-neutral-300 font-medium">{selectedPieceIds.size} selected</span>
          <div className="w-px h-5 bg-neutral-700" />
          {collections.length > 0 && (
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition">
                <FolderPlus className="w-4 h-4" /> Add to Collection
              </button>
              <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl py-1 min-w-[160px]">
                {collections.map(c => (
                  <button
                    key={c.id}
                    onClick={() => bulkAssignCollection(c.id)}
                    className="w-full text-left px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700 transition"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={bulkRetire}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-300 hover:text-gold-400 hover:bg-neutral-800 rounded-lg transition"
          >
            <Archive className="w-4 h-4" /> Archive
          </button>
          <button
            onClick={() => { setBulkSelect(false); setSelectedPieceIds(new Set()) }}
            className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-300 transition"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <PieceForm
          piece={editingPiece}
          onSave={handleSave}
          onClose={closeForm}
          defaultWishlist={tab === 'wishlist'}
          defaultValues={defaultFormValues}
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
          onClose={() => { setViewingPiece(null); setViewingFromFeed(false) }}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          pieceCollections={pieceCollectionMap[viewingPiece.id]}
          collections={collections}
          pieceShare={getShareForPiece(viewingPiece.id)}
          onCreateShare={createShare}
          onDeleteShare={deleteShare}
          onUpdateShareValue={updateShowValue}
          onToggleFavorite={toggleFavorite}
          onRetire={(piece) => setRetiringPiece(piece)}
          onReactivate={async (id) => { await reactivatePiece(id); setViewingPiece(null) }}
          onShareToFeed={async (pieceId, caption, isNominated) => { await createFeedPost(pieceId, caption, isNominated) }}
          readOnly={viewingFromFeed}
        />
      )}

      {showProfile && profile && (
        <ProfileSettings
          profile={profile}
          onUpdate={updateProfile}
          onClose={() => setShowProfile(false)}
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

      {showExport && (
        <ExportReport
          pieces={pieces}
          prices={prices}
          collections={collections}
          pieceCollectionMap={pieceCollectionMap}
          ownerName={profile?.display_name ?? null}
          onClose={() => setShowExport(false)}
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

      {showReportIssue && (
        <ReportIssue
          userId={userId}
          onClose={() => setShowReportIssue(false)}
        />
      )}

      {retiringPiece && (
        <RetireModal
          piece={retiringPiece}
          onRetire={handleRetireConfirm}
          onHardDelete={handleHardDelete}
          onClose={() => setRetiringPiece(null)}
        />
      )}
    </div>
  )
}
