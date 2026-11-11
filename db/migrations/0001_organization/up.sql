-- One row per organization that uses this instance. Every other table carries an
-- organization_id that points here (test/schema.test.ts enforces that).
create table organization (
  id uuid primary key default gen_random_uuid(),
  -- The name shown to people, for example in the page header and the email footer.
  label text not null,
  created_at timestamptz not null default now()
);
