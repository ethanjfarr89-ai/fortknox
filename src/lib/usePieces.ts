import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { JewelryPiece, JewelryPieceInsert, PieceStatus } from '../types'

export function usePieces(userId: string | undefined) {
  const [pieces, setPieces] = useState<JewelryPiece[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPieces = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('pieces')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setPieces(data.map(normalizePiece))
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchPieces()
  }, [fetchPieces])

  const addPiece = async (piece: JewelryPieceInsert) => {
    const { data, error } = await supabase
      .from('pieces')
      .insert({ ...piece, user_id: userId })
      .select()
      .single()

    if (!error && data) {
      setPieces(prev => [normalizePiece(data), ...prev])
    }
    return { data, error }
  }

  const updatePiece = async (id: string, updates: Partial<JewelryPieceInsert>) => {
    const { data, error } = await supabase
      .from('pieces')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    const normalized = !error && data ? normalizePiece(data) : null
    if (normalized) {
      setPieces(prev => prev.map(p => (p.id === id ? normalized : p)))
    }
    return { data: normalized, error }
  }

  const deletePiece = async (id: string) => {
    const { error } = await supabase.from('pieces').delete().eq('id', id)
    if (!error) {
      setPieces(prev => prev.filter(p => p.id !== id))
    }
    return { error }
  }

  const toggleFavorite = async (id: string) => {
    const piece = pieces.find(p => p.id === id)
    if (!piece) return
    const next = !piece.is_favorite
    const { error } = await supabase.from('pieces').update({ is_favorite: next }).eq('id', id)
    if (!error) {
      setPieces(prev => prev.map(p => p.id === id ? { ...p, is_favorite: next } : p))
    }
  }

  const retirePiece = async (id: string, opts: { status: PieceStatus; date_departed: string; sale_price?: number | null; departed_to?: string | null }) => {
    const { data, error } = await supabase
      .from('pieces')
      .update({
        status: opts.status,
        date_departed: opts.date_departed,
        sale_price: opts.sale_price ?? null,
        departed_to: opts.departed_to ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      setPieces(prev => prev.map(p => (p.id === id ? normalizePiece(data) : p)))
    }
    return { data, error }
  }

  const reactivatePiece = async (id: string) => {
    const { data, error } = await supabase
      .from('pieces')
      .update({
        status: 'active',
        date_departed: null,
        sale_price: null,
        departed_to: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      setPieces(prev => prev.map(p => (p.id === id ? normalizePiece(data) : p)))
    }
    return { data, error }
  }

  return { pieces, loading, addPiece, updatePiece, deletePiece, retirePiece, reactivatePiece, toggleFavorite, refetch: fetchPieces }
}

// Normalize DB rows to ensure all new fields have defaults
function normalizePiece(row: Record<string, unknown>): JewelryPiece {
  return {
    ...row,
    category: row.category ?? 'bits',
    is_wishlist: row.is_wishlist ?? false,
    is_favorite: row.is_favorite ?? false,
    gemstones: row.gemstones ?? [],
    styling_photo_urls: row.styling_photo_urls ?? [],
    hallmark_photo_urls: row.hallmark_photo_urls ?? [],
    photo_urls: row.photo_urls ?? [],
    profile_photo_index: row.profile_photo_index ?? 0,
    profile_photo_crop: row.profile_photo_crop ?? null,
    acquisition_type: row.acquisition_type ?? 'purchased',
    price_paid: row.price_paid ?? null,
    date_purchased: row.date_purchased ?? null,
    gifted_by: row.gifted_by ?? null,
    inherited_from: row.inherited_from ?? null,
    date_received: row.date_received ?? null,
    status: row.status ?? 'active',
    date_departed: row.date_departed ?? null,
    sale_price: row.sale_price ?? null,
    departed_to: row.departed_to ?? null,
  } as JewelryPiece
}
