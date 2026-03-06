-- TTLibrary — Add rating and review to reading_status
-- Run this in the Supabase SQL editor AFTER 001 and 002

alter table reading_status
  add column rating smallint check (rating >= 1 and rating <= 10),
  add column review text;
