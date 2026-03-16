import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Friendship, UserProfile, CropArea } from '../types'

export interface AppNotification {
  id: string
  type: 'friend_request' | 'collection_shared'
  message: string
  senderUserId: string | null
  senderName: string | null
  senderAvatarUrl: string | null
  senderAvatarCrop: CropArea | null
  friendship?: Friendship
}

const STORAGE_KEY = 'trove_dismissed_notifs'

function getDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

export function useNotifications(userId: string | undefined, pending: Friendship[]) {
  const [shareNotifs, setShareNotifs] = useState<AppNotification[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed)

  // Fetch incoming collection shares
  const fetchIncomingShares = useCallback(async () => {
    if (!userId) return

    const { data: sharesData } = await supabase
      .from('collection_shares')
      .select('collection_id')
      .eq('friend_id', userId)

    if (!sharesData || sharesData.length === 0) { setShareNotifs([]); return }

    const collectionIds = sharesData.map(s => (s as { collection_id: string }).collection_id)

    const { data: collectionsData } = await supabase
      .from('collections')
      .select('id, name, user_id')
      .in('id', collectionIds)

    if (!collectionsData || collectionsData.length === 0) { setShareNotifs([]); return }

    const ownerIds = [...new Set((collectionsData as { id: string; name: string; user_id: string }[]).map(c => c.user_id))]

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, avatar_crop')
      .in('id', ownerIds)

    const profileMap: Record<string, UserProfile> = {}
    if (profilesData) {
      for (const p of profilesData) {
        const profile = p as UserProfile
        profileMap[profile.id] = profile
      }
    }

    const notifs: AppNotification[] = (collectionsData as { id: string; name: string; user_id: string }[]).map(c => {
      const owner = profileMap[c.user_id]
      return {
        id: `share:${c.id}`,
        type: 'collection_shared' as const,
        message: `${owner?.display_name ?? 'Someone'} shared "${c.name}" with you`,
        senderUserId: c.user_id,
        senderName: owner?.display_name ?? null,
        senderAvatarUrl: owner?.avatar_url ?? null,
        senderAvatarCrop: owner?.avatar_crop ?? null,
      }
    })

    setShareNotifs(notifs)
  }, [userId])

  useEffect(() => { fetchIncomingShares() }, [fetchIncomingShares])

  // Build friend request notifications from pending
  const incomingRequests = pending.filter(f => f.addressee_id === userId)
  const friendNotifs: AppNotification[] = incomingRequests.map(f => ({
    id: f.id,
    type: 'friend_request' as const,
    message: `${f.friend_profile?.display_name ?? 'Someone'} sent you a friend request`,
    senderUserId: f.requester_id,
    senderName: f.friend_profile?.display_name ?? null,
    senderAvatarUrl: f.friend_profile?.avatar_url ?? null,
    senderAvatarCrop: f.friend_profile?.avatar_crop ?? null,
    friendship: f,
  }))

  // Combine and filter dismissed
  const all = [...friendNotifs, ...shareNotifs].filter(n => !dismissed.has(n.id))

  const dismiss = (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(id)
      saveDismissed(next)
      return next
    })
  }

  const dismissAll = () => {
    setDismissed(prev => {
      const next = new Set(prev)
      all.forEach(n => next.add(n.id))
      saveDismissed(next)
      return next
    })
  }

  return { notifications: all, dismiss, dismissAll }
}
