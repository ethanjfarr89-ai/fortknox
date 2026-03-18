import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { UserProfile, CropArea, CardDisplayPrefs } from '../types'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setProfile(data as UserProfile)
    } else if (error?.code === 'PGRST116') {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ id: userId, display_name: null, avatar_url: null })
        .select()
        .single()
      if (newProfile) setProfile(newProfile as UserProfile)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const updateProfile = async (updates: { display_name?: string | null; avatar_url?: string | null; avatar_crop?: CropArea | null; card_display_prefs?: CardDisplayPrefs | null; instagram_handle?: string | null }) => {
    if (!userId) return { error: null }

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()

    if (!error && data) {
      setProfile(data as UserProfile)
      return { error: null }
    }

    if (error) {
      // Fallback: upsert if profile row doesn't exist
      const { data: data2, error: error2 } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
        .select()
        .single()

      if (!error2 && data2) {
        setProfile(data2 as UserProfile)
        return { error: null }
      }

      return { error: error2 }
    }

    return { error }
  }

  return { profile, loading, updateProfile, refetch: fetchProfile }
}
