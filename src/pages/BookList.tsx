import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import BookCard from '../components/BookCard'
import type { Book } from '../types/database'

interface BookWithMeta extends Book {
  owners: { display_name: string }[]
  isOnLoan: boolean
}

// Raw shape returned by the nested Supabase select
interface BookRow extends Book {
  book_owners: { profiles: { display_name: string } | null }[]
  loans: { returned_at: string | null }[]
}

export default function BookList() {
  const { isOwner } = useAuth()
  const [books, setBooks] = useState<BookWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBooks() {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          book_owners(
            profiles(display_name)
          ),
          loans(returned_at)
        `)
        .order('title')

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const mapped: BookWithMeta[] = ((data ?? []) as BookRow[]).map((row) => ({
        ...row,
        owners: (row.book_owners ?? []).flatMap((bo: { profiles: { display_name: string } | null }) =>
          bo.profiles ? [{ display_name: bo.profiles.display_name }] : []
        ),
        isOnLoan: (row.loans ?? []).some((l: { returned_at: string | null }) => l.returned_at === null),
      }))

      setBooks(mapped)
      setLoading(false)
    }

    fetchBooks()
  }, [])

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Our Library</h1>
            <p className="text-sm text-stone-500">
              {loading ? '…' : `${books.length} book${books.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {isOwner && (
            <Link
              to="/books/new"
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              + Add book
            </Link>
          )}
        </div>

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

        {!loading && books.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {books.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
