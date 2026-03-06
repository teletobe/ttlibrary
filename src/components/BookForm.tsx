import { useState } from 'react'
import type { Profile } from '../types/database'

interface OpenLibraryBook {
  title?: string
  authors?: { name: string }[]
  publish_date?: string
  description?: string | { value: string }
  covers?: number[]
}

export interface BookFormValues {
  isbn: string
  title: string
  author: string
  publishedYear: string
  description: string
  coverUrl: string
  genre: string[]
  language: string
  country: string
}

const GENRES = [
  'Action & Adventure', 'Biographie', 'Classics', 'Comic', 'Contemporary',
  'Dystopia', 'Fantasy', 'Historical Fiction', 'Horror', 'Krimi',
  'Mystery', 'Non-Fiction', 'Poetry', 'Romance', 'Science-Fiction',
  'Short Stories', 'Thriller', 'YA',
]

const PRIORITY_LANGUAGES = ['English', 'German', 'French']
const OTHER_LANGUAGES = [
  'Arabic', 'Bengali', 'Chinese', 'Danish', 'Dutch', 'Finnish', 'Greek',
  'Hebrew', 'Hindi', 'Hungarian', 'Indonesian', 'Italian', 'Japanese',
  'Korean', 'Norwegian', 'Persian', 'Polish', 'Portuguese', 'Romanian',
  'Russian', 'Spanish', 'Swedish', 'Thai', 'Turkish', 'Ukrainian', 'Urdu',
  'Vietnamese',
]

const PRIORITY_COUNTRIES = ['United Kingdom', 'United States', 'France', 'Austria', 'Germany']
const OTHER_COUNTRIES = [
  'Argentina', 'Australia', 'Belgium', 'Brazil', 'Canada', 'Chile', 'China',
  'Colombia', 'Czech Republic', 'Denmark', 'Egypt', 'Finland', 'Greece',
  'Hungary', 'India', 'Indonesia', 'Iran', 'Ireland', 'Israel', 'Italy',
  'Japan', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand', 'Nigeria',
  'Norway', 'Pakistan', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Romania', 'Russia', 'Saudi Arabia', 'South Africa', 'South Korea',
  'Spain', 'Sweden', 'Switzerland', 'Turkey', 'Ukraine', 'Venezuela',
]

interface Props {
  initialValues?: Partial<BookFormValues>
  initialOwners?: string[]
  profiles: Profile[]
  saving: boolean
  error: string | null
  submitLabel: string
  onSubmit: (values: BookFormValues, selectedOwners: string[]) => void
  onCancel: () => void
}

export default function BookForm({
  initialValues,
  initialOwners = [],
  profiles,
  saving,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [isbn, setIsbn] = useState(initialValues?.isbn ?? '')
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [author, setAuthor] = useState(initialValues?.author ?? '')
  const [publishedYear, setPublishedYear] = useState(initialValues?.publishedYear ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [coverUrl, setCoverUrl] = useState(initialValues?.coverUrl ?? '')
  const [genre, setGenre] = useState<string[]>(initialValues?.genre ?? [])
  const [language, setLanguage] = useState(initialValues?.language ?? '')
  const [country, setCountry] = useState(initialValues?.country ?? '')
  const [selectedOwners, setSelectedOwners] = useState<string[]>(initialOwners)

  const [isbnLoading, setIsbnLoading] = useState(false)
  const [isbnError, setIsbnError] = useState<string | null>(null)

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

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    onSubmit({ isbn, title, author, publishedYear, description, coverUrl, genre, language, country }, selectedOwners)
  }

  const inputClass = 'mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500'

  return (
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className={inputClass} />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700">
              Author <span className="text-red-500">*</span>
            </label>
            <input type="text" required value={author} onChange={e => setAuthor(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700">Year published</label>
            <input
              type="number" min="1000" max="2100"
              value={publishedYear} onChange={e => setPublishedYear(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700">Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)} className={inputClass}>
              <option value="">— select —</option>
              {PRIORITY_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              <option disabled>──────────</option>
              {OTHER_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700">Country</label>
            <select value={country} onChange={e => setCountry(e.target.value)} className={inputClass}>
              <option value="">— select —</option>
              {PRIORITY_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              <option disabled>──────────</option>
              {OTHER_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-stone-700">Genres</label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {GENRES.map(g => (
                <label key={g} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={genre.includes(g)}
                    onChange={() => setGenre(prev =>
                      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
                    )}
                    className="rounded border-stone-300"
                  />
                  <span className="text-sm text-stone-700">{g}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700">Description</label>
            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className={inputClass} />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700">Cover image URL</label>
            <input
              type="url" value={coverUrl} onChange={e => setCoverUrl(e.target.value)}
              placeholder="Auto-filled from ISBN lookup" className={inputClass}
            />
            {coverUrl && (
              <img src={coverUrl} alt="Cover preview" className="mt-2 h-24 rounded object-cover" />
            )}
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          type="button" onClick={onCancel}
          className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
        >
          Cancel
        </button>
        <button
          type="submit" disabled={saving}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
