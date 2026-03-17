import { useState, useRef, useEffect, useCallback } from 'react'
import { LogOut, User, Users, Settings, Bell, X, UserPlus, FolderOpen, TrendingUp, TrendingDown, Check, ChevronRight, MessageSquareWarning } from 'lucide-react'
import type { UserProfile, Friendship } from '../types'
import type { AppNotification } from '../lib/useNotifications'
import CroppedImage from './CroppedImage'

interface HistoryEntry {
  id: string
  message: string
  type: AppNotification['type']
  sentiment?: 'positive' | 'negative'
  timestamp: number
}

interface Props {
  profile: UserProfile | null
  userId: string
  friends: Friendship[]
  pending: Friendship[]
  notifications: AppNotification[]
  unreadCount: number
  history: HistoryEntry[]
  onDismissNotif: (id: string) => void
  onDismissAllNotifs: () => void
  onMarkAllRead: () => void
  onSendRequest: (targetUserId: string) => Promise<{ error: unknown }>
  onSearchProfiles: (query: string) => Promise<UserProfile[]>
  onRespond: (friendshipId: string, accept: boolean) => Promise<void>
  onViewFriend: (friendship: Friendship) => void
  onViewFriendFromNotif: (notification: AppNotification) => void
  onSignOut: () => void
  onOpenProfile: () => void
  onReportIssue: () => void
}

function NotifIcon({ type, sentiment }: { type: AppNotification['type']; sentiment?: 'positive' | 'negative' }) {
  if (type === 'price_alert') {
    return sentiment === 'negative'
      ? <TrendingDown className="w-3.5 h-3.5 text-red-400" />
      : <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
  }
  if (type === 'friend_request') return <UserPlus className="w-3.5 h-3.5 text-gold-400" />
  return <FolderOpen className="w-3.5 h-3.5 text-gold-400" />
}

export default function Header({ profile, userId, friends, pending, notifications, unreadCount, history, onDismissNotif, onDismissAllNotifs, onMarkAllRead, onSendRequest, onSearchProfiles, onRespond, onViewFriend, onViewFriendFromNotif, onSignOut, onOpenProfile, onReportIssue }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [friendsOpen, setFriendsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const friendsRef = useRef<HTMLDivElement>(null)

  // Friends search state
  const [friendQuery, setFriendQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)
  const [sending, setSending] = useState(false)

  const incomingRequests = pending.filter(f => f.addressee_id === userId)
  const pendingFriendCount = incomingRequests.length

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (friendsRef.current && !friendsRef.current.contains(e.target as Node)) {
        setFriendsOpen(false)
        setFriendQuery('')
        setSearchResults([])
      }
    }
    if (menuOpen || notifOpen || friendsOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen, notifOpen, friendsOpen])

  const handleOpenNotifs = () => {
    setNotifOpen(!notifOpen)
    setFriendsOpen(false)
    setMenuOpen(false)
    if (!notifOpen) onMarkAllRead()
  }

  const handleOpenFriends = () => {
    setFriendsOpen(!friendsOpen)
    setNotifOpen(false)
    setMenuOpen(false)
  }

  // Debounced friend search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    const results = await onSearchProfiles(q)
    const existingIds = new Set([
      ...friends.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id),
      ...pending.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id),
    ])
    setSearchResults(results.filter(r => !existingIds.has(r.id)))
    setSearching(false)
  }, [onSearchProfiles, friends, pending, userId])

  useEffect(() => {
    const timer = setTimeout(() => doSearch(friendQuery), 300)
    return () => clearTimeout(timer)
  }, [friendQuery, doSearch])

  const handleSendRequest = async (targetUserId: string) => {
    setSending(true)
    await onSendRequest(targetUserId)
    setFriendQuery('')
    setSearchResults([])
    setSending(false)
  }

  return (
    <header className="bg-black border-b border-neutral-800 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
        <a href="/" className="shrink-0"><img src="/logo.jpg" alt="Trove" className="h-18 rounded" /></a>
        <div className="flex items-center gap-2">
          {/* Friends dropdown */}
          <div className="relative" ref={friendsRef}>
            <button
              onClick={handleOpenFriends}
              className="relative p-2 text-neutral-400 hover:text-gold-400 transition"
              title="Friends"
            >
              <Users className="w-4 h-4" />
              {pendingFriendCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gold-400 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingFriendCount}
                </span>
              )}
            </button>

            {friendsOpen && (
              <div className="absolute right-0 mt-1 w-80 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-800">
                  <h3 className="text-sm font-semibold text-white">Friends</h3>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {/* Search */}
                  <div className="px-4 py-3 border-b border-neutral-800/50">
                    <div className="relative">
                      <input
                        value={friendQuery}
                        onChange={e => setFriendQuery(e.target.value)}
                        autoComplete="off"
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 outline-none focus:ring-1 focus:ring-gold-400"
                        placeholder="Search to add friend..."
                      />
                      {friendQuery.trim().length >= 2 && (searchResults.length > 0 || searching) && (
                        <div className="absolute z-10 left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden">
                          {searching ? (
                            <div className="px-3 py-2.5 text-xs text-neutral-500">Searching...</div>
                          ) : (
                            searchResults.map(p => (
                              <button
                                key={p.id}
                                onClick={() => handleSendRequest(p.id)}
                                disabled={sending}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-700 transition text-left"
                              >
                                {p.avatar_url ? (
                                  <CroppedImage src={p.avatar_url} alt="" crop={p.avatar_crop} className="w-7 h-7 rounded-full object-cover shrink-0 border border-neutral-600" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center shrink-0">
                                    <User className="w-3 h-3 text-neutral-400" />
                                  </div>
                                )}
                                <span className="text-sm text-white truncate">{p.display_name}</span>
                                <UserPlus className="w-3.5 h-3.5 text-gold-400 ml-auto shrink-0" />
                              </button>
                            ))
                          )}
                          {!searching && searchResults.length === 0 && (
                            <div className="px-3 py-2.5 text-xs text-neutral-500">No users found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Incoming requests */}
                  {incomingRequests.length > 0 && (
                    <div className="border-b border-neutral-800/50">
                      <div className="px-4 py-2">
                        <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Requests</p>
                      </div>
                      {incomingRequests.map(f => (
                        <div key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                          {f.friend_profile?.avatar_url ? (
                            <CroppedImage src={f.friend_profile.avatar_url} alt="" crop={f.friend_profile.avatar_crop} className="w-7 h-7 rounded-full object-cover border border-neutral-600 shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                              <User className="w-3 h-3 text-neutral-400" />
                            </div>
                          )}
                          <span className="text-sm text-white flex-1 min-w-0 truncate">{f.friend_profile?.display_name ?? 'Unknown'}</span>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => onRespond(f.id, true)} className="p-1.5 bg-emerald-900/30 hover:bg-emerald-900/50 rounded-lg transition">
                              <Check className="w-3 h-3 text-emerald-400" />
                            </button>
                            <button onClick={() => onRespond(f.id, false)} className="p-1.5 bg-red-900/30 hover:bg-red-900/50 rounded-lg transition">
                              <X className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Friends list */}
                  {friends.length > 0 ? (
                    <div>
                      {(incomingRequests.length > 0) && (
                        <div className="px-4 py-2">
                          <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Friends</p>
                        </div>
                      )}
                      {friends.map(f => (
                        <button
                          key={f.id}
                          onClick={() => { onViewFriend(f); setFriendsOpen(false) }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-800/50 transition"
                        >
                          {f.friend_profile?.avatar_url ? (
                            <CroppedImage src={f.friend_profile.avatar_url} alt="" crop={f.friend_profile.avatar_crop} className="w-7 h-7 rounded-full object-cover border border-neutral-600 shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0 text-xs font-medium text-gold-400">
                              {(f.friend_profile?.display_name ?? '?')[0]?.toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm text-white flex-1 min-w-0 truncate text-left">{f.friend_profile?.display_name ?? 'Unknown'}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : incomingRequests.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <Users className="w-6 h-6 text-neutral-700 mx-auto mb-2" />
                      <p className="text-sm text-neutral-500">No friends yet</p>
                      <p className="text-xs text-neutral-600 mt-0.5">Search above to connect</p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleOpenNotifs}
              className="relative p-2 text-neutral-400 hover:text-gold-400 transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-1 w-80 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                  <h3 className="text-sm font-semibold text-white">Notifications</h3>
                  {notifications.length > 1 && (
                    <button
                      onClick={() => { onDismissAllNotifs(); }}
                      className="text-xs text-neutral-500 hover:text-neutral-300 transition"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div>
                      {notifications.map(n => (
                        <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-neutral-800/50 transition border-b border-neutral-800/50 last:border-0">
                          <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                            {n.senderAvatarUrl ? (
                              <CroppedImage src={n.senderAvatarUrl} alt="" crop={n.senderAvatarCrop} className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <NotifIcon type={n.type} sentiment={n.sentiment} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-neutral-300 leading-snug">{n.message}</p>
                            {n.type !== 'price_alert' && (
                              <button
                                onClick={() => {
                                  if (n.type === 'friend_request') handleOpenFriends()
                                  else { onViewFriendFromNotif(n); setNotifOpen(false) }
                                  onDismissNotif(n.id)
                                }}
                                className="text-xs font-medium text-gold-400 hover:text-gold-300 transition mt-1"
                              >
                                View
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => onDismissNotif(n.id)}
                            className="p-0.5 text-neutral-600 hover:text-neutral-300 transition shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : history.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-6 h-6 text-neutral-700 mx-auto mb-2" />
                      <p className="text-sm text-neutral-500">No notifications</p>
                    </div>
                  ) : null}

                  {history.length > 0 && (
                    <div>
                      {notifications.length > 0 && (
                        <div className="px-4 py-2 border-t border-neutral-800">
                          <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Recent</p>
                        </div>
                      )}
                      {history.map(h => (
                        <div key={h.id} className="flex items-center gap-3 px-4 py-2.5 opacity-50">
                          <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                            <NotifIcon type={h.type} sentiment={h.sentiment} />
                          </div>
                          <p className="text-xs text-neutral-500 flex-1 min-w-0 truncate">{h.message}</p>
                          <span className="text-[10px] text-neutral-600 shrink-0">{formatTimeAgo(h.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); setFriendsOpen(false) }}
              className="flex items-center gap-2 p-1 hover:bg-neutral-800 rounded-lg transition"
              title="Profile"
            >
              {profile?.avatar_url ? (
                <CroppedImage src={profile.avatar_url} alt="" crop={profile.avatar_crop} className="w-7 h-7 rounded-full object-cover border border-neutral-700" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-neutral-400" />
                </div>
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden z-50">
                {profile?.display_name && (
                  <div className="px-4 py-2.5 border-b border-neutral-800">
                    <p className="text-sm font-medium text-white truncate">{profile.display_name}</p>
                  </div>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onOpenProfile() }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-300 hover:bg-neutral-800 transition"
                >
                  <Settings className="w-4 h-4 text-neutral-500" />
                  My Account
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onReportIssue() }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-300 hover:bg-neutral-800 transition"
                >
                  <MessageSquareWarning className="w-4 h-4 text-neutral-500" />
                  Report an Issue
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onSignOut() }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-neutral-800 transition border-t border-neutral-800"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return `${Math.floor(days / 7)}w`
}
