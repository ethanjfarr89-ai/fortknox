import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { FeedPost, UserProfile, JewelryPiece, ReactionCount } from '../types'

export function useFeed(userId: string | undefined) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [dailyGem, setDailyGem] = useState<FeedPost | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchFeed = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    // 1. Fetch posts (RLS filters to own + friends + nominated)
    const { data: rawPosts, error } = await supabase
      .from('feed_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error || !rawPosts || rawPosts.length === 0) {
      setPosts([])
      setDailyGem(null)
      setLoading(false)
      return
    }

    // 2. Batch-fetch profiles
    const userIds = [...new Set(rawPosts.map(p => p.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)
    const profileMap = new Map<string, UserProfile>()
    for (const p of (profiles ?? [])) {
      profileMap.set(p.id, p as UserProfile)
    }

    // 3. Batch-fetch pieces
    const pieceIds = [...new Set(rawPosts.map(p => p.piece_id))]
    const { data: pieces } = await supabase
      .from('pieces')
      .select('*')
      .in('id', pieceIds)
    const pieceMap = new Map<string, JewelryPiece>()
    for (const p of (pieces ?? [])) {
      pieceMap.set(p.id, p as JewelryPiece)
    }

    // 4. Fetch all reactions for these posts
    const postIds = rawPosts.map(p => p.id)
    const { data: reactions } = await supabase
      .from('feed_reactions')
      .select('*')
      .in('post_id', postIds)

    // Build reaction counts per post + track current user's reactions
    const reactionsByPost = new Map<string, { counts: Map<string, number>; userReactions: Set<string> }>()
    for (const r of (reactions ?? [])) {
      if (!reactionsByPost.has(r.post_id)) {
        reactionsByPost.set(r.post_id, { counts: new Map(), userReactions: new Set() })
      }
      const entry = reactionsByPost.get(r.post_id)!
      entry.counts.set(r.reaction_type, (entry.counts.get(r.reaction_type) ?? 0) + 1)
      if (r.user_id === userId) {
        entry.userReactions.add(r.reaction_type)
      }
    }

    // 5. Assemble posts
    const assembled: FeedPost[] = rawPosts.map(raw => {
      const entry = reactionsByPost.get(raw.id)
      const reactionCounts: ReactionCount[] = []
      if (entry) {
        for (const [type, count] of entry.counts) {
          reactionCounts.push({ reaction_type: type, count })
        }
      }
      return {
        ...raw,
        piece: pieceMap.get(raw.piece_id),
        author_profile: profileMap.get(raw.user_id),
        reactions: reactionCounts,
        user_reactions: entry ? Array.from(entry.userReactions) : [],
      }
    })

    setPosts(assembled)

    // 6. Find Daily Gem — nominated post from last 48h with most reactions
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const candidates = assembled.filter(p => p.is_nominated && p.created_at > cutoff)
    if (candidates.length > 0) {
      const best = candidates.reduce((a, b) => {
        const aTotal = a.reactions.reduce((s, r) => s + r.count, 0)
        const bTotal = b.reactions.reduce((s, r) => s + r.count, 0)
        return bTotal > aTotal ? b : a
      })
      setDailyGem(best)
    } else {
      setDailyGem(null)
    }

    setLoading(false)
  }, [userId])

  useEffect(() => { fetchFeed() }, [fetchFeed])

  const createPost = async (pieceId: string, caption: string | null, isNominated: boolean) => {
    if (!userId) return
    const { error } = await supabase
      .from('feed_posts')
      .insert({ user_id: userId, piece_id: pieceId, caption: caption || null, is_nominated: isNominated })
    if (!error) await fetchFeed()
  }

  const deletePost = async (postId: string) => {
    await supabase.from('feed_posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    if (dailyGem?.id === postId) setDailyGem(null)
  }

  const toggleReaction = (postId: string, reactionType: string) => {
    if (!userId) return

    // Check if already reacted
    const post = posts.find(p => p.id === postId)
    const hasReaction = post?.user_reactions.includes(reactionType)

    // Optimistic update first — instant UI response
    const updatePosts = (prev: FeedPost[]) => prev.map(p => {
      if (p.id !== postId) return p
      let reactions = [...p.reactions]
      let userReactions = [...p.user_reactions]
      if (hasReaction) {
        reactions = reactions.map(r =>
          r.reaction_type === reactionType ? { ...r, count: r.count - 1 } : r
        ).filter(r => r.count > 0)
        userReactions = userReactions.filter(r => r !== reactionType)
      } else {
        const existing = reactions.find(r => r.reaction_type === reactionType)
        if (existing) {
          reactions = reactions.map(r =>
            r.reaction_type === reactionType ? { ...r, count: r.count + 1 } : r
          )
        } else {
          reactions.push({ reaction_type: reactionType, count: 1 })
        }
        userReactions.push(reactionType)
      }
      return { ...p, reactions, user_reactions: userReactions }
    })

    setPosts(updatePosts)
    setDailyGem(prev => {
      if (!prev || prev.id !== postId) return prev
      const updated = updatePosts([prev])[0]
      return updated
    })

    // Fire API call in background — don't block UI
    if (hasReaction) {
      supabase
        .from('feed_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('reaction_type', reactionType)
        .then()
    } else {
      supabase
        .from('feed_reactions')
        .insert({ post_id: postId, user_id: userId, reaction_type: reactionType })
        .then()
    }
  }

  return { posts, dailyGem, loading, createPost, deletePost, toggleReaction, refetch: fetchFeed }
}
