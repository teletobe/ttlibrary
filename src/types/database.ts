// This file will be replaced with auto-generated types from Supabase CLI once the schema is set up.
// Run: npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts

export type Ownership = 'his' | 'hers' | 'both'
export type ReadingStatus = 'not_read' | 'want_to_read' | 'reading' | 'read'
export type BorrowRequestStatus = 'pending' | 'approved' | 'denied'

export interface Profile {
  id: string
  display_name: string
  role: 'owner'
}

export interface Book {
  id: string
  title: string
  author: string
  isbn: string | null
  cover_url: string | null
  description: string | null
  genre: string[] | null
  published_year: number | null
  ownership: Ownership
  added_by: string
  created_at: string
}

export interface ReadingStatusRow {
  id: string
  book_id: string
  profile_id: string
  status: ReadingStatus
  updated_at: string
}

export interface Loan {
  id: string
  book_id: string
  borrower_name: string
  borrower_contact: string | null
  lent_at: string
  expected_return: string | null
  returned_at: string | null
  approved_by: string
  notes: string | null
}

export interface BorrowRequest {
  id: string
  book_id: string
  requester_name: string
  requester_email: string
  message: string | null
  status: BorrowRequestStatus
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
}

// Placeholder until Supabase CLI generates the full typed client
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'id'>; Update: Partial<Profile> }
      books: { Row: Book; Insert: Omit<Book, 'id' | 'created_at'>; Update: Partial<Book> }
      reading_status: { Row: ReadingStatusRow; Insert: Omit<ReadingStatusRow, 'id' | 'updated_at'>; Update: Partial<ReadingStatusRow> }
      loans: { Row: Loan; Insert: Omit<Loan, 'id'>; Update: Partial<Loan> }
      borrow_requests: { Row: BorrowRequest; Insert: Omit<BorrowRequest, 'id' | 'created_at'>; Update: Partial<BorrowRequest> }
    }
  }
}
