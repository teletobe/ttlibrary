-- TTLibrary — Add language and country to books
-- Run this in the Supabase SQL editor

alter table books
  add column language text,
  add column country  text;
