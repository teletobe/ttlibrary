import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { ReadingStatusRow, Profile } from '../types/database'

interface Props {
  bookId: string
  profiles: Profile[]  // all owner profiles, for display names
}

type StatusByProfile = Record<string, ReadingStatusRow>

export default function RatingWidget({ bookId, profiles }: Props) {
  const { user, isOwner } = useAuth()
  const [statuses, setStatuses] = useState<StatusByProfile>({})
  const [editing, setEditing] = useState(false)
  const [draftRating, setDraftRating] = useState<number | null>(null)
  const [draftReview, setDraftReview] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('reading_status')
      .select('*')
      .eq('book_id', bookId)
      .then(({ data }) => {
        if (!data) return
        const map: StatusByProfile = {}
        for (const row of data) map[row.profile_id] = row as ReadingStatusRow
        setStatuses(map)
      })
  }, [bookId])

  function openEdit() {
    if (!user) return
    const mine = statuses[user.id]
    setDraftRating(mine?.rating ?? null)
    setDraftReview(mine?.review ?? '')
    setEditing(true)
  }

  async function saveRating() {
    if (!user) return
    setSaving(true)
    const existing = statuses[user.id]

    const payload = {
      book_id: bookId,
      profile_id: user.id,
      rating: draftRating,
      review: draftReview.trim() || null,
    }

    let updated: ReadingStatusRow | null = null

    if (existing) {
      const { data } = await supabase
        .from('reading_status')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
      updated = data as ReadingStatusRow | null
    } else {
      const { data } = await supabase
        .from('reading_status')
        .insert({ ...payload, status: 'not_read' })
        .select()
        .single()
      updated = data as ReadingStatusRow | null
    }

    if (updated) {
      setStatuses(prev => ({ ...prev, [user.id]: updated! }))
    }
    setSaving(false)
    setEditing(false)
  }

  const ownerProfiles = profiles.filter(p => statuses[p.id] || isOwner)

  return (
    <div className="mt-3 border-t border-stone-100 pt-3">
      {/* Ratings display */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {profiles.map(p => {
          const s = statuses[p.id]
          const isMe = user?.id === p.id
          return (
            <div key={p.id} className="flex items-center gap-1">
              <span className="text-xs text-stone-400">{p.display_name}:</span>
              {s?.rating ? (
                <span className={`text-xs font-semibold ${isMe ? 'text-stone-700' : 'text-stone-500'}`}>
                  {s.rating}/10
                </span>
              ) : (
                <span className="text-xs text-stone-300">—</span>
              )}
            </div>
          )
        })}

        {isOwner && !editing && (
          <button
            onClick={openEdit}
            className="ml-auto text-xs text-stone-400 hover:text-stone-600 underline"
          >
            {statuses[user!.id]?.rating ? 'Edit rating' : 'Rate'}
          </button>
        )}
      </div>

      {/* Reviews display */}
      {ownerProfiles.map(p => {
        const s = statuses[p.id]
        if (!s?.review) return null
        return (
          <p key={p.id} className="mt-1 text-xs italic text-stone-500">
            <span className="not-italic font-medium text-stone-400">{p.display_name}:</span>{' '}
            "{s.review}"
          </p>
        )
      })}

      {/* Inline edit form */}
      {editing && (
        <div className="mt-3 space-y-2 rounded-lg bg-stone-50 p-3">
          <div>
            <p className="mb-1 text-xs font-medium text-stone-600">Rating</p>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDraftRating(draftRating === n ? null : n)}
                  className={`h-7 w-7 rounded text-xs font-medium transition ${
                    draftRating === n
                      ? 'bg-stone-800 text-white'
                      : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-stone-600">Review (optional)</p>
            <textarea
              rows={2}
              value={draftReview}
              onChange={e => setDraftReview(e.target.value)}
              placeholder="A short note…"
              className="w-full rounded border border-stone-200 px-2 py-1 text-xs text-stone-700 focus:border-stone-400 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              Cancel
            </button>
            <button
              onClick={saveRating}
              disabled={saving}
              className="rounded bg-stone-800 px-3 py-1 text-xs text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
