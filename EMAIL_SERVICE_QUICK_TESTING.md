# Email Service - Quick Testing Guide

## 🚀 Quick Start (5 Minutes)

### 1. Add to `.env.local` in project root:

```env
RESEND_API_KEY=re_your_key_from_resend_dashboard
RESEND_FROM_EMAIL=onboarding@resend.dev
USE_TEST_EMAILS=true
TEST_FACULTY_EMAIL=your-email@example.com
TEST_HOD_EMAIL=your-email@example.com
```

### 2. Restart development server:

```bash
npm run dev
```

### 3. Test the three workflows:

| # | Workflow | Steps | Expected Email |
|---|----------|-------|-----------------|
| 1 | Faculty Submits Paper | Login as Faculty → Submit exam paper | HOD receives: "Faculty [Name] has submitted a paper..." |
| 2 | HOD Approves | Login as HOD → Open paper → Click Approve | Faculty receives: "Your paper has been ACCEPTED" |
| 3 | HOD Rejects | Login as HOD → Open paper → Click Reject + Add comments | Faculty receives: "Your paper has been REJECTED. Remarks: [comments]" |

---

## 📧 Test Email Samples

### Email 1: Paper Submission (to HOD)
```
Subject: New Paper Submission - Database Design (CSE)

Dear HOD,

Faculty member Dr. John Smith has submitted an exam paper for Database Design 
verification in the CSE department.

Action Required: Please review the submitted paper in the dashboard and provide feedback.

---
Lesson Planning Application
```

### Email 2: Approval (to Faculty)
```
Subject: Paper Approved - Database Design

Dear Dr. John Smith,

Your exam paper for Database Design (CSE) has been ACCEPTED by the Head of Department.

Status: Your submission is approved and can proceed to the next stage.

---
Lesson Planning Application
```

### Email 3: Rejection (to Faculty)
```
Subject: Revision Required - Database Design

Dear Dr. John Smith,

Your exam paper for Database Design (CSE) has been REJECTED by the Head of Department and requires revision.

HOD Remarks (Dr. Jane Doe):
The question paper lacks diversity in question types. Please include:
- More application-based questions
- Better time distribution
- Clearer marking scheme

Next Steps: Please revise your paper according to the remarks above and resubmit through the dashboard.

---
Lesson Planning Application
```

---

## 🎯 Testing Checklist

- [ ] Resend account created at https://resend.com
- [ ] API key generated and added to `.env.local`
- [ ] `.env.local` has test email addresses
- [ ] `npm run dev` started successfully
- [ ] Can submit paper as faculty → check email for HOD notification
- [ ] Can approve as HOD → check email for faculty approval
- [ ] Can reject with comments as HOD → check email for faculty rejection

---

## 🔧 Verifying Setup

### Check if emails are being sent:

1. Open browser console (F12)
2. Look for logs like:
   ```
   [TEST] HOD notification sent to test.hod@example.com
   [PRODUCTION] Approval email sent to faculty@university.edu
   ```

3. Check server logs in terminal for:
   ```
   HOD notification email sent successfully
   Approval email sent successfully
   Rejection email sent successfully
   ```

### If emails aren't arriving:

1. Check spam/junk folder
2. Verify test email addresses are correct in `.env.local`
3. Check `USE_TEST_EMAILS=true` is set (during testing)
4. Verify `RESEND_API_KEY` is correct
5. Restart `npm run dev`

---

## 📊 Database Requirements

For emails to work properly, ensure:

- ✅ Faculty have valid emails in `users` table
- ✅ HODs have valid emails in `users` table
- ✅ HODs are assigned to departments in `user_role` table (role_name='HOD', depart_id set)
- ✅ Subjects have correct `department_id` assigned
- ✅ Papers are linked to faculty and subjects correctly

---

## 🌍 Switching to Production

Once testing is complete:

1. Update `.env.local`:
   ```env
   USE_TEST_EMAILS=false
   # Ensure RESEND_API_KEY and RESEND_FROM_EMAIL are production values
   ```

2. Verify all faculty and HOD emails in database are valid

3. Test again with real emails

4. Monitor Resend dashboard for delivery status

---

## 🔗 Useful Links

- **Resend Dashboard**: https://dashboard.resend.com
- **Resend API Docs**: https://resend.com/docs
- **Email Service Code**: `services/emailService.ts`
- **Integration in Actions**: 
  - Submission: `app/dashboard/actions/sendForReview.ts`
  - Approval/Rejection: `app/dashboard/actions/fetchForReview.ts`

---

## ⚡ Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| No email received | Check spam folder, verify email in `.env.local` |
| "Email not configured" error | Verify `RESEND_API_KEY` is set |
| All emails go to same address | `USE_TEST_EMAILS=true` is set (expected during testing) |
| Wrong department HOD gets email | Check subject's `department_id` and HOD's `depart_id` match |
| Emails won't send in production | Verify `USE_TEST_EMAILS=false` and faculty/HOD emails exist |

---

## 📝 Example `.env.local` for Testing

```env
# Resend Configuration
RESEND_API_KEY=re_1234567890abcdefghijklmnop
RESEND_FROM_EMAIL=onboarding@resend.dev

# Testing Mode
USE_TEST_EMAILS=true
TEST_FACULTY_EMAIL=james@gmail.com
TEST_HOD_EMAIL=james@gmail.com
```

Replace `james@gmail.com` with your actual email to test receiving emails.

---

**Status**: ✅ Email service is fully integrated and ready for testing!
