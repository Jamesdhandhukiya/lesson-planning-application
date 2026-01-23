# HOD Paper Rejection Comments Feature - Implementation Guide

## Overview
This feature allows HODs to add detailed comments when rejecting exam papers, and displays these comments to faculty members when they view their paper submission status.

## Features Implemented

### 1. **Rejection Comments Modal** 
- When HOD clicks "Reject" button, a modal appears
- HOD can write detailed feedback/comments explaining the rejection reasons
- Comments are required before rejecting (validation in place)
- Comments are timestamped and attributed to the HOD

### 2. **Comment Storage & History**
- All rejection comments are stored in a new `rejection_comments` table
- Comments are linked to specific paper submissions
- Full audit trail is maintained with timestamps
- Comments are marked as visible to faculty

### 3. **Faculty View of Comments**
- Faculty can see rejection comments in their submission history
- Comments appear in a highlighted red section under rejected submissions
- Shows HOD name, timestamp, and full comment text
- Multiple rejection comments are numbered in reverse chronological order

## Files Created/Modified

### New Files Created:

1. **Database Migration** (`database/rejection_comments.sql`)
   - Creates `rejection_comments` table
   - Implements RLS policies for security
   - Indexes for performance optimization

2. **Rejection Comment Modal** (`components/modals/RejectionCommentModal.tsx`)
   - Modal dialog for HOD to enter comments
   - Required field validation
   - Shows paper details and submission info
   - Loading state during submission

3. **Rejection Comments History** (`components/RejectionCommentsHistory.tsx`)
   - Displays all rejection comments for a submission
   - Shows HOD name and timestamp
   - Styled with red accent for visibility
   - Only renders if submission is rejected

### Modified Files:

1. **fetchForReview.ts** (Actions)
   - Added `rejectSubmissionWithComment()` - Handles rejection and comment storage
   - Added `fetchRejectionComments()` - Retrieves comments for a submission

2. **ReviewAllSubmissions.tsx** (Component)
   - Added rejection modal state management
   - Integrated `RejectionCommentModal` component
   - Updated reject button to open modal instead of direct rejection

3. **uploadpaper/[id]/page.tsx** (Faculty View)
   - Imported `RejectionCommentsHistory` component
   - Added conditional rendering of comments for rejected papers
   - Comments display in submission history section

## How It Works

### HOD Rejection Flow:
1. HOD views exam papers in "Review All Submissions"
2. Clicks the red "Reject" button on any submission
3. `RejectionCommentModal` opens showing:
   - Faculty name
   - File name
   - Comment input box
4. HOD enters detailed rejection reasons
5. Clicks "Reject Paper" to submit
6. Paper status updated to "rejected"
7. Comments stored in database with timestamp

### Faculty View Flow:
1. Faculty navigates to "Moderation > Upload Paper" for their subject
2. Views submission history in "Submission History" section
3. For rejected papers:
   - Status badge shows "rejected"
   - Comment section appears below showing:
     - "Rejection Reasons from HOD" header
     - All comments with HOD name and timestamp
     - Comments numbered in order (#1, #2, etc.)

## Database Schema

### rejection_comments Table:
```sql
- id (UUID, Primary Key)
- created_at (Timestamp)
- submission_id (UUID, Foreign Key → exam_paper_submissions)
- hod_id (UUID, Foreign Key → users)
- comment (TEXT)
- is_visible_to_faculty (BOOLEAN, default: true)
```

### Indexes:
- submission_id (for quick lookup)
- hod_id (for HOD queries)
- created_at (for chronological ordering)

### RLS Policies:
- Faculty can view comments for their own papers
- Only HOD can insert comments
- All comments are queryable by HOD in their department

## Setup Instructions

### 1. Database Setup
Execute the SQL migration:
```bash
# In Supabase SQL Editor, run:
-- Copy contents of database/rejection_comments.sql
```

### 2. No Additional Dependencies
All required components and utilities are already in the project:
- ✅ Dialog component (ui/dialog.tsx)
- ✅ Textarea component (ui/textarea.tsx)
- ✅ Button component (ui/button.tsx)
- ✅ Badge component (ui/badge.tsx)
- ✅ Card component (ui/card.tsx)
- ✅ Toast notifications (sonner)

## Usage

### For HOD:
1. Go to Dashboard > Moderation > Review All Submissions
2. Find the paper to reject
3. Click the red X button
4. Enter comments explaining the rejection
5. Click "Reject Paper"
6. Paper is now marked as rejected with comments stored

### For Faculty:
1. Go to Dashboard > Moderation > Upload Paper
2. Select the subject
3. In "Submission History", find rejected papers
4. View the rejection comments section
5. Understand the feedback and resubmit if needed

## Key Features

✅ **Comment Validation** - Comments are required before rejection
✅ **Timestamp Tracking** - All comments dated and timed
✅ **HOD Attribution** - Comments show which HOD rejected it
✅ **History Preservation** - Multiple rejections can have separate comments
✅ **Role-Based Access** - Faculty only see their own papers' comments
✅ **Visual Clarity** - Red styling highlights rejected status
✅ **Numbered Tracking** - Comments numbered for reference

## Security

- RLS policies ensure faculty only see their papers' comments
- HOD authentication verified before storing comments
- Comments are immutable (audit trail maintained)
- Database access properly scoped by auth_id

## Future Enhancements (Optional)

- Add comment editing capability for HODs
- Add comment deletion with soft-delete
- Email notification to faculty when comments added
- Bulk rejection with template comments
- Comment search and filtering
- Download comments as PDF
- Comment replies/threaded discussions

## Troubleshooting

**Comments not showing?**
- Verify paper status is "rejected" in database
- Check RLS policies are enabled on rejection_comments table
- Confirm Supabase migration executed successfully

**Modal not appearing?**
- Ensure imports are correct in ReviewAllSubmissions.tsx
- Check browser console for JavaScript errors
- Verify Dialog component is imported correctly

**Comments not saving?**
- Check HOD user exists in users table
- Verify submission_id exists in exam_paper_submissions
- Check Supabase service role key has proper permissions
