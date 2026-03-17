import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Friendship, UserProfile, CropArea } from '../types'

export interface AppNotification {
  id: string
  type: 'friend_request' | 'collection_shared' | 'price_alert'
  message: string
  sentiment?: 'positive' | 'negative'
  senderUserId: string | null
  senderName: string | null
  senderAvatarUrl: string | null
  senderAvatarCrop: CropArea | null
  friendship?: Friendship
}

const DISMISSED_KEY = 'trove_dismissed_notifs'
const READ_KEY = 'trove_read_notifs'
const HISTORY_KEY = 'trove_notif_history'
const MAX_HISTORY = 8

function loadSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? '[]'))
  } catch {
    return new Set()
  }
}

function saveSet(key: string, ids: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...ids]))
}

interface HistoryEntry {
  id: string
  message: string
  type: AppNotification['type']
  sentiment?: 'positive' | 'negative'
  timestamp: number
}

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)))
}

export function useNotifications(userId: string | undefined, pending: Friendship[], priceAlerts: AppNotification[] = []) {
  const [shareNotifs, setShareNotifs] = useState<AppNotification[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadSet(DISMISSED_KEY))
  const [read, setRead] = useState<Set<string>>(() => loadSet(READ_KEY))
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)

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

  // Active notifications (not dismissed)
  const active = [...friendNotifs, ...shareNotifs, ...priceAlerts].filter(n => !dismissed.has(n.id))
  const unreadCount = active.filter(n => !read.has(n.id)).length

  const markAllRead = () => {
    setRead(prev => {
      const next = new Set(prev)
      active.forEach(n => next.add(n.id))
      saveSet(READ_KEY, next)
      return next
    })
  }

  const dismiss = (id: string) => {
    // Save to history before dismissing
    const notif = active.find(n => n.id === id)
    if (notif) {
      setHistory(prev => {
        const entry: HistoryEntry = {
          id: notif.id,
          message: notif.message,
          type: notif.type,
          sentiment: notif.sentiment,
          timestamp: Date.now(),
        }
        const next = [entry, ...prev.filter(h => h.id !== id)].slice(0, MAX_HISTORY)
        saveHistory(next)
        return next
      })
    }

    setDismissed(prev => {
      const next = new Set(prev)
      next.add(id)
      saveSet(DISMISSED_KEY, next)
      return next
    })
  }

  const dismissAll = () => {
    // Save all to history
    setHistory(prev => {
      const entries: HistoryEntry[] = active.map(n => ({
        id: n.id,
        message: n.message,
        type: n.type,
        sentiment: n.sentiment,
        timestamp: Date.now(),
      }))
      const next = [...entries, ...prev.filter(h => !active.some(n => n.id === h.id))].slice(0, MAX_HISTORY)
      saveHistory(next)
      return next
    })

    setDismissed(prev => {
      const next = new Set(prev)
      active.forEach(n => next.add(n.id))
      saveSet(DISMISSED_KEY, next)
      return next
    })
  }

  return { notifications: active, unreadCount, history, dismiss, dismissAll, markAllRead }
}
