# TTLibrary — Requirements & Project Tracker

A personal library web app for two owners to manage their shared book collection, track reading status, manage loans, and let guests browse and request to borrow books.

---

## Tech Stack

| Layer      | Choice         | Notes                              |
| ---------- | -------------- | ---------------------------------- |
| Language   | TypeScript     | Everywhere — frontend and DB types |
| Frontend   | React + Vite   | SPA, fast build, static output     |
| Styling    | Tailwind CSS   | Utility-first, easy to maintain    |
| Backend/DB | Supabase       | PostgreSQL + Auth + RLS, free tier |
| Hosting    | GitHub Pages   | Static hosting, free               |
| CI/CD      | GitHub Actions | Auto-deploy on push to main        |

---

## User Roles

| Role  | Description                                                   |
| ----- | ------------------------------------------------------------- |
| Owner | Full access — add, edit, delete books, manage loans           |
| Guest | Read-only — browse books, see availability, request to borrow |

There are exactly two owner accounts (one per partner). Guest access is unauthenticated (no login required).

---

## Data Model

### `books`

| Column         | Type        | Notes                                  |
| -------------- | ----------- | -------------------------------------- |
| id             | uuid (PK)   | Auto-generated                         |
| title          | text        | Required                               |
| author         | text        | Required                               |
| isbn           | text        | Optional, for cover lookup             |
| cover_url      | text        | Optional, fetched via ISBN or uploaded |
| description    | text        | Optional, synopsis                     |
| genre          | text[]      | Optional, array of tags                |
| published_year | int         | Optional                               |
| ownership      | enum        | user1 / user2 / `both`                 |
| added_by       | uuid (FK)   | References profiles.id                 |
| created_at     | timestamptz | Auto                                   |

### `reading_status`

| Column     | Type        | Notes                                                    |
| ---------- | ----------- | -------------------------------------------------------- |
| id         | uuid (PK)   |                                                          |
| book_id    | uuid (FK)   | References books.id                                      |
| profile_id | uuid (FK)   | References profiles.id                                   |
| status     | enum        | `not_read` / `want_to_read` / `reading` / `read` / `DNF` |
| updated_at | timestamptz |                                                          |

One row per (book, user) pair. Both owners track status independently.

### `loans`

| Column           | Type        | Notes                                |
| ---------------- | ----------- | ------------------------------------ |
| id               | uuid (PK)   |                                      |
| book_id          | uuid (FK)   | References books.id                  |
| borrower_name    | text        | Name of person who borrowed the book |
| borrower_contact | text        | Optional — email or phone            |
| lent_at          | timestamptz |                                      |
| expected_return  | date        | Optional                             |
| returned_at      | timestamptz | Null = currently on loan             |
| approved_by      | uuid (FK)   | References profiles.id               |
| notes            | text        | Optional                             |

### `borrow_requests`

| Column          | Type        | Notes                             |
| --------------- | ----------- | --------------------------------- |
| id              | uuid (PK)   |                                   |
| book_id         | uuid (FK)   | References books.id               |
| requester_name  | text        | Submitted by guest                |
| requester_email | text        | So owners can follow up           |
| message         | text        | Optional, guest message           |
| status          | enum        | `pending` / `approved` / `denied` |
| created_at      | timestamptz |                                   |
| resolved_at     | timestamptz | Set when owner approves/denies    |
| resolved_by     | uuid (FK)   | References profiles.id, nullable  |

### `profiles`

Extends Supabase's built-in `auth.users` table.

| Column       | Type      | Notes                             |
| ------------ | --------- | --------------------------------- |
| id           | uuid (PK) | Same as auth.users.id             |
| display_name | text      | e.g. "T" or "Partner name"        |
| role         | enum      | `owner` (only two of these exist) |

---

## Access Control (Row Level Security)

| Table           | Guests (anon) | Owners (authenticated)     |
| --------------- | ------------- | -------------------------- |
| books           | SELECT only   | Full CRUD                  |
| reading_status  | SELECT only   | Full CRUD (own rows only)  |
| loans           | SELECT only   | Full CRUD                  |
| borrow_requests | INSERT only   | SELECT all + UPDATE status |
| profiles        | SELECT only   | SELECT all                 |

---

## Features

### MVP (Phase 1)

- [ ] Project setup: Vite + React + TypeScript + Tailwind
- [ ] Supabase project creation, schema, RLS policies
- [ ] GitHub Actions deploy to GitHub Pages
- [ ] Auth: login page for owners, guest browsing without login
- [ ] Book list view (all guests can see)
- [ ] Book detail page (title, author, cover, description, ownership, reading status, availability)
- [ ] Add / edit / delete books (owners only)
- [ ] Mark a book as lent out, to whom (owners only)
- [ ] Mark a book as returned (owners only)
- [ ] Reading status per owner per book

### Phase 2

- [ ] Borrow request form (guests submit, owners see a list and approve/deny)
- [ ] ISBN lookup to auto-fill book metadata (via Open Library API — free, no key needed)
- [ ] Cover image fetched from Open Library by ISBN
- [ ] Filter / search books (by title, author, genre, owner, availability)
- [ ] Sort books (by title, author, date added)

### Phase 3 (Nice to have)

- [ ] Statistics page: books read, books owned by each, genres breakdown
- [ ] "Wish list" — books you want to acquire
- [ ] Export library as CSV/JSON
- [ ] Mobile-friendly / PWA

---

## Project Structure (planned)

```
ttlibrary/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deploy to Pages
├── supabase/
│   └── migrations/             # SQL migration files for schema
├── src/
│   ├── components/             # Reusable UI components
│   ├── pages/                  # Route-level page components
│   ├── lib/
│   │   └── supabase.ts         # Supabase client
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript types (generated from Supabase)
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── REQUIREMENTS.md
```

---

## External Services

| Service          | Purpose                | Cost         |
| ---------------- | ---------------------- | ------------ |
| Supabase         | Database + Auth        | Free tier    |
| GitHub Pages     | Static hosting         | Free         |
| Open Library API | Book metadata + covers | Free, no key |

---

## Setup Checklist (before coding)

- [ ] Create GitHub repository, push initial commit
- [ ] Create Supabase project at supabase.com
- [ ] Add Supabase env vars as GitHub Actions secrets
- [ ] Enable GitHub Pages (from Actions) in repo settings

---

## Notes & Decisions

- Guest access is fully anonymous — no account needed to browse or submit a borrow request
- There will only ever be two owner accounts, created manually (no public signup)
- Book availability = no active loan (loans.returned_at IS NULL)
- Both owners can independently track their own reading status for the same book
- ISBN lookup uses Open Library (https://openlibrary.org/api/books) — free, no API key required
