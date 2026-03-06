import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Book, Profile } from '../types/database'

interface BookWithMeta extends Book {
  owners: { display_name: string }[]
  isOnLoan: boolean
  ratings: { profile_id: string; rating: number | null }[]
}

interface Props {
  book: BookWithMeta
  profiles: Profile[]
  onDeleted: (id: string) => void
}

export default function BookCard({ book, profiles, onDeleted }: Props) {
  const { isOwner } = useAuth()
  const navigate = useNavigate()

  async function handleDelete() {
    if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return
    const { error } = await supabase.from('books').delete().eq('id', book.id)
    if (error) {
      alert('Failed to delete: ' + error.message)
    } else {
      onDeleted(book.id)
    }
  }

  const ratingsWithName = profiles
    .map(p => ({ name: p.display_name, rating: book.ratings.find(r => r.profile_id === p.id)?.rating ?? null }))
    .filter(r => r.rating !== null)

  return (
    <div className="group relative flex flex-col rounded-lg border border-stone-200 bg-white shadow-sm transition hover:shadow-md overflow-hidden">
      {/* Cover */}
      <Link to={`/books/${book.id}`} className="block aspect-[3/4] sm:aspect-[2/3] bg-stone-100 overflow-hidden">
        {book.cover_url ? (
          <img
            src={book.cover_url.replace(/-L\.jpg$/, '-M.jpg')}
            alt={book.title}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl font-bold text-stone-300">{book.title.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </Link>

      {/* On loan badge — only shown when not available */}
      {book.isOnLoan && (
        <span className="absolute top-2 left-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 shadow-sm">
          On loan
        </span>
      )}

      {/* Edit / Delete — overlaid on cover, top-right, visible on hover */}
      {isOwner && (
        <div className="absolute top-2 right-2 hidden group-hover:flex flex-col gap-1">
          <button
            onClick={() => navigate(`/books/${book.id}/edit`)}
            className="rounded bg-white/90 px-2 py-0.5 text-xs text-stone-600 shadow hover:bg-white"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="rounded bg-white/90 px-2 py-0.5 text-xs text-red-500 shadow hover:bg-white"
          >
            Delete
          </button>
        </div>
      )}

      {/* Info below cover */}
      <div className="p-2 flex flex-col gap-1">
        <Link to={`/books/${book.id}`} className="hover:underline">
          <h2 className="text-sm sm:text-xs font-semibold text-stone-900 line-clamp-2 leading-snug">{book.title}</h2>
        </Link>
        <p className="text-xs text-stone-400 truncate">{book.author}</p>

        {/* Ratings */}
        {ratingsWithName.length > 0 && (
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            {ratingsWithName.map(r => (
              <span key={r.name} className="text-xs text-stone-500">
                <span className="text-stone-400">{r.name}:</span> {r.rating}/10
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
