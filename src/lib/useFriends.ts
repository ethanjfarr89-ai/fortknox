import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Friendship, UserProfile } from '../types'

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

  return { friends, pending, loading, sendRequest, searchProfiles, respondToRequest, removeFriend, refetch: fetchFriends }
}
