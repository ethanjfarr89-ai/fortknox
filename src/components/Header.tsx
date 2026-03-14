import { LogOut, User, Users } from 'lucide-react'
import type { UserProfile } from '../types'

interface Props {
  profile: UserProfile | null
  pendingFriendCount: number
  onSignOut: () => void
  onOpenProfile: () => void
  onOpenFriends: () => void
}

export default function Header({ profile, pendingFriendCount, onSignOut, onOpenProfile, onOpenFriends }: Props) {
  return (
    <header className="bg-black border-b border-neutral-800 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="FortKnox" className="h-8 w-8 rounded" />
          <span className="text-lg font-bold text-gold-400 tracking-wide">FORTKNOX</span>
        </div>
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

          {/* Profile */}
          <button
            onClick={onOpenProfile}
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

          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300 transition ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
