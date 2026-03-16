import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Friendship, UserProfile, JewelryPiece, Collection, CardDisplayPrefs } from '../types'

export interface SharedCollection extends Collection {
  display_prefs: CardDisplayPrefs
}

export function useFriends(userId: string | undefined) {
  const [friends, setFriends] = useState<Friendship[]>([])
  const [pending, setPending] = useState<Friendship[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFriends = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

    if (!data) { setLoading(false); return }

    const friendIds = new Set<string>()
    for (const row of data) {
      const r = row as Friendship
      friendIds.add(r.requester_id === userId ? r.addressee_id : r.requester_id)
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', Array.from(friendIds))

    const profileMap: Record<string, UserProfile> = {}
    if (profiles) {
      for (const p of profiles) {
        const profile = p as UserProfile
        profileMap[profile.id] = profile
      }
    }

    const friendships = (data as Friendship[]).map(f => ({
      ...f,
      friend_profile: profileMap[f.requester_id === userId ? f.addressee_id : f.requester_id],
    }))

    setFriends(friendships.filter(f => f.status === 'accepted'))
    setPending(friendships.filter(f => f.status === 'pending'))
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchFriends() }, [fetchFriends])

  const searchProfiles = async (query: string): Promise<UserProfile[]> => {
    if (!query.trim() || query.trim().length < 2) return []
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, avatar_crop')
      .ilike('display_name', `%${query.trim()}%`)
      .neq('id', userId ?? '')
      .limit(5)
    return (data as UserProfile[]) ?? []
  }

  const sendRequest = async (targetUserId: string) => {
    if (targetUserId === userId) {
      return { error: { message: "You can't add yourself as a friend." } }
    }

    const { error } = await supabase.from('friendships').insert({
      requester_id: userId,
      addressee_id: targetUserId,
    })

    if (!error) await fetchFriends()
    return { error }
  }

  const respondToRequest = async (friendshipId: string, accept: boolean) => {
    if (accept) {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    } else {
      await supabase.from('friendships').delete().eq('id', friendshipId)
    }
    await fetchFriends()
  }

  const removeFriend = async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    await fetchFriends()
  }

  /** Fetch friend's pieces — RLS ensures only pieces in shared collections are returned */
  const fetchFriendPieces = async (friendUserId: string): Promise<JewelryPiece[]> => {
    const { data } = await supabase
      .from('pieces')
      .select('*')
      .eq('user_id', friendUserId)
      .eq('is_wishlist', false)
      .order('name')
    return (data as JewelryPiece[]) ?? []
  }

  /** Fetch collections a friend has shared with the current user, including display_prefs */
  const fetchSharedCollections = async (friendUserId: string): Promise<SharedCollection[]> => {
    // Get collection_shares where friend_id = current user, then join with collections
    const { data: sharesData } = await supabase
      .from('collection_shares')
      .select('collection_id, display_prefs')
      .eq('friend_id', userId ?? '')

    if (!sharesData || sharesData.length === 0) return []

    const shareMap: Record<string, CardDisplayPrefs> = {}
    for (const row of sharesData) {
      const r = row as { collection_id: string; display_prefs: CardDisplayPrefs }
      shareMap[r.collection_id] = r.display_prefs
    }

    const { data: collectionsData } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', friendUserId)
      .in('id', Object.keys(shareMap))
      .order('name')

    if (!collectionsData) return []

    return (collectionsData as Collection[]).map(c => ({
      ...c,
      display_prefs: shareMap[c.id] ?? { value: true, roi: true, weight: true, metal: true, category: true, gemstones: true },
    }))
  }

  /** Fetch piece→collection mappings for shared collections */
  const fetchSharedPieceCollections = async (): Promise<Record<string, string[]>> => {
    const { data } = await supabase
      .from('piece_collections')
      .select('piece_id, collection_id')
    const map: Record<string, string[]> = {}
    if (data) {
      for (const row of data) {
        const r = row as { piece_id: string; collection_id: string }
        if (!map[r.piece_id]) map[r.piece_id] = []
        map[r.piece_id].push(r.collection_id)
      }
    }
    return map
  }

  return { friends, pending, loading, sendRequest, searchProfiles, respondToRequest, removeFriend, fetchFriendPieces, fetchSharedCollections, fetchSharedPieceCollections, refetch: fetchFriends }
}
