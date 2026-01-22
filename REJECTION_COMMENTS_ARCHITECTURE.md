# Rejection Comments System - Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    LESSON PLANNING APPLICATION                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   HOD (Head of Department)               │   │
│  │                                                          │   │
│  │  Dashboard → Moderation → Review All Submissions        │   │
│  │                              │                          │   │
│  │                              ├─ Click [X] Reject       │   │
│  │                              │                          │   │
│  │                    ┌─────────▼──────────┐              │   │
│  │                    │ RejectionComment   │              │   │
│  │                    │ Modal Opens        │              │   │
│  │                    │ - Faculty Name     │              │   │
│  │                    │ - File Name        │              │   │
│  │                    │ - [Comment Box]    │              │   │
│  │                    │ - [Reject Paper]   │              │   │
│  │                    └─────────┬──────────┘              │   │
│  │                              │                          │   │
│  │                    Enter Comments & Submit              │   │
│  │                              │                          │   │
│  │                              ▼                          │   │
│  │                    rejectSubmissionWithComment()        │   │
│  │                    (Server Action)                      │   │
│  │                              │                          │   │
│  └──────────────────────────────┼──────────────────────────┘   │
│                                  │                              │
│  ┌──────────────────────────────┴──────────────────────────┐   │
│  │                  SUPABASE DATABASE                      │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │   exam_paper_submissions Table                 │   │   │
│  │  │  ┌──────────────────────────────────────────┐  │   │   │
│  │  │  │ id: UUID                                 │  │   │   │
│  │  │  │ status: "rejected" ◄──── Updated        │  │   │   │
│  │  │  │ faculty_id: UUID                         │  │   │   │
│  │  │  │ submission_id: ...                       │  │   │   │
│  │  │  └──────────────────────────────────────────┘  │   │   │
│  │  └──────────────────────────┬─────────────────────┘   │   │
│  │                              │                        │   │
│  │  ┌──────────────────────────▼─────────────────────┐   │   │
│  │  │   rejection_comments Table (NEW)               │   │   │
│  │  │  ┌──────────────────────────────────────────┐  │   │   │
│  │  │  │ id: UUID                                 │  │   │   │
│  │  │  │ submission_id: UUID ◄── Reference       │  │   │   │
│  │  │  │ hod_id: UUID ◄──────── HOD who rejected │  │   │   │
│  │  │  │ comment: TEXT ◄──────── Rejection reason│  │   │   │
│  │  │  │ created_at: TIMESTAMP ◄ Auto timestamp  │  │   │   │
│  │  │  │ is_visible_to_faculty: true             │  │   │   │
│  │  │  └──────────────────────────────────────────┘  │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────┴────────────────────────────────┐  │
│  │                  FACULTY MEMBER                           │  │
│  │                                                           │  │
│  │  Dashboard → Moderation → Upload Paper                  │  │
│  │                            │                            │  │
│  │                  Submission History ◄───┐               │  │
│  │                            │             │               │  │
│  │                  [File] [Latest] [Status]               │  │
│  │                  Paper.pdf                              │  │
│  │                  ✓ Latest ⚠ rejected   ◄ Status Badge   │  │
│  │                  Submitted #2 on Date                   │  │
│  │                            │                            │  │
│  │          ┌─────────────────▼────────────────┐           │  │
│  │          │ Rejection Reasons from HOD       │           │  │
│  │          │                                  │           │  │
│  │          │ #1: Dr. Smith - Date Time       │ ◄─────────┤  │
│  │          │ "Your question patterns don't   │ Fetched by│  │
│  │          │  align with course objectives..." │ Component  │  │
│  │          │                                  │           │  │
│  │          └──────────────────────────────────┘           │  │
│  │                                                           │  │
│  │  RejectionCommentsHistory Component                      │  │
│  │  → Calls fetchRejectionComments()                       │  │
│  │  → Displays all historical comments                     │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### HOD Rejection Flow
```
START
  │
  ├─ HOD Views: ReviewAllSubmissions Component
  │
  ├─ Paper Status: "sent-for-review"
  │   └─ Reject Button Visible [X]
  │
  ├─ HOD Clicks [X] Reject
  │   └─ Call: handleReject(submission)
  │
  ├─ State Update
  │   ├─ setRejectionSubmission(submission)
  │   └─ setShowRejectionModal(true)
  │
  ├─ RejectionCommentModal Renders
  │   ├─ Shows: Faculty Name, File Name
  │   ├─ Has: Comment Textarea
  │   └─ Button: "Reject Paper" (disabled until comment)
  │
  ├─ HOD Enters Comments
  │   └─ Example: "Question patterns need revision. References incomplete."
  │
  ├─ HOD Clicks "Reject Paper"
  │   └─ Call: handleRejectionCommentSubmit()
  │
  ├─ Server Action Called
  │   └─ rejectSubmissionWithComment(submissionId, comment, hodAuthId)
  │
  ├─ Database Operations (Server)
  │   ├─ 1. Get HOD user ID from auth_id
  │   │   └─ Query: SELECT id FROM users WHERE auth_id = hodAuthId
  │   │
  │   ├─ 2. Update paper status to "rejected"
  │   │   └─ UPDATE exam_paper_submissions SET status = 'rejected'
  │   │
  │   └─ 3. Insert comment in history
  │       └─ INSERT INTO rejection_comments (submission_id, hod_id, comment, ...)
  │           VALUES (subId, hodId, comment, now(), true)
  │
  ├─ Response Returned to Client
  │   └─ { success: true, data: commentData }
  │
  ├─ Frontend Updates
  │   ├─ Update submissions state
  │   ├─ Close modal
  │   └─ Show toast: "Paper rejected with comments"
  │
  └─ END (Paper now Rejected with Comments Stored)
```

### Faculty View Flow
```
START
  │
  ├─ Faculty Views: Upload Paper Page
  │
  ├─ Component Loads Submissions
  │   └─ Call: fetchExamPaperSubmissions(subjectId, facultyId)
  │
  ├─ Display Submission History
  │   │
  │   ├─ Submission #2
  │   │   ├─ File: Paper.pdf
  │   │   ├─ Status: submitted
  │   │   └─ Latest ✓
  │   │
  │   └─ Submission #1
  │       ├─ File: Paper_v1.pdf
  │       ├─ Status: rejected ⚠
  │       │   └─ Status !== 'submitted' → Show Badge
  │       │
  │       └─ Check: submission.status === 'rejected'
  │           └─ Render: <RejectionCommentsHistory submissionId={id} />
  │
  ├─ RejectionCommentsHistory Component
  │   │
  │   ├─ useEffect Triggered
  │   │
  │   ├─ Call: fetchRejectionComments(submissionId)
  │   │   │
  │   │   └─ Server Action
  │   │       ├─ Query: SELECT * FROM rejection_comments
  │   │       │           WHERE submission_id = {submissionId}
  │   │       │           AND is_visible_to_faculty = true
  │   │       │           ORDER BY created_at DESC
  │   │       │
  │   │       ├─ Join with users table for HOD info
  │   │       │
  │   │       └─ Return: Array of comments
  │   │
  │   ├─ Display Comments
  │   │   │
  │   │   ├─ Section Header: "Rejection Reasons from HOD"
  │   │   │
  │   │   ├─ For Each Comment:
  │   │   │   │
  │   │   │   ├─ Card (Red Background)
  │   │   │   │   ├─ #1: Dr. Smith (HOD)
  │   │   │   │   ├─ Date: 2024-01-22 14:30:45
  │   │   │   │   │
  │   │   │   │   └─ Comment Text:
  │   │   │   │       "Your exam questions don't properly evaluate
  │   │   │   │        the learning outcomes. Please revise..."
  │   │   │   │
  │   │   │   └─ [Next Comment if exists]
  │   │
  │   └─ Show Loading/Error States as Needed
  │
  └─ END (Faculty Sees Rejection Comments & Context)
```

---

## Database Relationships

```
┌──────────────────────────┐
│       users              │
├──────────────────────────┤
│ id (PK) ◄────────────┐   │
│ auth_id              │   │
│ name                 │   │
│ email                │   │
└──────────────────────┼───┘
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
    │ (hod_id)         │ (faculty_id)    │
    │                  │                  │
┌───▼──────────────────────────┐    ┌─────▼──────────────────┐
│ rejection_comments           │    │ exam_paper_submissions │
├─────────────────────────────┤    ├──────────────────────────┤
│ id (PK)                     │    │ id (PK)                │
│ submission_id (FK) ┐        │    │ subject_id             │
│                    │        │    │ faculty_id ────────────┤─ (Reference)
│ hod_id (FK) ──────────┐     │    │ status                 │
│ comment             │     │    │ created_at             │
│ created_at          │     │    │ feedback               │
│ is_visible_to_faculty       │    └─────┬──────────────────┘
│                    │     │            │
└────────────────────┼─────┤──────────────┘
                     │     │
                     └─────┘ (Foreign Key Constraint)
```

---

## Component Hierarchy

```
ReviewAllSubmissions
│
├─ State Management
│  ├─ submissions[]
│  ├─ showRejectionModal (boolean)
│  └─ rejectionSubmission (Submission | null)
│
├─ Conditional Rendering
│  │
│  ├─ IF showRejectionModal === true
│  │  │
│  │  └─ RejectionCommentModal
│  │     ├─ Props:
│  │     │  ├─ isOpen
│  │     │  ├─ onClose
│  │     │  ├─ submissionId
│  │     │  ├─ facultyName
│  │     │  ├─ fileName
│  │     │  ├─ onCommentSubmitted
│  │     │  └─ onSubmitComment
│  │     │
│  │     └─ Internal State:
│  │        ├─ comment (string)
│  │        └─ isSubmitting (boolean)
│  │
│  └─ ExamDetailsModal (existing)
│
├─ Main Content
│  │
│  └─ Grouped Submissions by Subject
│     │
│     └─ For Each Submission:
│        │
│        ├─ Submission Card
│        │  ├─ Faculty Info
│        │  ├─ Status Badge
│        │  ├─ Action Buttons
│        │  │
│        │  └─ IF status === "sent-for-review"
│        │     ├─ [✓] Approve Button
│        │     └─ [X] Reject Button
│        │        └─ onClick → handleReject(submission)
│        │           └─ Opens RejectionCommentModal
│        │
│        └─ Submit History (New Papers)
│           │
│           └─ Submission History Section
│              │
│              ├─ File Name
│              ├─ Status Badge
│              ├─ Created Date/Time
│              │
│              └─ IF status === "rejected"
│                 │
│                 └─ RejectionCommentsHistory
│                    │
│                    ├─ useEffect: Load comments
│                    │  └─ fetchRejectionComments(submissionId)
│                    │
│                    └─ Display: Comments Section
│                       ├─ Header: "Rejection Reasons from HOD"
│                       └─ Comment Cards (Red)
│                          ├─ #1: HOD Name
│                          ├─ Timestamp
│                          └─ Comment Text
```

---

## Request/Response Flow

### Request: Reject Paper with Comments
```
CLIENT SIDE
┌─────────────────────────────────────────────────┐
│ reviewAllSubmissions.tsx                        │
│                                                 │
│ handleReject(submission)                        │
│   ↓                                             │
│ setRejectionSubmission(submission)              │
│ setShowRejectionModal(true)                     │
│   ↓                                             │
│ <RejectionCommentModal /> renders               │
│   ↓                                             │
│ User types comment & clicks "Reject Paper"      │
│   ↓                                             │
│ handleRejectionCommentSubmit()                  │
│   ↓                                             │
│ await rejectSubmissionWithComment(              │
│   submissionId,                                 │
│   comment,                                      │
│   userId (auth_id)                             │
│ )                                               │
└────────────────────┬────────────────────────────┘
                     │
                     │ Server Action (Server Side)
                     ▼
┌─────────────────────────────────────────────────┐
│ fetchForReview.ts                               │
│                                                 │
│ rejectSubmissionWithComment()                   │
│   ↓                                             │
│ 1. Get HOD user ID                              │
│    Query: SELECT id FROM users                  │
│            WHERE auth_id = hodAuthId            │
│   ↓                                             │
│ 2. Update paper status                          │
│    UPDATE exam_paper_submissions                │
│    SET status = 'rejected'                      │
│    WHERE id = submissionId                      │
│   ↓                                             │
│ 3. Insert comment                               │
│    INSERT INTO rejection_comments               │
│    (submission_id, hod_id, comment, ...)        │
│   ↓                                             │
│ Return: { success: true, data: commentData }    │
└────────────────────┬────────────────────────────┘
                     │
                     │ Response
                     ▼
┌─────────────────────────────────────────────────┐
│ Client Receives Response                        │
│   ↓                                             │
│ Update submissions state                        │
│   ↓                                             │
│ Close modal                                     │
│   ↓                                             │
│ Show success toast                              │
│   ↓                                             │
│ UI Re-renders                                   │
│   └─ Paper now shows "rejected" status          │
└─────────────────────────────────────────────────┘
```

### Request: Fetch Rejection Comments
```
CLIENT SIDE
┌─────────────────────────────────────────────────┐
│ RejectionCommentsHistory.tsx                    │
│                                                 │
│ useEffect(() => {                               │
│   await fetchRejectionComments(submissionId)    │
│ }, [submissionId])                              │
└────────────────────┬────────────────────────────┘
                     │
                     │ Server Action
                     ▼
┌─────────────────────────────────────────────────┐
│ fetchForReview.ts                               │
│                                                 │
│ fetchRejectionComments(submissionId)            │
│   ↓                                             │
│ Query rejection_comments table                  │
│ WHERE submission_id = submissionId              │
│   AND is_visible_to_faculty = true              │
│ ORDER BY created_at DESC                        │
│   ↓                                             │
│ Join with users table for HOD info              │
│   ↓                                             │
│ Return: Array of comments with HOD details      │
└────────────────────┬────────────────────────────┘
                     │
                     │ Response
                     ▼
┌─────────────────────────────────────────────────┐
│ RejectionCommentsHistory.tsx                    │
│                                                 │
│ setComments(result.data)                        │
│   ↓                                             │
│ Map over comments array                         │
│   ↓                                             │
│ Display each comment in Card component          │
│   └─ Show HOD name, timestamp, text             │
└─────────────────────────────────────────────────┘
```

---

## Security Flow

```
┌─────────────────────────────────────────────────────────┐
│                    RLS (Row Level Security)             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Policy 1: Faculty View Their Papers' Comments         │
│  ┌────────────────────────────────────────────────┐    │
│  │ FOR SELECT on rejection_comments               │    │
│  │ USING (                                        │    │
│  │   (SELECT faculty_id FROM exam_paper_submissions │   │
│  │    WHERE id = submission_id) =                 │    │
│  │   (SELECT id FROM users                        │    │
│  │    WHERE auth_id = current_user_id())          │    │
│  │ )                                              │    │
│  │                                                │    │
│  │ Result: Faculty can only see comments          │    │
│  │         for papers THEY submitted              │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Policy 2: HOD Insert Comments                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ FOR INSERT on rejection_comments               │    │
│  │ WITH CHECK (                                   │    │
│  │   (SELECT id FROM users                        │    │
│  │    WHERE auth_id = current_user_id()) = hod_id │   │
│  │ )                                              │    │
│  │                                                │    │
│  │ Result: Only the HOD being inserted can       │    │
│  │         insert (verified by current auth)     │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Policy 3: HOD View All Comments                       │
│  ┌────────────────────────────────────────────────┐    │
│  │ FOR SELECT on rejection_comments               │    │
│  │ USING (true)                                   │    │
│  │                                                │    │
│  │ Result: HOD can view all rejection comments    │    │
│  │         in their department                    │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Key Implementation Details

### Modal Validation
```
Comment Submission Flow:
  ↓
Check: comment.trim() !== ""
  ├─ IF empty: Show toast "Enter comment"
  └─ IF valid: Enable submit button
  ↓
Click "Reject Paper"
  ↓
setIsSubmitting(true)
  ↓
Call: rejectSubmissionWithComment()
  ├─ Server validates all IDs exist
  ├─ Updates database atomically
  └─ Returns result
  ↓
setIsSubmitting(false)
  ↓
IF success:
  ├─ Show success toast
  ├─ Clear comment state
  ├─ Close modal
  └─ Call onCommentSubmitted()
ELSE:
  └─ Show error toast
```

### Comment Display
```
IF submission.status === 'rejected':
  ├─ Show status badge "rejected"
  ├─ RejectionCommentsHistory renders
  │   ├─ Fetch comments (async)
  │   ├─ IF loading: Show spinner
  │   ├─ IF error: Show error message
  │   ├─ IF empty: Return null (no comments)
  │   └─ IF comments:
  │       ├─ Show header
  │       └─ Map comments array
  │           └─ For each: Show Card with details
  │
ELSE:
  └─ Don't render comment section
```

---

This architecture ensures:
✅ **Security** - RLS policies prevent unauthorized access
✅ **Performance** - Indexes on frequently queried columns
✅ **Auditability** - All comments timestamped and attributed
✅ **Scalability** - Efficient database queries
✅ **UX** - Clear feedback and visual hierarchy
