-- Quick Reference: exam_paper_submissions table schema

-- Table Structure
CREATE TABLE exam_paper_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Relationships
  subject_id UUID NOT NULL (references subjects.id),
  faculty_id UUID NOT NULL (references users.id),
  
  -- Exam Context
  cie_index INTEGER NOT NULL (0-indexed CIE position),
  exam_name TEXT NOT NULL (e.g., "Mathematics - CIE 1"),
  
  -- File Information
  file_name TEXT NOT NULL (original filename),
  file_type TEXT NOT NULL (extension: pdf, doc, docx, etc.),
  file_size INTEGER NOT NULL (bytes),
  storage_path TEXT NOT NULL (path in Supabase storage),
  
  -- Submission Tracking
  submission_order INTEGER NOT NULL (1=initial, 2=first revision, etc.),
  is_latest BOOLEAN DEFAULT true (marks current submission),
  status TEXT DEFAULT 'submitted' (submitted|reviewed|approved|rejected),
  feedback TEXT (HOD/reviewer comments)
);

-- Useful Queries

-- Get all submissions for a faculty member's subject
SELECT * FROM exam_paper_submissions
WHERE subject_id = '...' AND faculty_id = '...'
ORDER BY cie_index, submission_order DESC;

-- Get only latest submissions per CIE
SELECT * FROM exam_paper_submissions
WHERE subject_id = '...' AND faculty_id = '...' AND is_latest = true
ORDER BY cie_index;

-- Get complete history for one CIE
SELECT * FROM exam_paper_submissions
WHERE subject_id = '...' AND faculty_id = '...' AND cie_index = 0
ORDER BY submission_order DESC;

-- Count submissions per exam
SELECT cie_index, COUNT(*) as submission_count, MAX(submission_order) as latest_submission
FROM exam_paper_submissions
WHERE subject_id = '...' AND faculty_id = '...'
GROUP BY cie_index;

-- Find exams with multiple submissions (revisions)
SELECT cie_index, exam_name, COUNT(*) as versions
FROM exam_paper_submissions
WHERE subject_id = '...' AND faculty_id = '...'
GROUP BY cie_index, exam_name
HAVING COUNT(*) > 1;
