import { useState } from 'react'
import { X, Download, FileText } from 'lucide-react'
import type { JewelryPiece, SpotPrices, Collection } from '../types'
import { CATEGORIES } from '../types'
import { calculateMeltValue, calculateGemstoneValue, isGoldType } from '../lib/prices'
import { useScrollLock } from '../lib/useScrollLock'

interface Props {
  pieces: JewelryPiece[]
  prices: SpotPrices
  collections: Collection[]
  pieceCollectionMap: Record<string, string[]>
  ownerName: string | null
  onClose: () => void
}

const metalLabels: Record<string, string> = {
  gold: 'Yellow Gold', yellow_gold: 'Yellow Gold', white_gold: 'White Gold', rose_gold: 'Rose Gold',
  silver: 'Silver', platinum: 'Platinum', palladium: 'Palladium', other: 'Other',
}

function fmtCurrency(val: number | null) {
  if (val == null) return '—'
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

type ExportFormat = 'csv' | 'print'

export default function ExportReport({ pieces, prices, collections, pieceCollectionMap, ownerName, onClose }: Props) {
  useScrollLock()
  const [format, setFormat] = useState<ExportFormat>('print')
  const [includeValues, setIncludeValues] = useState(true)
  const [includePhotos, setIncludePhotos] = useState(true)

  const collectionPieces = pieces.filter(p => !p.is_wishlist)

  const exportCSV = () => {
    const headers = [
      'Name', 'Category', 'Metal', 'Karat', 'Weight (g)', 'Melt Value', 'Appraised Value',
      'Price Paid', 'Acquisition Type', 'Date Acquired', 'Description',
      'Gemstones', 'GIA Numbers', 'Collections',
    ]

    const rows = collectionPieces.map(p => {
      const melt = calculateMeltValue(p.metal_type, p.metal_weight_grams, p.metal_karat, prices)
      const gemVal = calculateGemstoneValue(p.gemstones)
      const totalMelt = melt != null ? melt + gemVal : gemVal > 0 ? gemVal : null
      const categoryLabel = CATEGORIES.find(c => c.value === p.category)?.label ?? p.category
      const date = p.acquisition_type === 'purchased' ? p.date_purchased : p.date_received
      const gemstones = (p.gemstones ?? []).map(g =>
        `${g.stone_type}${g.carat_weight ? ` ${g.carat_weight}ct` : ''}${g.origin ? ` (${g.origin})` : ''}`
      ).join('; ')
      const giaNumbers = (p.gemstones ?? []).filter(g => g.gia_number).map(g => g.gia_number).join('; ')
      const colIds = pieceCollectionMap[p.id] ?? []
      const colNames = collections.filter(c => colIds.includes(c.id)).map(c => c.name).join('; ')

      return [
        p.name,
        categoryLabel,
        metalLabels[p.metal_type] ?? p.metal_type,
        isGoldType(p.metal_type) && p.metal_karat ? `${p.metal_karat}K` : '',
        p.metal_weight_grams ?? '',
        includeValues ? (totalMelt ?? '') : '',
        includeValues ? (p.appraised_value ?? '') : '',
        includeValues ? (p.price_paid ?? '') : '',
        p.acquisition_type,
        date ?? '',
        p.description ?? '',
        gemstones,
        giaNumbers,
        colNames,
      ]
    })

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trove-inventory-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    const now = new Date()
    let totalMeltValue = 0
    let totalAppraisedValue = 0

    const pieceRows = collectionPieces.map(p => {
      const melt = calculateMeltValue(p.metal_type, p.metal_weight_grams, p.metal_karat, prices)
      const gemVal = calculateGemstoneValue(p.gemstones)
      const totalMelt = melt != null ? melt + gemVal : gemVal > 0 ? gemVal : null
      if (totalMelt) totalMeltValue += totalMelt
      if (p.appraised_value) totalAppraisedValue += p.appraised_value

      const categoryLabel = CATEGORIES.find(c => c.value === p.category)?.label ?? p.category
      const date = p.acquisition_type === 'purchased' ? p.date_purchased : p.date_received
      const photoUrl = includePhotos ? (p.photo_urls?.[p.profile_photo_index ?? 0] ?? p.photo_urls?.[0]) : null

      const gemstoneHtml = (p.gemstones ?? []).map(g => {
        const parts = [g.stone_type]
        if (g.carat_weight) parts.push(`${g.carat_weight}ct`)
        if (g.origin) parts.push(`(${g.origin})`)
        if (g.gia_number) parts.push(`GIA: ${g.gia_number}`)
        if (includeValues && g.value != null) parts.push(`Value: ${fmtCurrency(g.value)}`)
        return `<li>${parts.join(' ')}</li>`
      }).join('')

      return `
        <div class="piece" style="page-break-inside: avoid; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <div style="display: flex; gap: 16px;">
            ${photoUrl ? `<img src="${photoUrl}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" />` : ''}
            <div style="flex: 1;">
              <h3 style="margin: 0 0 4px 0; font-size: 16px;">${p.name}</h3>
              <p style="margin: 0; color: #666; font-size: 13px;">${categoryLabel} · ${metalLabels[p.metal_type] ?? p.metal_type}${isGoldType(p.metal_type) && p.metal_karat ? ` ${p.metal_karat}K` : ''}${p.metal_weight_grams ? ` · ${p.metal_weight_grams}g` : ''}</p>
              ${p.description ? `<p style="margin: 4px 0 0; color: #888; font-size: 12px;">${p.description}</p>` : ''}
              ${date ? `<p style="margin: 4px 0 0; color: #888; font-size: 12px;">Acquired: ${new Date(date).toLocaleDateString()}</p>` : ''}
              ${includeValues ? `
                <div style="display: flex; gap: 16px; margin-top: 8px; font-size: 13px;">
                  <span><strong>Melt:</strong> ${fmtCurrency(totalMelt)}</span>
                  <span><strong>Appraised:</strong> ${fmtCurrency(p.appraised_value)}</span>
                  ${p.price_paid != null ? `<span><strong>Paid:</strong> ${fmtCurrency(p.price_paid)}</span>` : ''}
                </div>
              ` : ''}
              ${gemstoneHtml ? `<ul style="margin: 8px 0 0; padding-left: 16px; font-size: 12px; color: #555;">${gemstoneHtml}</ul>` : ''}
            </div>
          </div>
        </div>
      `
    }).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Trove Inventory Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #333; }
          h1 { font-size: 24px; margin-bottom: 4px; }
          .meta { color: #888; font-size: 13px; margin-bottom: 24px; }
          .summary { background: #f5f5f5; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; gap: 24px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 11px; color: #888; text-transform: uppercase; }
          .summary-value { font-size: 20px; font-weight: bold; margin-top: 2px; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>Jewelry Inventory Report</h1>
        <p class="meta">${ownerName ? `Owner: ${ownerName} · ` : ''}Generated: ${now.toLocaleDateString()} · ${collectionPieces.length} pieces</p>
        ${includeValues ? `
          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Melt Value</div>
              <div class="summary-value">${fmtCurrency(totalMeltValue)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Appraised Value</div>
              <div class="summary-value">${fmtCurrency(totalAppraisedValue > 0 ? totalAppraisedValue : null)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Pieces</div>
              <div class="summary-value">${collectionPieces.length}</div>
            </div>
          </div>
        ` : ''}
        ${pieceRows}
        <p style="text-align: center; color: #aaa; font-size: 11px; margin-top: 32px;">Generated by Trove · ${now.toLocaleDateString()}</p>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm border border-neutral-800">
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-gold-400" /> Export Report
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg transition">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-sm text-neutral-400">
            Export your jewelry inventory ({collectionPieces.length} pieces) as a report for insurance, appraisal, or personal records.
          </p>

          {/* Format selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-400">Format</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('print')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition border ${
                  format === 'print'
                    ? 'bg-gold-400/10 border-gold-400/40 text-gold-400'
                    : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                Print / PDF
              </button>
              <button
                onClick={() => setFormat('csv')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition border ${
                  format === 'csv'
                    ? 'bg-gold-400/10 border-gold-400/40 text-gold-400'
                    : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                CSV Spreadsheet
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-neutral-400">Include</label>
            <button
              onClick={() => setIncludeValues(!includeValues)}
              className="w-full flex items-center gap-2.5 py-1.5 text-sm text-neutral-300 hover:text-white transition"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                includeValues ? 'bg-gold-400 border-gold-400' : 'border-neutral-600'
              }`}>
                {includeValues && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              Values (melt, appraised, price paid)
            </button>
            {format === 'print' && (
              <button
                onClick={() => setIncludePhotos(!includePhotos)}
                className="w-full flex items-center gap-2.5 py-1.5 text-sm text-neutral-300 hover:text-white transition"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  includePhotos ? 'bg-gold-400 border-gold-400' : 'border-neutral-600'
                }`}>
                  {includePhotos && <span className="text-black text-xs font-bold">✓</span>}
                </div>
                Photos
              </button>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-neutral-800">
          <button
            onClick={() => { format === 'csv' ? exportCSV() : printReport(); onClose() }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition text-sm"
          >
            <Download className="w-4 h-4" />
            {format === 'csv' ? 'Download CSV' : 'Open Print Preview'}
          </button>
        </div>
      </div>
    </div>
  )
}
