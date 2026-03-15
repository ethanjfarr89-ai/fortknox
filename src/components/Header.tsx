import { useState, useRef, useEffect } from 'react'
import { LogOut, User, Users, Settings } from 'lucide-react'
import type { UserProfile } from '../types'

interface Props {
  profile: UserProfile | null
  pendingFriendCount: number
  onSignOut: () => void
  onOpenProfile: () => void
  onOpenFriends: () => void
}

export default function Header({ profile, pendingFriendCount, onSignOut, onOpenProfile, onOpenFriends }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <header className="bg-black border-b border-neutral-800 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
        <img src="/logo.jpg" alt="Trove" className="h-18 rounded" />
        <div className="flex items-center gap-2">
          {/* Friends */}
          <button
            onClick={onOpenFriends}
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

          {/* Profile dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 p-1 hover:bg-neutral-800 rounded-lg transition"
              title="Profile"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-neutral-700" />
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
                  My Profile
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
