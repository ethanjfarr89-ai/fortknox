import { useState } from 'react'
import { X, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useScrollLock } from '../lib/useScrollLock'

interface Props {
  userId: string
  onClose: () => void
}

export default function ReportIssue({ userId, onClose }: Props) {
  useScrollLock()

  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const inputCls = 'w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition text-sm text-white placeholder-neutral-500'
  const labelCls = 'block text-sm font-medium text-neutral-400 mb-1'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) return

    setSaving(true)
    const { error } = await supabase.from('issue_reports').insert({
      user_id: userId,
      subject: subject.trim(),
      description: description.trim(),
      page_url: window.location.href,
    })

    if (error) {
      console.error('Failed to submit report:', error)
      setSaving(false)
      return
    }

    setSuccess(true)
    setTimeout(() => onClose(), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg relative border border-neutral-800">
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">Report an Issue</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg transition">
            <X size={20} className="text-neutral-400" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <p className="text-gold-400 font-medium text-lg">Thanks for your report!</p>
            <p className="text-neutral-400 text-sm mt-1">We'll look into it.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className={labelCls}>Subject *</label>
              <input
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className={inputCls}
                placeholder="Brief summary of the issue"
              />
            </div>

            <div>
              <label className={labelCls}>Description *</label>
              <textarea
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                className={inputCls}
                placeholder="What happened? What did you expect?"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-800 transition text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !subject.trim() || !description.trim()}
                className="flex-1 py-2.5 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                {saving ? 'Sending...' : (
                  <>
                    <Send size={14} />
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
