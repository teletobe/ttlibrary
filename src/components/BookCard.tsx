import type { Book } from '../types/database'

interface BookWithMeta extends Book {
  owners: { display_name: string }[]
  isOnLoan: boolean
}

interface Props {
  book: BookWithMeta
}

export default function BookCard({ book }: Props) {
  const ownerNames = book.owners.map(o => o.display_name).join(' & ')

  return (
    <div className="flex gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      {/* Cover */}
      <div className="flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-stone-100">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-3xl font-bold text-stone-300">
            {book.title.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <h2 className="truncate font-semibold text-stone-900">{book.title}</h2>
          <p className="text-sm text-stone-500">{book.author}</p>
          {book.published_year && (
            <p className="text-xs text-stone-400">{book.published_year}</p>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* Owners */}
          <span className="text-xs text-stone-400">{ownerNames}</span>

          {/* Availability badge */}
          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
            book.isOnLoan
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}>
            {book.isOnLoan ? 'On loan' : 'Available'}
          </span>
        </div>
      </div>
    </div>
  )
}
