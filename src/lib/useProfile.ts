import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { UserProfile, CropArea, PrivacySettings } from '../types'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setProfile(data as UserProfile)
    } else {
      // Profile doesn't exist yet — create it
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ id: userId, display_name: null, avatar_url: null, avatar_crop: null, privacy_settings: null })
        .select()
        .single()
      if (newProfile) setProfile(newProfile as UserProfile)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const updateProfile = async (updates: { display_name?: string | null; avatar_url?: string | null; avatar_crop?: CropArea | null; privacy_settings?: PrivacySettings | null }) => {
    if (!userId) return { error: null }
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()

    if (!error && data) setProfile(data as UserProfile)
    return { error }
  }

  return { profile, loading, updateProfile, refetch: fetchProfile }
}
