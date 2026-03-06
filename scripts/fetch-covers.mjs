// TTLibrary — Bulk cover image fetcher
// Uses Open Library search API (no API key needed)
//
// SETUP:
//   Add to your .env file:
//     SUPABASE_SERVICE_KEY=your_service_role_key_here
//   (Find it in Supabase → Project Settings → API → service_role)
//
// RUN:
//   node scripts/fetch-covers.mjs
//
// The script will skip books that already have a cover_url.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load .env manually (no dotenv dependency needed)
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const i = line.indexOf('=')
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()]
    })
)

const supabaseUrl  = env.VITE_SUPABASE_URL
const serviceKey   = env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function searchOpenLibrary(title, author) {
  const q = encodeURIComponent(title)
  const a = encodeURIComponent(author.split(',')[0].trim()) // use first author name only
  const url = `https://openlibrary.org/search.json?title=${q}&author=${a}&limit=1&fields=cover_i,title`

  const res = await fetch(url)
  if (!res.ok) return null
  const json = await res.json()
  const doc = json.docs?.[0]
  if (!doc?.cover_i) return null
  return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  // Fetch all books without a cover
  const { data: books, error } = await supabase
    .from('books')
    .select('id, title, author')
    .is('cover_url', null)
    .order('title')

  if (error) {
    console.error('Failed to fetch books:', error.message)
    process.exit(1)
  }

  console.log(`Found ${books.length} books without a cover.\n`)

  let found = 0
  let notFound = 0

  for (let i = 0; i < books.length; i++) {
    const book = books[i]
    process.stdout.write(`[${i + 1}/${books.length}] "${book.title}" ... `)

    try {
      const coverUrl = await searchOpenLibrary(book.title, book.author)

      if (coverUrl) {
        const { error: updateError } = await supabase
          .from('books')
          .update({ cover_url: coverUrl })
          .eq('id', book.id)

        if (updateError) {
          console.log(`ERROR: ${updateError.message}`)
        } else {
          console.log(`✓ found`)
          found++
        }
      } else {
        console.log(`✗ not found`)
        notFound++
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`)
      notFound++
    }

    // Be polite to Open Library — 1 request per second
    if (i < books.length - 1) await sleep(1000)
  }

  console.log(`\nDone. ${found} covers added, ${notFound} not found.`)
  console.log('Books without covers can be updated manually via the Edit button.')
}

main()
