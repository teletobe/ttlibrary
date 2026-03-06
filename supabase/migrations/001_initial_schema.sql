-- TTLibrary — Initial Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ============================================================
-- ENUMS
-- ============================================================

create type reading_status_enum as enum ('not_read', 'want_to_read', 'reading', 'read');
create type borrow_request_status as enum ('pending', 'approved', 'denied');


-- ============================================================
-- PROFILES
-- Extends Supabase auth.users. One row per authenticated user.
-- ============================================================

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  created_at    timestamptz not null default now()
);

-- Automatically create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ============================================================
-- BOOKS
-- ============================================================

create table books (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  author          text not null,
  isbn            text,
  cover_url       text,
  description     text,
  genre           text[],
  published_year  int,
  added_by        uuid not null references profiles(id),
  created_at      timestamptz not null default now()
);


-- ============================================================
-- BOOK OWNERS
-- Many-to-many: a book can belong to any number of owners.
-- One row = one owner claims this book.
-- ============================================================

create table book_owners (
  book_id     uuid not null references books(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  primary key (book_id, profile_id)
);


-- ============================================================
-- READING STATUS
-- One row per (book, user) pair. Each owner tracks independently.
-- ============================================================

create table reading_status (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references books(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  status      reading_status_enum not null default 'not_read',
  updated_at  timestamptz not null default now(),
  unique (book_id, profile_id)
);


-- ============================================================
-- LOANS
-- Tracks books that have been lent out to someone.
-- returned_at IS NULL means the book is currently on loan.
-- ============================================================

create table loans (
  id                uuid primary key default gen_random_uuid(),
  book_id           uuid not null references books(id) on delete cascade,
  borrower_name     text not null,
  borrower_contact  text,
  lent_at           timestamptz not null default now(),
  expected_return   date,
  returned_at       timestamptz,
  approved_by       uuid not null references profiles(id),
  notes             text
);


-- ============================================================
-- BORROW REQUESTS
-- Guests submit these; owners approve or deny.
-- ============================================================

create table borrow_requests (
  id               uuid primary key default gen_random_uuid(),
  book_id          uuid not null references books(id) on delete cascade,
  requester_name   text not null,
  requester_email  text not null,
  message          text,
  status           borrow_request_status not null default 'pending',
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz,
  resolved_by      uuid references profiles(id)
);
