import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import BookForm from '../components/BookForm'
import type { BookFormValues } from '../components/BookForm'
import type { Profile } from '../types/database'

export default function AddBook() {
  const { isOwner, user } = useAuth()
  const navigate = useNavigate()

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [defaultOwners, setDefaultOwners] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOwner) navigate('/', { replace: true })
  }, [isOwner, navigate])

  useEffect(() => {
    supabase.from('profiles').select('*').then(({ data }) => {
      if (data) {
        setProfiles(data)
        if (user) setDefaultOwners([user.id])
      }
    })
  }, [user])

  async function handleSubmit(values: BookFormValues, selectedOwners: string[]) {
    if (selectedOwners.length === 0) {
      setError('Select at least one owner.')
      return
    }
    setSaving(true)
    setError(null)

    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        title: values.title.trim(),
        author: values.author.trim(),
        isbn: values.isbn.trim() || null,
        cover_url: values.coverUrl.trim() || null,
        description: values.description.trim() || null,
        genre: values.genre.length > 0 ? values.genre : null,
        published_year: values.publishedYear ? parseInt(values.publishedYear) : null,
        language: values.language.trim() || null,
        country: values.country.trim() || null,
        added_by: user!.id,
      })
      .select()
      .single()

    if (bookError || !book) {
      setError(bookError?.message ?? 'Failed to save book.')
      setSaving(false)
      return
    }

    const { error: ownersError } = await supabase
      .from('book_owners')
      .insert(selectedOwners.map(profile_id => ({ book_id: book.id, profile_id })))

    if (ownersError) {
      setError(ownersError.message)
      setSaving(false)
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-sm text-stone-500 hover:text-stone-700">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-stone-900">Add a book</h1>
        </div>
        <BookForm
          initialOwners={defaultOwners}
          profiles={profiles}
          saving={saving}
          error={error}
          submitLabel="Save book"
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
        />
      </main>
    </div>
  )
}
