-- Drop existing table if it exists (preserves data if needed)
-- Uncomment the line below only if you want to start fresh
-- drop table if exists public.exam_paper_submissions cascade;

-- Table to store exam paper submissions
create table if not exists public.exam_paper_submissions (
  id uuid not null default extensions.uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Foreign keys for subject and exam context
  subject_id uuid not null references public.subjects(id) on delete cascade,
  faculty_id uuid not null references public.users(id) on delete cascade,
  
  -- CIE/Exam context
  cie_index integer not null,
  exam_name text not null,
  
  -- File information
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  storage_path text not null,
  
  -- Submission metadata
  submission_order integer not null,
  is_latest boolean default true,
  status text default 'submitted',
  feedback text
);

-- Create indexes for faster queries (idempotent)
create index if not exists idx_exam_papers_subject_id on public.exam_paper_submissions using btree (subject_id);
create index if not exists idx_exam_papers_faculty_id on public.exam_paper_submissions using btree (faculty_id);
create index if not exists idx_exam_papers_cie_index on public.exam_paper_submissions using btree (cie_index);
create index if not exists idx_exam_papers_subject_faculty on public.exam_paper_submissions using btree (subject_id, faculty_id);
create index if not exists idx_exam_papers_is_latest on public.exam_paper_submissions using btree (is_latest);
create index if not exists idx_exam_papers_created_at on public.exam_paper_submissions using btree (created_at);

-- Enable RLS
alter table public.exam_paper_submissions enable row level security;

-- Drop existing policies if they exist (to avoid conflicts)
drop policy if exists "Users can view their own exam submissions" on public.exam_paper_submissions;
drop policy if exists "Users can insert their own exam submissions" on public.exam_paper_submissions;
drop policy if exists "Users can update their own exam submissions" on public.exam_paper_submissions;

-- Create RLS policies
create policy "Users can view their own exam submissions" on public.exam_paper_submissions
  for select
  using (auth.uid() = faculty_id);

create policy "Users can insert their own exam submissions" on public.exam_paper_submissions
  for insert
  with check (auth.uid() = faculty_id);

create policy "Users can update their own exam submissions" on public.exam_paper_submissions
  for update
  using (auth.uid() = faculty_id);
