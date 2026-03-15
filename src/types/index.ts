export const CATEGORIES = [
  { value: 'ring', label: 'Ring' },
  { value: 'chain', label: 'Chain' },
  { value: 'necklace', label: 'Necklace' },
  { value: 'bracelet', label: 'Bracelet' },
  { value: 'anklet', label: 'Anklet' },
  { value: 'pendant', label: 'Pendant / Charm' },
  { value: 'earring', label: 'Earrings' },
  { value: 'watch', label: 'Watch' },
  { value: 'brooch', label: 'Brooch' },
  { value: 'bullion', label: 'Bullion / Nuggets' },
  { value: 'bits', label: 'Bits & Bobs' },
] as const

export type Category = (typeof CATEGORIES)[number]['value']

export type AcquisitionType = 'purchased' | 'gift' | 'inheritance'

export interface Gemstone {
  stone_type: string
  cut: string
  carat_weight: number | null
  color: string
  clarity: string
  gia_number: string
  value: number | null
  origin: 'natural' | 'lab' | ''
  is_pave: boolean
  quantity: number | null
}

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export interface JewelryPiece {
  id: string
  user_id: string
  name: string
  description: string | null
  category: Category
  metal_type: 'gold' | 'yellow_gold' | 'white_gold' | 'rose_gold' | 'silver' | 'platinum' | 'palladium' | 'other'
  metal_weight_grams: number | null
  metal_karat: number | null
  gemstones: Gemstone[]
  history: string | null
  significance: string | null
  appraised_value: number | null
  acquisition_type: AcquisitionType
  price_paid: number | null
  date_purchased: string | null
  gifted_by: string | null
  inherited_from: string | null
  date_received: string | null
  is_wishlist: boolean
  photo_urls: string[]
  styling_photo_urls: string[]
  hallmark_photo_urls: string[]
  profile_photo_index: number
  profile_photo_crop: CropArea | null
  // Category-specific fields
  ring_size: string | null
  chain_length: number | null
  chain_width: number | null
  bracelet_length: number | null
  bracelet_width: number | null
  bracelet_type: 'bracelet' | 'bangle' | null
  bangle_size: number | null
  anklet_length: number | null
  anklet_width: number | null
  pendant_length: number | null
  pendant_width: number | null
  earring_length: number | null
  earring_width: number | null
  watch_maker: string | null
  watch_movement: string | null
  watch_dial_size: number | null
  created_at: string
  updated_at: string
}

export type JewelryPieceInsert = Omit<JewelryPiece, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export interface SpotPrices {
  gold: number | null
  silver: number | null
  platinum: number | null
  palladium: number | null
  updated_at: Date | null
}

export interface PortfolioSnapshot {
  id: string
  user_id: string
  total_melt_value: number
  total_appraised_value: number
  recorded_at: string
}

export type PrivacyLevel = 'private' | 'friends' | 'public'

export interface PrivacySettings {
  show_values: PrivacyLevel
  show_pieces: PrivacyLevel
  show_photos: PrivacyLevel
}

export interface UserProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  avatar_crop: CropArea | null
  privacy_settings: PrivacySettings | null
}

export interface Collection {
  id: string
  user_id: string
  name: string
  description: string | null
  visibility: 'private' | 'friends' | 'specific'
  created_at: string
}

export interface StylingBoard {
  id: string
  user_id: string
  name: string
  description: string | null
  photo_urls: string[]
  created_at: string
  piece_ids?: string[]
}

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  // Joined profile data
  friend_profile?: UserProfile
}

export type ValuationMode = 'melt' | 'appraised'
