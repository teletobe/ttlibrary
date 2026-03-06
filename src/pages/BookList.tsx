import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import BookCard from '../components/BookCard'
import type { Book, Profile } from '../types/database'

interface BookWithMeta extends Book {
  owners: { display_name: string }[]
  isOnLoan: boolean
  ratings: { profile_id: string; rating: number | null }[]
}

// Raw shape returned by the nested Supabase select
interface BookRow extends Book {
  book_owners: { profiles: { display_name: string } | null }[]
  loans: { returned_at: string | null }[]
  reading_status: { profile_id: string; rating: number | null }[]
}

export default function BookList() {
  const { isOwner } = useAuth()
  const [books, setBooks] = useState<BookWithMeta[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'title' | 'author'>('title')
  const [searchQuery, setSearchQuery] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')

  useEffect(() => {
    async function fetchData() {
      const [booksRes, profilesRes] = await Promise.all([
        supabase
          .from('books')
          .select(`*, book_owners(profiles(display_name)), loans(returned_at), reading_status(profile_id, rating)`)
          .order('title'),
        supabase.from('profiles').select('*'),
      ])

      if (booksRes.error) {
        setError(booksRes.error.message)
        setLoading(false)
        return
      }

      const mapped: BookWithMeta[] = ((booksRes.data ?? []) as BookRow[]).map((row) => ({
        ...row,
        owners: (row.book_owners ?? []).flatMap((bo) =>
          bo.profiles ? [{ display_name: bo.profiles.display_name }] : []
        ),
        isOnLoan: (row.loans ?? []).some((l) => l.returned_at === null),
        ratings: row.reading_status ?? [],
      }))

      setBooks(mapped)
      if (profilesRes.data) setProfiles(profilesRes.data)
      setLoading(false)
    }

    fetchData()
  }, [])

  const countries = [...new Set(books.map(b => b.country).filter(Boolean) as string[])].sort()
  const languages = [...new Set(books.map(b => b.language).filter(Boolean) as string[])].sort()

  const q = searchQuery.toLowerCase()
  const displayed = books
    .filter(b =>
      (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) &&
      (!countryFilter || b.country === countryFilter) &&
      (!languageFilter || b.language === languageFilter)
    )
    .sort((a, b) =>
      sortBy === 'author'
        ? a.author.localeCompare(b.author)
        : a.title.localeCompare(b.title)
    )

  const hasActiveFilters = countryFilter || languageFilter

  const chevron = (
    <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Our Library</h1>
        </div>

        {/* Search + add */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title or author…"
              className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/15"
            />
          </div>

          {isOwner && (
            <Link
              to="/books/new"
              className="shrink-0 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
            >
              + Add book
            </Link>
          )}
        </div>

        {/* Sort + filter toolbar */}
        {!loading && books.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {/* Segmented sort control */}
            <div className="flex rounded-lg bg-stone-100 p-0.5">
              <button
                onClick={() => setSortBy('title')}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-all ${sortBy === 'title' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                Title
              </button>
              <button
                onClick={() => setSortBy('author')}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-all ${sortBy === 'author' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                Author
              </button>
            </div>

            <div className="h-5 w-px bg-stone-200" />

            {/* Language filter */}
            <div className="relative">
              <select
                value={languageFilter}
                onChange={e => setLanguageFilter(e.target.value)}
                className="appearance-none cursor-pointer rounded-lg border border-stone-200 bg-white py-1.5 pl-3 pr-7 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900/15"
              >
                <option value="">Language</option>
                {languages.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              {chevron}
            </div>

            {/* Country filter */}
            <div className="relative">
              <select
                value={countryFilter}
                onChange={e => setCountryFilter(e.target.value)}
                className="appearance-none cursor-pointer rounded-lg border border-stone-200 bg-white py-1.5 pl-3 pr-7 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900/15"
              >
                <option value="">Country</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {chevron}
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => { setCountryFilter(''); setLanguageFilter('') }}
                className="text-xs text-stone-400 transition-colors hover:text-stone-700"
              >
                Clear filters
              </button>
            )}

            <span className="ml-auto text-xs text-stone-400">
              {displayed.length} of {books.length}
            </span>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <p className="text-stone-400">Loading…</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load books: {error}
          </div>
        )}

        {!loading && !error && books.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-stone-400">No books yet.</p>
            {isOwner && (
              <Link to="/books/new" className="mt-2 text-sm text-stone-600 underline">
                Add the first one
              </Link>
            )}
          </div>
        )}

        {!loading && displayed.length > 0 && (
          <div className="grid gap-2 grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {displayed.map(book => (
              <BookCard
                key={book.id}
                book={book}
                profiles={profiles}
                onDeleted={id => setBooks(prev => prev.filter(b => b.id !== id))}
              />
            ))}
          </div>
        )}

        {!loading && books.length > 0 && displayed.length === 0 && (
          <div className="flex justify-center py-20">
            <p className="text-stone-400">No books match the current filters.</p>
          </div>
        )}
      </main>
    </div>
  )
}
