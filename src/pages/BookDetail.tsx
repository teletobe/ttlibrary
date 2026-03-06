import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import RatingWidget from '../components/RatingWidget'
import type { Book, Loan, Profile } from '../types/database'

interface BookWithOwners extends Book {
  owners: Profile[]
}

interface LoanWithApprover extends Loan {
  approver_name: string
}

export default function BookDetail() {
  const { id } = useParams<{ id: string }>()
  const { isOwner, user } = useAuth()
  const navigate = useNavigate()

  const [book, setBook] = useState<BookWithOwners | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeLoan, setActiveLoan] = useState<LoanWithApprover | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Loan form state (owners)
  const [showLoanForm, setShowLoanForm] = useState(false)
  const [borrowerName, setBorrowerName] = useState('')
  const [borrowerContact, setBorrowerContact] = useState('')
  const [expectedReturn, setExpectedReturn] = useState('')
  const [loanNotes, setLoanNotes] = useState('')
  const [loanSaving, setLoanSaving] = useState(false)
  const [loanError, setLoanError] = useState<string | null>(null)

  // Borrow request form state (guests)
  const [reqName, setReqName] = useState('')
  const [reqEmail, setReqEmail] = useState('')
  const [reqMessage, setReqMessage] = useState('')
  const [reqSaving, setReqSaving] = useState(false)
  const [reqSent, setReqSent] = useState(false)
  const [reqError, setReqError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    async function fetchData() {
      const [bookRes, profilesRes, loansRes] = await Promise.all([
        supabase
          .from('books')
          .select('*, book_owners(profiles(*))')
          .eq('id', id!)
          .single(),
        supabase.from('profiles').select('*'),
        supabase
          .from('loans')
          .select('*, approver:approved_by(display_name)')
          .eq('book_id', id!)
          .is('returned_at', null)
          .maybeSingle(),
      ])

      if (bookRes.error || !bookRes.data) {
        setLoadError('Book not found.')
        return
      }

      const raw = bookRes.data as any
      setBook({
        ...raw,
        owners: (raw.book_owners ?? []).flatMap((bo: any) => bo.profiles ? [bo.profiles] : []),
      })

      if (profilesRes.data) setProfiles(profilesRes.data)

      if (loansRes.data) {
        const loan = loansRes.data as any
        setActiveLoan({ ...loan, approver_name: loan.approver?.display_name ?? 'Unknown' })
      }
    }

    fetchData()
  }, [id])

  async function handleLendOut(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!borrowerName.trim()) return
    setLoanSaving(true)
    setLoanError(null)

    const { data, error } = await supabase
      .from('loans')
      .insert({
        book_id: id!,
        borrower_name: borrowerName.trim(),
        borrower_contact: borrowerContact.trim() || null,
        expected_return: expectedReturn || null,
        approved_by: user!.id,
        notes: loanNotes.trim() || null,
      })
      .select()
      .single()

    if (error || !data) {
      setLoanError(error?.message ?? 'Failed to create loan.')
      setLoanSaving(false)
      return
    }

    setActiveLoan({ ...data as Loan, approver_name: profiles.find(p => p.id === user!.id)?.display_name ?? '' })
    setShowLoanForm(false)
    setBorrowerName(''); setBorrowerContact(''); setExpectedReturn(''); setLoanNotes('')
    setLoanSaving(false)
  }

  async function handleMarkReturned() {
    if (!activeLoan) return
    if (!confirm(`Mark this book as returned from ${activeLoan.borrower_name}?`)) return

    await supabase
      .from('loans')
      .update({ returned_at: new Date().toISOString() })
      .eq('id', activeLoan.id)

    setActiveLoan(null)
  }

  async function handleBorrowRequest(e: { preventDefault(): void }) {
    e.preventDefault()
    setReqSaving(true)
    setReqError(null)

    const { error } = await supabase.from('borrow_requests').insert({
      book_id: id!,
      requester_name: reqName.trim(),
      requester_email: reqEmail.trim(),
      message: reqMessage.trim() || null,
      status: 'pending',
    })

    if (error) {
      setReqError(error.message)
      setReqSaving(false)
      return
    }

    setReqSent(true)
    setReqSaving(false)
  }

  const inputClass = 'mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500'

  if (loadError) return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-red-600">{loadError}</p>
      </main>
    </div>
  )

  if (!book) return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-stone-400">Loading…</p>
      </main>
    </div>
  )

  const ownerNames = book.owners.map(o => o.display_name).join(' & ')

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Back + owner actions */}
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-sm text-stone-500 hover:text-stone-700">
            ← Back
          </button>
          {isOwner && (
            <div className="flex gap-3">
              <Link
                to={`/books/${id}/edit`}
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
              >
                Edit
              </Link>
            </div>
          )}
        </div>

        {/* Main card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex gap-6">
            {/* Cover */}
            <div className="flex h-48 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-100">
              {book.cover_url ? (
                <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
              ) : (
                <span className="text-5xl font-bold text-stone-300">
                  {book.title.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Title block */}
            <div className="flex flex-col justify-between">
              <div>
                <h1 className="text-2xl font-bold text-stone-900">{book.title}</h1>
                <p className="mt-1 text-lg text-stone-600">{book.author}</p>
                {book.published_year && (
                  <p className="mt-0.5 text-sm text-stone-400">{book.published_year}</p>
                )}
                {book.genre && book.genre.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {book.genre.map(g => (
                      <span key={g} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
                {book.language && <span>Language: {book.language}</span>}
                {book.country && <span>Country: {book.country}</span>}
                <span>Owned by {ownerNames}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {book.description && (
            <p className="mt-6 text-sm leading-relaxed text-stone-600">{book.description}</p>
          )}

          {/* Ratings */}
          <RatingWidget bookId={book.id} profiles={profiles} />
        </div>

        {/* Loan status */}
        <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-400">
            Availability
          </h2>

          {activeLoan ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  On loan
                </span>
                <span className="text-sm text-stone-600">
                  Lent to <strong>{activeLoan.borrower_name}</strong>
                  {activeLoan.borrower_contact && ` (${activeLoan.borrower_contact})`}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Since {new Date(activeLoan.lent_at).toLocaleDateString()}
                {activeLoan.expected_return && ` · due back ${new Date(activeLoan.expected_return).toLocaleDateString()}`}
              </p>
              {activeLoan.notes && (
                <p className="text-xs italic text-stone-400">{activeLoan.notes}</p>
              )}
              {isOwner && (
                <button
                  onClick={handleMarkReturned}
                  className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Mark as returned
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Available
                </span>
                {isOwner && !showLoanForm && (
                  <button
                    onClick={() => setShowLoanForm(true)}
                    className="text-sm text-stone-500 underline hover:text-stone-700"
                  >
                    Lend out
                  </button>
                )}
              </div>

              {/* Lend-out form (owners) */}
              {isOwner && showLoanForm && (
                <form onSubmit={handleLendOut} className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-stone-700">
                        Borrower name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text" required value={borrowerName}
                        onChange={e => setBorrowerName(e.target.value)} className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700">Contact</label>
                      <input
                        type="text" value={borrowerContact} placeholder="Email or phone"
                        onChange={e => setBorrowerContact(e.target.value)} className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700">Expected return</label>
                      <input
                        type="date" value={expectedReturn}
                        onChange={e => setExpectedReturn(e.target.value)} className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700">Notes</label>
                      <input
                        type="text" value={loanNotes}
                        onChange={e => setLoanNotes(e.target.value)} className={inputClass}
                      />
                    </div>
                  </div>
                  {loanError && <p className="text-sm text-red-600">{loanError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit" disabled={loanSaving}
                      className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
                    >
                      {loanSaving ? 'Saving…' : 'Confirm loan'}
                    </button>
                    <button
                      type="button" onClick={() => setShowLoanForm(false)}
                      className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Borrow request form (guests) */}
              {!isOwner && (
                <div className="mt-4">
                  <h3 className="mb-3 text-sm font-medium text-stone-700">Request to borrow</h3>
                  {reqSent ? (
                    <p className="text-sm text-emerald-600">
                      Request sent! The owners will get back to you.
                    </p>
                  ) : (
                    <form onSubmit={handleBorrowRequest} className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-stone-700">
                            Your name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text" required value={reqName}
                            onChange={e => setReqName(e.target.value)} className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-700">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email" required value={reqEmail}
                            onChange={e => setReqEmail(e.target.value)} className={inputClass}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700">
                          Message (optional)
                        </label>
                        <textarea
                          rows={2} value={reqMessage}
                          onChange={e => setReqMessage(e.target.value)}
                          placeholder="When would you need it?"
                          className={inputClass}
                        />
                      </div>
                      {reqError && <p className="text-sm text-red-600">{reqError}</p>}
                      <button
                        type="submit" disabled={reqSaving}
                        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
                      >
                        {reqSaving ? 'Sending…' : 'Send request'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
