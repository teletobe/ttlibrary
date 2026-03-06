import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import type { Profile } from '../types/database'

interface OpenLibraryBook {
  title?: string
  authors?: { name: string }[]
  publish_date?: string
  description?: string | { value: string }
  covers?: number[]
}

export default function AddBook() {
  const { isOwner, user } = useAuth()
  const navigate = useNavigate()

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedOwners, setSelectedOwners] = useState<string[]>([])

  // Form fields
  const [isbn, setIsbn] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [publishedYear, setPublishedYear] = useState('')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [genre, setGenre] = useState('')

  const [isbnLoading, setIsbnLoading] = useState(false)
  const [isbnError, setIsbnError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect guests
  useEffect(() => {
    if (!isOwner) navigate('/', { replace: true })
  }, [isOwner, navigate])

  // Load all owner profiles so we can pick who owns the book
  useEffect(() => {
    supabase.from('profiles').select('*').then(({ data }) => {
      if (data) {
        setProfiles(data)
        // Default: current user is an owner of the book
        if (user) setSelectedOwners([user.id])
      }
    })
  }, [user])

  async function lookupIsbn() {
    const cleaned = isbn.replace(/[^0-9X]/gi, '')
    if (!cleaned) return
    setIsbnLoading(true)
    setIsbnError(null)

    try {
      const res = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${cleaned}&format=json&jscmd=data`
      )
      const json = await res.json()
      const book: OpenLibraryBook | undefined = json[`ISBN:${cleaned}`]

      if (!book) {
        setIsbnError('Book not found. Fill in the details manually.')
        setIsbnLoading(false)
        return
      }

      setTitle(book.title ?? '')
      setAuthor(book.authors?.map(a => a.name).join(', ') ?? '')
      const year = book.publish_date?.match(/\d{4}/)?.[0] ?? ''
      setPublishedYear(year)

      if (typeof book.description === 'string') setDescription(book.description)
      else if (book.description?.value) setDescription(book.description.value)

      if (book.covers?.[0]) {
        setCoverUrl(`https://covers.openlibrary.org/b/id/${book.covers[0]}-L.jpg`)
      }
    } catch {
      setIsbnError('Lookup failed. Fill in the details manually.')
    }

    setIsbnLoading(false)
  }

  function toggleOwner(id: string) {
    setSelectedOwners(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!title.trim() || !author.trim()) return
    if (selectedOwners.length === 0) {
      setError('Select at least one owner.')
      return
    }

    setSaving(true)
    setError(null)

    // Insert book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim() || null,
        cover_url: coverUrl.trim() || null,
        description: description.trim() || null,
        genre: genre.trim() ? genre.split(',').map(g => g.trim()).filter(Boolean) : null,
        published_year: publishedYear ? parseInt(publishedYear) : null,
        added_by: user!.id,
      })
      .select()
      .single()

    if (bookError || !book) {
      setError(bookError?.message ?? 'Failed to save book.')
      setSaving(false)
      return
    }

    // Insert book_owners rows
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
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-stone-900">Add a book</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ISBN lookup */}
          <div className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-400">
              ISBN lookup
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={isbn}
                onChange={e => setIsbn(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), lookupIsbn())}
                placeholder="e.g. 9780140449136"
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              />
              <button
                type="button"
                onClick={lookupIsbn}
                disabled={isbnLoading || !isbn}
                className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200 disabled:opacity-50"
              >
                {isbnLoading ? 'Looking up…' : 'Look up'}
              </button>
            </div>
            {isbnError && <p className="mt-2 text-sm text-amber-600">{isbnError}</p>}
          </div>

          {/* Book details */}
          <div className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-400">
              Details
            </h2>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-stone-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-stone-700">
                    Author <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={e => setAuthor(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700">
                    Year published
                  </label>
                  <input
                    type="number"
                    min="1000"
                    max="2100"
                    value={publishedYear}
                    onChange={e => setPublishedYear(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700">
                    Genres
                  </label>
                  <input
                    type="text"
                    value={genre}
                    onChange={e => setGenre(e.target.value)}
                    placeholder="Fiction, Mystery, …"
                    className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                  />
                  <p className="mt-1 text-xs text-stone-400">Comma-separated</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-stone-700">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-stone-700">
                    Cover image URL
                  </label>
                  <input
                    type="url"
                    value={coverUrl}
                    onChange={e => setCoverUrl(e.target.value)}
                    placeholder="Auto-filled from ISBN lookup"
                    className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                  />
                  {coverUrl && (
                    <img
                      src={coverUrl}
                      alt="Cover preview"
                      className="mt-2 h-24 rounded object-cover"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ownership */}
          <div className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-400">
              Owned by
            </h2>
            <div className="flex flex-wrap gap-3">
              {profiles.map(p => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedOwners.includes(p.id)}
                    onChange={() => toggleOwner(p.id)}
                    className="rounded border-stone-300"
                  />
                  <span className="text-sm text-stone-700">{p.display_name}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save book'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
