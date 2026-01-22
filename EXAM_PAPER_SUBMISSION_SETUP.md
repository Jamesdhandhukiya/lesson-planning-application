# Exam Paper Submissions Feature - Setup Guide

## Overview
This implementation allows faculty to upload exam papers to Supabase with full support for:
- Multiple file uploads per exam (CIE)
- Resubmission capability for corrected papers
- Previous submission history and tracking
- Metadata storage in PostgreSQL database
- File versioning with submission ordering

## Components Created

### 1. Database Schema (`database/exam_paper_submissions.sql`)
- **Table**: `exam_paper_submissions`
- **Purpose**: Stores metadata about uploaded exam papers
- **Key Fields**:
  - `id`: Unique identifier
  - `subject_id`: Links to the subject
  - `faculty_id`: Links to the faculty/user uploading
  - `cie_index`: Index of the CIE exam
  - `exam_name`: Display name (e.g., "Subject - CIE 1")
  - `file_name`: Original file name
  - `file_type`: File extension
  - `file_size`: Size in bytes
  - `storage_path`: Path in Supabase storage
  - `submission_order`: 1 for initial, 2+ for resubmissions
  - `is_latest`: Boolean to mark the current submission
  - `status`: Tracking status (submitted, reviewed, approved, rejected)
  - `feedback`: HOD/reviewer feedback
  - `created_at`, `updated_at`: Timestamps

- **Indexes**: Optimized for quick queries by subject, faculty, and CIE
- **RLS Policies**: Users can only see and manage their own submissions

### 2. API Actions

#### `uploadExamPaper.ts`
Handles file upload to Supabase Storage and database:
- Validates file type (pdf, doc, docx, xls, xlsx, png, jpg, jpeg, webp)
- Enforces 10MB file size limit
- Generates unique file path: `exam-papers/{subjectId}/{subjectCode}/cie-{cieIndex}/{fileName}`
- Marks previous submissions as not latest
- Creates database record with metadata
- Returns submission number (1st, 2nd, 3rd submission, etc.)

#### `fetchExamPapers.ts`
Provides three functions:
1. **`fetchExamPaperSubmissions()`**: Gets all submissions for a subject/faculty combo
2. **`getLatestSubmissions()`**: Gets only the latest submission per CIE
3. **`getAllSubmissionsForCIE()`**: Gets full history for a specific CIE

### 3. UI Component Updates (`uploadpaper/[id]/page.tsx`)

Enhanced upload interface with:
- File selection with drag-and-drop support
- Real-time upload with progress indication
- **Submission History Section**: Shows all previous submissions for current CIE
  - Displays submission number, date, time
  - Shows "Latest" badge for current submission
  - Shows status badges (submitted, reviewed, etc.)
  - Displays feedback from HOD/reviewers
  - Download button for each submission
- **Comments Section**: Existing HOD feedback display

## Setup Instructions

### Step 1: Create Supabase Storage Bucket
1. Go to Supabase Dashboard
2. Navigate to Storage → Buckets
3. Create new bucket named `exam-papers`
4. Set visibility to **Private**
5. Configure RLS policies:
   ```sql
   -- Allow authenticated users to upload files
   create policy "Allow users to upload exam papers"
   on storage.objects for insert
   with check (bucket_id = 'exam-papers' AND auth.role() = 'authenticated');
   
   -- Allow users to read their own files
   create policy "Allow users to read own exam papers"
   on storage.objects for select
   using (bucket_id = 'exam-papers' AND auth.uid() = (storage.foldername(name))[2]::uuid);
   ```

### Step 2: Create Database Table
Run the SQL from `database/exam_paper_submissions.sql` in Supabase SQL Editor:
```bash
# Copy and paste the entire contents of database/exam_paper_submissions.sql
```

### Step 3: Verify Storage Configuration
In Supabase Dashboard:
1. Check Storage > Buckets > exam-papers exists
2. Verify CORS settings allow your domain
3. Test file upload from the application

## Usage Flow

### For Faculty (Uploading Papers)
1. Navigate to Moderation > Subject > Upload Paper
2. Select a CIE from the tabs
3. Click "Click to choose file" or drag-drop a file
4. Click "Upload File"
5. File uploads to Supabase and metadata saved
6. Previous submissions display in "Submission History"
7. Can reupload for same CIE (new submission number assigned)

### For HOD/Reviewers (Viewing Submissions)
1. Navigate to Moderation dashboard
2. Select subject and upload paper section
3. Can view all submission history
4. Can download any previous submission
5. (Optional: Add feedback/status update feature)

## File Organization in Storage

```
exam-papers/
├── {subjectId}/
│   ├── {subjectCode}/
│   │   ├── cie-1/
│   │   │   ├── 1704067200000-a3b2c1-paper.pdf
│   │   │   └── 1704067300000-x7y8z9-paper_revised.pdf
│   │   ├── cie-2/
│   │   └── cie-3/
```

## Database Features

### Tracking Resubmissions
- Each resubmission increments `submission_order`
- Previous submissions have `is_latest = false`
- Current submission has `is_latest = true`
- Facilitates "Show all versions" feature

### Status Tracking
- Default: `'submitted'`
- Can be updated to: `'reviewed'`, `'approved'`, `'rejected'`
- Feedback can be added for corrections

### RLS Security
- Each faculty member can only view/upload their own submissions
- Admins need separate policies (can be added if needed)

## Future Enhancements

1. **Feedback System**: HOD can add comments/feedback
2. **Approval Workflow**: Mark submissions as approved/rejected
3. **Bulk Download**: Download all submissions for an exam
4. **Automatic Versioning**: Keep full version history with diffs
5. **Analytics**: Track submission trends and revision counts

## Key Points

✅ Multiple files per exam - Fully supported
✅ Resubmission support - Submit as many times as needed
✅ Previous submission storage - All versions kept in database
✅ File organization - Organized by subject, subject code, and CIE
✅ Download previous - Each submission has a download link
✅ Metadata tracking - Submission order, timestamps, file info
✅ Security - RLS policies and file validation
