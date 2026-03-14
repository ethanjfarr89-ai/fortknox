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

    // Fetch profiles for all friend user IDs
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

  const sendRequest = async (email: string) => {
    // Look up by display_name
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .ilike('display_name', email)
      .limit(1)

    if (!profiles || profiles.length === 0) {
      return { error: { message: 'User not found. Ask them to set their display name in their profile.' } }
    }

    const friendId = (profiles[0] as { id: string }).id
    if (friendId === userId) {
      return { error: { message: "You can't add yourself as a friend." } }
    }

    const { error } = await supabase.from('friendships').insert({
      requester_id: userId,
      addressee_id: friendId,
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

  return { friends, pending, loading, sendRequest, respondToRequest, removeFriend, refetch: fetchFriends }
}
