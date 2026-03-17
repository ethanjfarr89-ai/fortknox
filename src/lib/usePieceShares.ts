import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

export interface PieceShare {
  id: string
  piece_id: string
  user_id: string
  share_token: string
  show_value: boolean
  created_at: string
}

export function usePieceShares(userId: string) {
  const [shares, setShares] = useState<PieceShare[]>([])

  useEffect(() => {
    supabase
      .from('piece_shares')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) setShares(data)
      })
  }, [userId])

  const createShare = useCallback(async (pieceId: string, showValue = false) => {
    // Check if share already exists for this piece
    const existing = shares.find(s => s.piece_id === pieceId)
    if (existing) return existing

    const { data, error } = await supabase
      .from('piece_shares')
      .insert({ piece_id: pieceId, user_id: userId, show_value: showValue })
      .select()
      .single()

    if (error) {
      console.error('Failed to create share:', error)
      return null
    }

    setShares(prev => [...prev, data])
    return data as PieceShare
  }, [userId, shares])

  const deleteShare = useCallback(async (pieceId: string) => {
    const share = shares.find(s => s.piece_id === pieceId)
    if (!share) return

    await supabase.from('piece_shares').delete().eq('id', share.id)
    setShares(prev => prev.filter(s => s.id !== share.id))
  }, [shares])

  const updateShowValue = useCallback(async (pieceId: string, showValue: boolean) => {
    const share = shares.find(s => s.piece_id === pieceId)
    if (!share) return

    await supabase.from('piece_shares').update({ show_value: showValue }).eq('id', share.id)
    setShares(prev => prev.map(s => s.id === share.id ? { ...s, show_value: showValue } : s))
  }, [shares])

  const getShareForPiece = useCallback((pieceId: string) => {
    return shares.find(s => s.piece_id === pieceId) ?? null
  }, [shares])

  return { shares, createShare, deleteShare, updateShowValue, getShareForPiece }
}
