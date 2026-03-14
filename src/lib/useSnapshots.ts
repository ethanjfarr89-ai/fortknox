import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { PortfolioSnapshot } from '../types'

export function useSnapshots(userId: string | undefined) {
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([])

  const fetchSnapshots = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: true })

    if (data) setSnapshots(data as PortfolioSnapshot[])
  }, [userId])

  useEffect(() => {
    fetchSnapshots()
  }, [fetchSnapshots])

  const saveSnapshot = useCallback(async (totalMelt: number, totalAppraised: number) => {
    if (!userId) return

    // Only save one snapshot per day
    const today = new Date().toISOString().split('T')[0]
    const lastSnapshot = snapshots[snapshots.length - 1]
    if (lastSnapshot) {
      const lastDate = new Date(lastSnapshot.recorded_at).toISOString().split('T')[0]
      if (lastDate === today) return // already recorded today
    }

    const { data } = await supabase
      .from('portfolio_snapshots')
      .insert({
        user_id: userId,
        total_melt_value: totalMelt,
        total_appraised_value: totalAppraised,
      })
      .select()
      .single()

    if (data) {
      setSnapshots(prev => [...prev, data as PortfolioSnapshot])
    }
  }, [userId, snapshots])

  return { snapshots, saveSnapshot, refetch: fetchSnapshots }
}
