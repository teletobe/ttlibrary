-- TTLibrary — Row Level Security Policies
-- Run this AFTER 001_initial_schema.sql

-- ============================================================
-- HELPER FUNCTION
-- Returns true if the currently logged-in user is an owner.
-- "Owner" = any authenticated user (you only give accounts to the two of you).
-- ============================================================

create or replace function is_owner()
returns boolean
language sql
security definer
as $$
  select auth.role() = 'authenticated';
$$;


-- ============================================================
-- PROFILES
-- ============================================================

alter table profiles enable row level security;

-- Anyone (including guests) can read profiles
create policy "profiles: public read"
  on profiles for select
  using (true);

-- Owners can update their own profile
create policy "profiles: owner update own"
  on profiles for update
  using (auth.uid() = id);


-- ============================================================
-- BOOKS
-- ============================================================

alter table books enable row level security;

-- Anyone can read books
create policy "books: public read"
  on books for select
  using (true);

-- Owners can add books
create policy "books: owner insert"
  on books for insert
  with check (is_owner());

-- Owners can edit any book
create policy "books: owner update"
  on books for update
  using (is_owner());

-- Owners can delete any book
create policy "books: owner delete"
  on books for delete
  using (is_owner());


-- ============================================================
-- BOOK OWNERS
-- ============================================================

alter table book_owners enable row level security;

-- Anyone can see which owners a book belongs to
create policy "book_owners: public read"
  on book_owners for select
  using (true);

-- Owners can assign ownership
create policy "book_owners: owner insert"
  on book_owners for insert
  with check (is_owner());

-- Owners can remove ownership
create policy "book_owners: owner delete"
  on book_owners for delete
  using (is_owner());


-- ============================================================
-- READING STATUS
-- ============================================================

alter table reading_status enable row level security;

-- Anyone can see reading status
create policy "reading_status: public read"
  on reading_status for select
  using (true);

-- Owners can insert their own reading status
create policy "reading_status: owner insert own"
  on reading_status for insert
  with check (is_owner() and auth.uid() = profile_id);

-- Owners can update their own reading status
create policy "reading_status: owner update own"
  on reading_status for update
  using (is_owner() and auth.uid() = profile_id);

-- Owners can delete their own reading status
create policy "reading_status: owner delete own"
  on reading_status for delete
  using (is_owner() and auth.uid() = profile_id);


-- ============================================================
-- LOANS
-- ============================================================

alter table loans enable row level security;

-- Anyone can see loan records (so guests know if a book is available)
create policy "loans: public read"
  on loans for select
  using (true);

-- Owners can create loans
create policy "loans: owner insert"
  on loans for insert
  with check (is_owner());

-- Owners can update loans (e.g. mark as returned)
create policy "loans: owner update"
  on loans for update
  using (is_owner());

-- Owners can delete loan records
create policy "loans: owner delete"
  on loans for delete
  using (is_owner());


-- ============================================================
-- BORROW REQUESTS
-- ============================================================

alter table borrow_requests enable row level security;

-- Guests (and owners) can submit a borrow request
create policy "borrow_requests: public insert"
  on borrow_requests for insert
  with check (true);

-- Only owners can read borrow requests
create policy "borrow_requests: owner read"
  on borrow_requests for select
  using (is_owner());

-- Only owners can update (approve / deny) borrow requests
create policy "borrow_requests: owner update"
  on borrow_requests for update
  using (is_owner());
