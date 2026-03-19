import { Gem, Trash2, UserPlus, Sparkles } from 'lucide-react'
import type { FeedPost, UserProfile, JewelryPiece } from '../types'
import { REACTION_TYPES, CATEGORIES } from '../types'
import { isGoldType, metalBadgeClasses } from '../lib/prices'
import CroppedImage from './CroppedImage'

const metalLabelsShort: Record<string, string> = {
  gold: 'Gold', yellow_gold: 'Gold', white_gold: 'White Gold', rose_gold: 'Rose Gold',
  silver: 'Silver', platinum: 'Platinum', palladium: 'Palladium', other: 'Other',
}

function karatLabel(piece: JewelryPiece) {
  if (isGoldType(piece.metal_type) && piece.metal_karat) return `${piece.metal_karat}K`
  if (piece.metal_type === 'silver' && piece.metal_karat) return `${piece.metal_karat}`
  return ''
}

function PieceDetails({ piece }: { piece: JewelryPiece }) {
  const categoryLabel = CATEGORIES.find(c => c.value === piece.category)?.label
  const details: string[] = []

  // Category-specific details
  if (piece.category === 'chain' || piece.category === 'necklace') {
    if (piece.chain_length) details.push(`${piece.chain_length}" length`)
    if (piece.chain_width) details.push(`${piece.chain_width}mm width`)
  }
  if (piece.category === 'bracelet') {
    if (piece.bracelet_length) details.push(`${piece.bracelet_length}" length`)
    if (piece.bracelet_type === 'bangle' && piece.bangle_size) details.push(`${piece.bangle_size}mm bangle`)
  }
  if (piece.category === 'ring') {
    if (piece.ring_size) details.push(`Size ${piece.ring_size}`)
    if (piece.ring_band_width) details.push(`${piece.ring_band_width}mm band`)
  }
  if (piece.category === 'watch') {
    if (piece.watch_maker) details.push(piece.watch_maker)
    if (piece.watch_movement) details.push(piece.watch_movement)
    if (piece.watch_dial_size) details.push(`${piece.watch_dial_size}mm`)
    if (piece.watch_case_material) details.push(piece.watch_case_material)
    if (piece.watch_reference) details.push(`Ref: ${piece.watch_reference}`)
  }

  const gemNames = piece.gemstones?.map(g => g.stone_type).filter(Boolean) ?? []

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-1">
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${metalBadgeClasses(piece.metal_type)}`}>
        {metalLabelsShort[piece.metal_type] ?? piece.metal_type} {karatLabel(piece)}
      </span>
      {categoryLabel && (
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-300">
          {categoryLabel}
        </span>
      )}
      {gemNames.length > 0 && (
        <span className="text-xs text-neutral-500">{gemNames.join(', ')}</span>
      )}
      {details.length > 0 && (
        <span className="text-xs text-neutral-500">{details.join(' · ')}</span>
      )}
    </div>
  )
}

interface Props {
  posts: FeedPost[]
  dailyGem: FeedPost | null
  loading: boolean
  currentUserId: string
  onToggleReaction: (postId: string, reactionType: string) => void
  onDeletePost: (postId: string) => void
  onViewPiece?: (piece: FeedPost['piece']) => void
  onSendFriendRequest?: (userId: string) => void
  friends: string[] // friend user IDs for showing "Add Friend" button
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return `${Math.floor(days / 7)}w`
}

function InstagramLink({ handle }: { handle: string | null | undefined }) {
  if (!handle) return null
  return (
    <a
      href={`https://instagram.com/${handle}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-neutral-500 hover:text-pink-400 transition"
    >
      @{handle}
    </a>
  )
}

function Avatar({ profile, size = 'md' }: { profile?: UserProfile | null; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  if (profile?.avatar_url) {
    return (
      <div className={`${dim} rounded-full overflow-hidden border border-neutral-700 shrink-0`}>
        <CroppedImage src={profile.avatar_url} alt="" crop={profile.avatar_crop} className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div className={`${dim} rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0`}>
      <span className="text-sm font-bold text-gold-400">
        {(profile?.display_name || '?')[0]?.toUpperCase()}
      </span>
    </div>
  )
}

function ReactionBar({ post, onToggle }: { post: FeedPost; onToggle: (type: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {REACTION_TYPES.map(r => {
        const count = post.reactions.find(rc => rc.reaction_type === r.type)?.count ?? 0
        const isActive = post.user_reactions.includes(r.type)
        return (
          <button
            key={r.type}
            onClick={(e) => { e.stopPropagation(); onToggle(r.type) }}
            className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm transition ${
              isActive
                ? 'bg-gold-400/15 border border-gold-400/30'
                : 'bg-neutral-800 border border-neutral-700 hover:border-neutral-600'
            }`}
          >
            <span>{r.emoji}</span>
            {count > 0 && <span className={isActive ? 'text-gold-400' : 'text-neutral-400'}>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

function PostCard({
  post,
  currentUserId,
  onToggleReaction,
  onDeletePost,
  onViewPiece,
  onSendFriendRequest,
  isFriend,
  isDailyGem,
}: {
  post: FeedPost
  currentUserId: string
  onToggleReaction: (postId: string, type: string) => void
  onDeletePost: (postId: string) => void
  onViewPiece?: (piece: FeedPost['piece']) => void
  onSendFriendRequest?: (userId: string) => void
  isFriend: boolean
  isDailyGem?: boolean
}) {
  const piece = post.piece
  const profilePhoto = piece?.photo_urls?.[piece.profile_photo_index ?? 0] ?? piece?.photo_urls?.[0]

  return (
    <div className={`bg-neutral-900 rounded-xl border overflow-hidden ${
      isDailyGem ? 'border-gold-400/40' : 'border-neutral-800'
    }`}>
      {isDailyGem && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gold-400/10 border-b border-gold-400/20">
          <Gem className="w-4 h-4 text-gold-400" />
          <span className="text-sm font-semibold text-gold-400">Daily Gem</span>
        </div>
      )}

      {/* Author header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar profile={post.author_profile} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">
              {post.author_profile?.display_name || 'Anonymous'}
            </span>
            <span className="text-xs text-neutral-600">{formatTimeAgo(post.created_at)}</span>
          </div>
          <InstagramLink handle={post.author_profile?.instagram_handle} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isFriend && post.user_id !== currentUserId && onSendFriendRequest && (
            <button
              onClick={() => onSendFriendRequest(post.user_id)}
              className="p-1.5 text-neutral-500 hover:text-gold-400 transition rounded-lg hover:bg-neutral-800"
              title="Send friend request"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}
          {post.user_id === currentUserId && (
            <button
              onClick={() => onDeletePost(post.id)}
              className="p-1.5 text-neutral-600 hover:text-red-400 transition rounded-lg hover:bg-neutral-800"
              title="Delete post"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Piece photo */}
      {profilePhoto ? (
        <div
          className="aspect-square overflow-hidden cursor-pointer bg-neutral-800"
          onClick={() => onViewPiece?.(piece)}
        >
          <CroppedImage
            src={profilePhoto}
            alt={piece?.name ?? ''}
            crop={piece?.profile_photo_crop}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className="aspect-square bg-neutral-800 flex items-center justify-center cursor-pointer"
          onClick={() => onViewPiece?.(piece)}
        >
          <Gem className="w-16 h-16 text-neutral-700" />
        </div>
      )}

      {/* Info */}
      <div className="px-4 py-3 space-y-2">
        <div>
          <h3
            className="text-sm font-semibold text-white cursor-pointer hover:text-gold-400 transition"
            onClick={() => onViewPiece?.(piece)}
          >
            {piece?.name ?? 'Untitled'}
          </h3>
          {piece && <PieceDetails piece={piece} />}
          {post.caption && (
            <p className="text-sm text-neutral-400 mt-1.5">{post.caption}</p>
          )}
        </div>
        <ReactionBar post={post} onToggle={(type) => onToggleReaction(post.id, type)} />
      </div>
    </div>
  )
}

export default function ShowAndTellFeed({
  posts,
  dailyGem,
  loading,
  currentUserId,
  onToggleReaction,
  onDeletePost,
  onViewPiece,
  onSendFriendRequest,
  friends,
}: Props) {
  if (loading) {
    return (
      <div className="text-center py-16 text-neutral-500">Loading feed...</div>
    )
  }

  const feedPosts = posts.filter(p => p.id !== dailyGem?.id)
  const friendSet = new Set(friends)

  if (!dailyGem && feedPosts.length === 0) {
    return (
      <div className="text-center py-16 bg-neutral-900 rounded-2xl border border-neutral-800">
        <Sparkles className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-white mb-1">Show & Tell</h3>
        <p className="text-sm text-neutral-500 max-w-sm mx-auto">
          Share your favorite pieces with friends. Open any piece and tap "Share to Feed" to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {dailyGem && (
        <PostCard
          post={dailyGem}
          currentUserId={currentUserId}
          onToggleReaction={onToggleReaction}
          onDeletePost={onDeletePost}
          onViewPiece={onViewPiece}
          onSendFriendRequest={onSendFriendRequest}
          isFriend={friendSet.has(dailyGem.user_id)}
          isDailyGem
        />
      )}
      {feedPosts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onToggleReaction={onToggleReaction}
          onDeletePost={onDeletePost}
          onViewPiece={onViewPiece}
          onSendFriendRequest={onSendFriendRequest}
          isFriend={friendSet.has(post.user_id)}
        />
      ))}
    </div>
  )
}
