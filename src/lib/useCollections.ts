import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Collection } from '../types'

export function useCollections(userId: string | undefined) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [pieceCollectionMap, setPieceCollectionMap] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)

  const fetchCollections = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (data) setCollections(data as Collection[])
    setLoading(false)
  }, [userId])

  const fetchPieceCollections = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('piece_collections')
      .select('piece_id, collection_id')

    if (data) {
      const map: Record<string, string[]> = {}
      for (const row of data) {
        const r = row as { piece_id: string; collection_id: string }
        if (!map[r.piece_id]) map[r.piece_id] = []
        map[r.piece_id].push(r.collection_id)
      }
      setPieceCollectionMap(map)
    }
  }, [userId])

  useEffect(() => {
    fetchCollections()
    fetchPieceCollections()
  }, [fetchCollections, fetchPieceCollections])

  const addCollection = async (name: string, description?: string) => {
    const { data, error } = await supabase
      .from('collections')
      .insert({ user_id: userId, name, description: description || null })
      .select()
      .single()

    if (!error && data) setCollections(prev => [...prev, data as Collection].sort((a, b) => a.name.localeCompare(b.name)))
    return { data, error }
  }

  const deleteCollection = async (id: string) => {
    const { error } = await supabase.from('collections').delete().eq('id', id)
    if (!error) setCollections(prev => prev.filter(c => c.id !== id))
    return { error }
  }

  const assignPiece = async (pieceId: string, collectionId: string) => {
    const { error } = await supabase.from('piece_collections').insert({ piece_id: pieceId, collection_id: collectionId })
    if (!error) {
      setPieceCollectionMap(prev => ({
        ...prev,
        [pieceId]: [...(prev[pieceId] || []), collectionId],
      }))
    }
    return { error }
  }

  const unassignPiece = async (pieceId: string, collectionId: string) => {
    const { error } = await supabase
      .from('piece_collections')
      .delete()
      .eq('piece_id', pieceId)
      .eq('collection_id', collectionId)

    if (!error) {
      setPieceCollectionMap(prev => ({
        ...prev,
        [pieceId]: (prev[pieceId] || []).filter(id => id !== collectionId),
      }))
    }
    return { error }
  }

  return { collections, pieceCollectionMap, loading, addCollection, deleteCollection, assignPiece, unassignPiece, refetch: fetchCollections }
}
