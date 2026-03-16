import { X, UserPlus, FolderOpen, TrendingUp, TrendingDown } from 'lucide-react'
import type { AppNotification } from '../lib/useNotifications'
import CroppedImage from './CroppedImage'

interface Props {
  notifications: AppNotification[]
  onDismiss: (id: string) => void
  onDismissAll: () => void
  onOpenFriends: () => void
  onViewFriend: (notification: AppNotification) => void
}

export default function NotificationBanner({ notifications, onDismiss, onDismissAll, onOpenFriends, onViewFriend }: Props) {
  if (notifications.length === 0) return null

  return (
    <div className="bg-neutral-900/95 border-b border-neutral-800">
      <div className="max-w-6xl mx-auto px-4 py-2 space-y-1.5">
        {notifications.map(n => (
          <div key={n.id} className="flex items-center gap-3 py-1.5">
            {/* Icon */}
            {n.type === 'price_alert' ? (
              <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                {n.sentiment === 'negative'
                  ? <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                  : <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                }
              </div>
            ) : n.senderAvatarUrl ? (
              <CroppedImage
                src={n.senderAvatarUrl}
                alt=""
                crop={n.senderAvatarCrop}
                className="w-7 h-7 rounded-full object-cover border border-neutral-700 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                {n.type === 'friend_request'
                  ? <UserPlus className="w-3.5 h-3.5 text-gold-400" />
                  : <FolderOpen className="w-3.5 h-3.5 text-gold-400" />
                }
              </div>
            )}

            {/* Message */}
            <span className="text-sm text-neutral-300 flex-1 min-w-0 truncate">{n.message}</span>

            {/* Action — price alerts only get dismiss, no "View" */}
            {n.type !== 'price_alert' && (
              <button
                onClick={() => {
                  if (n.type === 'friend_request') {
                    onOpenFriends()
                  } else {
                    onViewFriend(n)
                  }
                  onDismiss(n.id)
                }}
                className="text-xs font-medium text-gold-400 hover:text-gold-300 transition shrink-0"
              >
                View
              </button>
            )}

            {/* Dismiss */}
            <button
              onClick={() => onDismiss(n.id)}
              className="p-0.5 text-neutral-600 hover:text-neutral-300 transition shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {notifications.length > 1 && (
          <div className="flex justify-end pb-0.5">
            <button
              onClick={onDismissAll}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition"
            >
              Dismiss all
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
