# Rejection Comments Feature - Quick Reference

## What's New

### For HOD (Head of Department)
When rejecting an exam paper:

```
1. Click "Reject" button on paper
   ↓
2. Modal opens: "Reject Paper with Comments"
   ├─ Shows: Faculty Name, File Name
   ├─ Has: Large text area for comments
   └─ Button: "Reject Paper"
   ↓
3. Enter detailed feedback
   ↓
4. Click "Reject Paper"
   ↓
5. Paper marked as REJECTED
   Comment stored with timestamp
```

### For Faculty
When viewing rejected papers:

```
Submission History
├─ Latest Submission
│  ├─ Status: [REJECTED badge]
│  ├─ Date & Time
│  └─ Rejection Reasons from HOD section
│     └─ #1: [HOD Name] on [Date] [Time]
│        "[Full comment text...]"
└─ Previous Submissions
```

## Files Changed

| File | Change | Impact |
|------|--------|--------|
| `database/rejection_comments.sql` | ✨ NEW | Database table for storing comments |
| `components/modals/RejectionCommentModal.tsx` | ✨ NEW | Modal UI for HOD to enter comments |
| `components/RejectionCommentsHistory.tsx` | ✨ NEW | Display component for faculty view |
| `app/dashboard/actions/fetchForReview.ts` | 📝 MODIFIED | Added 2 new functions for comment operations |
| `components/ReviewAllSubmissions.tsx` | 📝 MODIFIED | Integrated modal, changed reject flow |
| `app/dashboard/Moderation/uploadpaper/[id]/page.tsx` | 📝 MODIFIED | Added rejection comments display |

## New API Functions

### `rejectSubmissionWithComment(submissionId, comment, hodAuthId)`
**Purpose:** Reject a paper and store HOD's comments
**Returns:** `{ success: boolean, data?: any, error?: string }`
**Called by:** ReviewAllSubmissions component

### `fetchRejectionComments(submissionId)`
**Purpose:** Fetch all rejection comments for a submission
**Returns:** `{ success: boolean, data?: RejectionComment[], error?: string }`
**Called by:** RejectionCommentsHistory component

## Database Changes

### New Table: `rejection_comments`
```
Columns:
- id (UUID, Primary Key)
- created_at (auto-timestamp)
- submission_id (FK to exam_paper_submissions)
- hod_id (FK to users)
- comment (TEXT - max 5000 chars)
- is_visible_to_faculty (boolean)

Indexes:
- submission_id
- hod_id
- created_at

RLS Policies:
✓ Faculty can view their own papers' comments
✓ HOD can insert and view all comments
```

## Workflow

### HOD Rejection Process
```
ReviewAllSubmissions Page
    ↓
[Reject Button] → Opens RejectionCommentModal
    ↓
HOD enters comment + clicks "Reject Paper"
    ↓
rejectSubmissionWithComment() called:
  1. Get HOD user ID from auth_id
  2. Update paper status to "rejected"
  3. Insert comment in rejection_comments table
    ↓
Paper status updated in UI
Toast: "Paper rejected with comments"
Modal closes
```

### Faculty View Process
```
Upload Paper Page (Faculty)
    ↓
View Submission History
    ↓
For each rejected submission:
    ↓
RejectionCommentsHistory component loads:
  1. Calls fetchRejectionComments(submissionId)
  2. Displays all comments
  3. Shows HOD name, date, time, text
    ↓
Faculty reads feedback
```

## Key Features Implemented

✅ **Modal-Based Comment Entry**
   - Appears only when reject is clicked
   - Required field validation
   - Clear instructions

✅ **Comment Storage**
   - Database persisted
   - Timestamped automatically
   - HOD attribution included
   - Multi-comment support

✅ **Faculty Display**
   - Shows in submission history
   - Color-coded red for visibility
   - Chronological order (newest first)
   - Number tracking for reference

✅ **Security**
   - RLS enforced at database level
   - Auth verification before storage
   - Faculty-scoped access control

## Testing Checklist

- [ ] HOD can click reject button
- [ ] Modal appears with correct paper info
- [ ] Comment field is required
- [ ] Submit button disabled until comment entered
- [ ] Paper status changes to "rejected"
- [ ] Comment saves to database
- [ ] Faculty sees comment in submission history
- [ ] Comment shows HOD name and timestamp
- [ ] Multiple rejections show all comments
- [ ] Non-rejected papers don't show comment section

## Deployment Checklist

1. [ ] Run database migration (rejection_comments.sql)
2. [ ] Restart Next.js server
3. [ ] Clear browser cache
4. [ ] Test as HOD user
5. [ ] Test as Faculty user
6. [ ] Verify timestamps are correct
7. [ ] Check database entries in Supabase
