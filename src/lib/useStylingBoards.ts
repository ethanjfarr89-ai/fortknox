import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { StylingBoard } from '../types'

export function useStylingBoards(userId: string | undefined) {
  const [boards, setBoards] = useState<StylingBoard[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBoards = useCallback(async () => {
    if (!userId) return
    const { data: boardsData } = await supabase
      .from('styling_boards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!boardsData) { setLoading(false); return }

    // Fetch piece associations
    const boardIds = boardsData.map((b: Record<string, unknown>) => b.id as string)
    const { data: piecesData } = await supabase
      .from('styling_board_pieces')
      .select('board_id, piece_id')
      .in('board_id', boardIds)

    const pieceMap: Record<string, string[]> = {}
    if (piecesData) {
      for (const row of piecesData) {
        const r = row as { board_id: string; piece_id: string }
        if (!pieceMap[r.board_id]) pieceMap[r.board_id] = []
        pieceMap[r.board_id].push(r.piece_id)
      }
    }

    setBoards(boardsData.map((b: Record<string, unknown>) => ({
      ...b,
      piece_ids: pieceMap[b.id as string] || [],
    })) as StylingBoard[])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchBoards() }, [fetchBoards])

  const addBoard = async (name: string, pieceIds: string[], photoUrls: string[], description?: string) => {
    const { data, error } = await supabase
      .from('styling_boards')
      .insert({ user_id: userId, name, description: description || null, photo_urls: photoUrls })
      .select()
      .single()

    if (error || !data) return { error }

    const boardId = (data as { id: string }).id
    if (pieceIds.length > 0) {
      await supabase.from('styling_board_pieces').insert(
        pieceIds.map(pid => ({ board_id: boardId, piece_id: pid }))
      )
    }

    await fetchBoards()
    return { data, error: null }
  }

  const updateBoard = async (id: string, updates: { photo_urls?: string[]; name?: string; description?: string }) => {
    const { error } = await supabase.from('styling_boards').update(updates).eq('id', id)
    if (!error) await fetchBoards()
    return { error }
  }

  const deleteBoard = async (id: string) => {
    const { error } = await supabase.from('styling_boards').delete().eq('id', id)
    if (!error) setBoards(prev => prev.filter(b => b.id !== id))
    return { error }
  }

  return { boards, loading, addBoard, updateBoard, deleteBoard, refetch: fetchBoards }
}
