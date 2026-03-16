import { useMemo } from 'react'
import type { PortfolioSnapshot, SpotPrices } from '../types'
import type { AppNotification } from './useNotifications'

const MILESTONE_KEY = 'trove_last_milestone'
const MONTHLY_ALERT_KEY = 'trove_last_monthly_alert'

function getLastMilestone(): number {
  try {
    return Number(localStorage.getItem(MILESTONE_KEY)) || 0
  } catch {
    return 0
  }
}

function setLastMilestone(value: number) {
  localStorage.setItem(MILESTONE_KEY, String(value))
}

function getLastMonthlyAlertDate(): string | null {
  try {
    return localStorage.getItem(MONTHLY_ALERT_KEY)
  } catch {
    return null
  }
}

function setLastMonthlyAlertDate(date: string) {
  localStorage.setItem(MONTHLY_ALERT_KEY, date)
}

export function usePriceAlerts(
  snapshots: PortfolioSnapshot[],
  currentTotalValue: number,
  _prices: SpotPrices,
): AppNotification[] {
  return useMemo(() => {
    const alerts: AppNotification[] = []

    if (!currentTotalValue || currentTotalValue <= 0 || snapshots.length === 0) {
      return alerts
    }

    // --- Value milestone: crossed a $1,000 boundary ---
    const currentThousand = Math.floor(currentTotalValue / 1000)
    const earliest = snapshots[0]
    const earliestThousand = Math.floor(earliest.total_melt_value / 1000)
    const lastMilestone = getLastMilestone()

    if (currentThousand > earliestThousand && currentThousand > 0) {
      const milestoneValue = currentThousand * 1000
      if (milestoneValue > lastMilestone) {
        setLastMilestone(milestoneValue)
        const formatted = milestoneValue.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
        alerts.push({
          id: `price_alert:milestone:${milestoneValue}`,
          type: 'price_alert',
          sentiment: 'positive',
          message: `Your collection passed ${formatted}!`,
          senderUserId: null,
          senderName: null,
          senderAvatarUrl: null,
          senderAvatarCrop: null,
        })
      }
    }

    // --- Monthly change: compare to ~30-day-old snapshot ---
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const lastMonthlyDate = getLastMonthlyAlertDate()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Only show monthly alert once per day
    if (lastMonthlyDate !== today) {
      // Find the snapshot closest to 30 days ago
      let closestSnapshot: PortfolioSnapshot | null = null
      let closestDiff = Infinity

      for (const snap of snapshots) {
        const snapDate = new Date(snap.recorded_at)
        const diff = Math.abs(snapDate.getTime() - thirtyDaysAgo.getTime())
        // Only consider snapshots that are at least 20 days old (avoid too-recent ones)
        const ageInDays = (now.getTime() - snapDate.getTime()) / (1000 * 60 * 60 * 24)
        if (ageInDays >= 20 && diff < closestDiff) {
          closestDiff = diff
          closestSnapshot = snap
        }
      }

      if (closestSnapshot) {
        const oldValue = closestSnapshot.total_melt_value
        if (oldValue > 0) {
          const pctChange = ((currentTotalValue - oldValue) / oldValue) * 100

          if (Math.abs(pctChange) >= 5) {
            setLastMonthlyAlertDate(today)
            const direction = pctChange > 0 ? 'up' : 'down'
            const sentiment = pctChange > 0 ? 'positive' : 'negative'
            alerts.push({
              id: `price_alert:monthly:${today}`,
              type: 'price_alert',
              sentiment,
              message: `Your collection is ${direction} ${Math.abs(pctChange).toFixed(1)}% this month`,
              senderUserId: null,
              senderName: null,
              senderAvatarUrl: null,
              senderAvatarCrop: null,
            })
          }
        }
      }
    }

    return alerts
  }, [snapshots, currentTotalValue, _prices])
}
