import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import BookForm from '../components/BookForm'
import type { BookFormValues } from '../components/BookForm'
import type { Profile } from '../types/database'

export default function EditBook() {
  const { id } = useParams<{ id: string }>()
  const { isOwner } = useAuth()
  const navigate = useNavigate()

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [initialValues, setInitialValues] = useState<BookFormValues | null>(null)
  const [initialOwners, setInitialOwners] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOwner) navigate('/', { replace: true })
  }, [isOwner, navigate])

  useEffect(() => {
    if (!id) return

    Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('books').select('*').eq('id', id).single(),
      supabase.from('book_owners').select('profile_id').eq('book_id', id),
    ]).then(([profilesRes, bookRes, ownersRes]) => {
      if (bookRes.error || !bookRes.data) {
        setLoadError('Book not found.')
        return
      }
      if (profilesRes.data) setProfiles(profilesRes.data)
      if (ownersRes.data) setInitialOwners(ownersRes.data.map((o: { profile_id: string }) => o.profile_id))

      const b = bookRes.data
      setInitialValues({
        isbn: b.isbn ?? '',
        title: b.title,
        author: b.author,
        publishedYear: b.published_year?.toString() ?? '',
        description: b.description ?? '',
        coverUrl: b.cover_url ?? '',
        genre: b.genre ?? [],
        language: b.language ?? '',
        country: b.country ?? '',
      })
    })
  }, [id])

  async function handleSubmit(values: BookFormValues, selectedOwners: string[]) {
    if (selectedOwners.length === 0) {
      setError('Select at least one owner.')
      return
    }
    setSaving(true)
    setError(null)

    const { error: bookError } = await supabase
      .from('books')
      .update({
        title: values.title.trim(),
        author: values.author.trim(),
        isbn: values.isbn.trim() || null,
        cover_url: values.coverUrl.trim() || null,
        description: values.description.trim() || null,
        genre: values.genre.length > 0 ? values.genre : null,
        published_year: values.publishedYear ? parseInt(values.publishedYear) : null,
        language: values.language.trim() || null,
        country: values.country.trim() || null,
      })
      .eq('id', id!)

    if (bookError) {
      setError(bookError.message)
      setSaving(false)
      return
    }

    // Replace book_owners: delete all then re-insert
    await supabase.from('book_owners').delete().eq('book_id', id!)
    const { error: ownersError } = await supabase
      .from('book_owners')
      .insert(selectedOwners.map(profile_id => ({ book_id: id!, profile_id })))

    if (ownersError) {
      setError(ownersError.message)
      setSaving(false)
      return
    }

    navigate('/', { replace: true })
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <p className="text-red-600">{loadError}</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-sm text-stone-500 hover:text-stone-700">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-stone-900">Edit book</h1>
        </div>

        {initialValues ? (
          <BookForm
            initialValues={initialValues}
            initialOwners={initialOwners}
            profiles={profiles}
            saving={saving}
            error={error}
            submitLabel="Save changes"
            onSubmit={handleSubmit}
            onCancel={() => navigate(-1)}
          />
        ) : (
          <p className="text-stone-400">Loading…</p>
        )}
      </main>
    </div>
  )
}
