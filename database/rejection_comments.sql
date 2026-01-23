-- Create table to store rejection comments history
create table if not exists public.rejection_comments (
  id uuid not null default extensions.uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Foreign keys
  submission_id uuid not null references public.exam_paper_submissions(id) on delete cascade,
  hod_id uuid not null references public.users(id) on delete cascade,
  
  -- Comment content
  comment text not null,
  
  -- Metadata
  is_visible_to_faculty boolean default true
);

-- Create indexes for faster queries (idempotent)
create index if not exists idx_rejection_comments_submission_id on public.rejection_comments using btree (submission_id);
create index if not exists idx_rejection_comments_hod_id on public.rejection_comments using btree (hod_id);
create index if not exists idx_rejection_comments_created_at on public.rejection_comments using btree (created_at);

-- Enable RLS
alter table public.rejection_comments enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view rejection comments for their papers" on public.rejection_comments;
drop policy if exists "HOD can insert rejection comments" on public.rejection_comments;
drop policy if exists "HOD can view all rejection comments in department" on public.rejection_comments;

-- Create simple RLS policies (security enforced at application level)
-- Allow authenticated users to view comments
create policy "Allow viewing rejection comments" on public.rejection_comments
  for select
  using (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert comments
create policy "Allow inserting rejection comments" on public.rejection_comments
  for insert
  with check (auth.uid() IS NOT NULL);
