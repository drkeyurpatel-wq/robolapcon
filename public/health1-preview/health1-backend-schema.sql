-- ============================================================
-- Health1 Website Backend Schema — Supabase / Postgres
-- Run this in your Supabase project's SQL Editor.
-- Matches the pattern already used across RoboLapCon, H1 Connect, LAB1.
-- ============================================================

-- Enable UUID generation (usually already on in Supabase)
create extension if not exists "pgcrypto";

-- ---------- 1. Appointments ----------
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  patient_name text not null,
  phone text not null,
  email text,
  branch text not null,               -- Shilaj, Vastral, Gandhinagar, Himmatnagar, Modasa, Udaipur
  department text not null,           -- specialty selected
  doctor_name text,                   -- optional, if patient picked a specific doctor
  preferred_date date,
  preferred_time text,                -- 'Morning' | 'Evening' | free text
  is_existing_patient boolean default false,
  notes text,
  status text default 'pending',      -- pending | confirmed | cancelled | completed
  source text default 'website',      -- website | chatbot | whatsapp
  whatsapp_confirmation_sent boolean default false
);

-- ---------- 2. Contact Messages ----------
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  phone text not null,
  email text,
  branch_preference text,
  message text,
  status text default 'new'           -- new | read | responded
);

-- ---------- 3. Second Opinion Requests ----------
create table if not exists second_opinion_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  patient_name text not null,
  phone text not null,
  email text,
  condition_summary text,
  existing_diagnosis text,
  preferred_specialist text,
  status text default 'new'           -- new | under_review | responded
);

-- ---------- 4. Newsletter Subscribers ----------
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  email text not null unique,
  source text default 'website',
  unsubscribed boolean default false
);

-- ---------- 5. Chatbot Leads ----------
create table if not exists chatbot_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  intent text not null,               -- book | insurance | branch | emergency
  phone text,
  message text,
  page_url text,                      -- which page the chat happened on
  status text default 'new'
);

-- ---------- 6. Career Applications ----------
create table if not exists career_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  applicant_name text not null,
  phone text not null,
  email text not null,
  role_interest text,
  branch_preference text,
  message text,
  status text default 'new'
);

-- ============================================================
-- Row Level Security — public forms can INSERT, nothing else.
-- Reading/updating leads requires an authenticated staff role,
-- configured separately in your Supabase auth setup.
-- ============================================================

alter table appointments enable row level security;
alter table contact_messages enable row level security;
alter table second_opinion_requests enable row level security;
alter table newsletter_subscribers enable row level security;
alter table chatbot_leads enable row level security;
alter table career_applications enable row level security;

-- Anonymous (public website) users may INSERT only — never read other patients' data.
create policy "public_insert_appointments" on appointments
  for insert to anon with check (true);

create policy "public_insert_contact" on contact_messages
  for insert to anon with check (true);

create policy "public_insert_second_opinion" on second_opinion_requests
  for insert to anon with check (true);

create policy "public_insert_newsletter" on newsletter_subscribers
  for insert to anon with check (true);

create policy "public_insert_chatbot_leads" on chatbot_leads
  for insert to anon with check (true);

create policy "public_insert_careers" on career_applications
  for insert to anon with check (true);

-- Staff (authenticated) reads: add policies here once you set up
-- staff auth, e.g.:
-- create policy "staff_read_appointments" on appointments
--   for select to authenticated using (true);

-- ============================================================
-- Indexes for the queries your team will actually run
-- ============================================================
create index if not exists idx_appointments_branch on appointments(branch);
create index if not exists idx_appointments_status on appointments(status);
create index if not exists idx_appointments_created on appointments(created_at desc);
create index if not exists idx_contact_status on contact_messages(status);
create index if not exists idx_second_opinion_status on second_opinion_requests(status);
