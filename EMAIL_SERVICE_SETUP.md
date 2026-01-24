# Email Service Integration - Setup Guide

## Overview

This guide explains how the Resend email service has been integrated into your Lesson Planning Application with proper department-based email routing.

## ✅ Completed Integration

### 1. **Email Service Created**: [services/emailService.ts](../../services/emailService.ts)

The email service provides three main functions:

#### **sendPaperSubmissionNotificationToHOD()**
- Triggered when faculty submits a paper
- Sends notification to the HOD of the **same department** only
- Email: "Faculty [Name] has submitted a paper for [Subject] verification."

#### **sendApprovalNotificationToFaculty()**
- Triggered when HOD approves a paper
- Sends to the faculty member who submitted
- Email: "Your paper for [Subject] has been ACCEPTED."

#### **sendRejectionNotificationToFaculty()**
- Triggered when HOD rejects a paper with comments
- Sends to the faculty member who submitted
- Includes HOD remarks and department context
- Email: "Your paper for [Subject] has been REJECTED. Remarks: [Comments]"

### 2. **Workflow 1 - Faculty Submits Paper**: [app/dashboard/actions/sendForReview.ts](../dashboard/actions/sendForReview.ts)

✅ **Integration Complete**
- Fetches subject details and department information
- Finds the HOD for that department using `user_role` table
- Sends email notification to HOD
- **Department-based routing**: Only the HOD of the subject's department receives the email

### 3. **Workflow 2 - HOD Approves Paper**: [app/dashboard/actions/fetchForReview.ts](../dashboard/actions/fetchForReview.ts)

✅ **Integration Complete** in `updateSubmissionStatus()` function
- When status is set to "accepted"
- Fetches faculty details and subject information
- Sends approval email to faculty
- **Department-aware**: Email context includes department information

### 4. **Workflow 3 - HOD Rejects Paper**: [app/dashboard/actions/fetchForReview.ts](../dashboard/actions/fetchForReview.ts)

✅ **Integration Complete** in `rejectSubmissionWithComment()` function
- When paper is rejected with comments
- Fetches HOD details and submission information
- Sends rejection email with HOD remarks to faculty
- **Department-aware**: Includes HOD name and department context

## 🔧 Setup Instructions

### Step 1: Install Dependencies

```bash
npm install resend
```

✅ **Already done**

### Step 2: Create `.env.local` in Project Root

Create a `.env.local` file in the project root with the following variables:

```env
# Resend API Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@yourdomain.com

# Testing Configuration (Set to true to use test emails during development)
USE_TEST_EMAILS=true
TEST_FACULTY_EMAIL=test.faculty@example.com
TEST_HOD_EMAIL=test.hod@example.com
```

### Step 3: Get Your Resend API Key

1. Go to [Resend Dashboard](https://dashboard.resend.com)
2. Navigate to **API Keys** section
3. Create a new API key (or copy existing one)
4. Add it to `.env.local` as `RESEND_API_KEY`

### Step 4: Configure From Email

Replace `onboarding@yourdomain.com` with:
- Your verified Resend domain (if using custom domain)
- Or use the default `onboarding@resend.dev` for testing

## 📧 Testing Configuration

### Phase 1: Development & Testing (USE_TEST_EMAILS=true)

All emails will be sent to your test email addresses:
- Faculty notifications → `TEST_FACULTY_EMAIL`
- HOD notifications → `TEST_HOD_EMAIL`

**Sample Test Emails:**
```env
TEST_FACULTY_EMAIL=james.faculty@example.com
TEST_HOD_EMAIL=james.hod@example.com
```

### Phase 2: Production (USE_TEST_EMAILS=false)

Emails will be sent to actual registered faculty and HOD emails from the database:
- Faculty → Their registered email from `users` table
- HOD → Their registered email from `users` table (filtered by department)

## 🏢 Department-Based Email Routing

### How It Works:

1. **Faculty Submits Paper**
   ```
   Faculty (CSE Department) → Paper Submitted
   → System finds CSE HOD from user_role table (where role_name='HOD' AND depart_id=CSE_ID)
   → Email sent ONLY to CSE HOD
   ```

2. **HOD Approves/Rejects**
   ```
   HOD (CSE Department) → Takes Action
   → System finds the faculty's email from submission data
   → Email sent to the faculty
   → Context includes CSE Department information
   ```

### Database Mapping:

- **users table**: Stores faculty and HOD emails
- **user_role table**: Maps users to departments and roles
  ```
  user_id → depart_id → role_name (HOD/Faculty)
  ```
- **exam_paper_submissions table**: Stores submission data
- **subjects table**: Contains subject_id → department_id mapping

## 📋 Email Templates

All emails include:
- Professional HTML formatting
- Department and subject context
- Color-coded status indicators
- Clear call-to-action
- Branded footer

### Email Types:

| Workflow | Trigger | Recipient | Template |
|----------|---------|-----------|----------|
| 1 | Faculty submits | HOD (same dept) | Paper Submission Notification |
| 2 | HOD approves | Faculty | Approval Email (green) |
| 3 | HOD rejects | Faculty | Rejection Email (red) with remarks |

## 🚀 Deploying to Production

### Before Going Live:

1. **Verify Faculty & HOD Emails**
   - Ensure all faculty and HOD users have valid email addresses in the `users` table
   - Email field must not be null

2. **Update Environment Variables**
   ```env
   USE_TEST_EMAILS=false
   RESEND_API_KEY=your_production_key
   RESEND_FROM_EMAIL=notifications@yourdomain.com
   ```

3. **Test Each Workflow**
   - Submit a test paper from faculty account
   - Verify HOD receives email
   - HOD approves → verify faculty receives approval email
   - HOD rejects → verify faculty receives rejection email with comments

4. **Monitor Email Delivery**
   - Check Resend Dashboard for delivery status
   - Monitor application logs for any email-related errors

## ⚙️ Configuration Options

### Environment Variables Reference:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `RESEND_API_KEY` | ✅ Yes | Your Resend API key | `re_xxxx` |
| `RESEND_FROM_EMAIL` | ✅ Yes | From email address | `noreply@domain.com` |
| `USE_TEST_EMAILS` | ❌ No | Enable test mode | `true` or `false` |
| `TEST_FACULTY_EMAIL` | ⚠️ If using test | Test faculty email | `test@example.com` |
| `TEST_HOD_EMAIL` | ⚠️ If using test | Test HOD email | `hod@example.com` |

## 📱 Error Handling

The email service includes robust error handling:

- If email sending fails, the operation continues (doesn't block paper submission/review)
- Errors are logged to console for debugging
- Both test and production modes log clearly labeled messages
- Failed emails don't prevent database operations

## 🔍 Monitoring & Logs

Check the browser console and server logs for:

```
[TEST] HOD notification sent to test.hod@example.com
[PRODUCTION] Approval email sent to faculty@university.edu
```

**Console Warnings:**
```
Warning: HOD email not configured or invalid
Warning: Faculty email not configured or invalid
```

## 🆘 Troubleshooting

### Issue: "Email not configured or invalid"

**Solution:**
- Verify `RESEND_API_KEY` is set in `.env.local`
- Check email addresses in database are valid
- Ensure Resend domain is verified in Resend Dashboard

### Issue: Emails not sending in production

**Solution:**
- Verify `USE_TEST_EMAILS=false` is set
- Check that faculty/HOD emails exist in database
- Verify Resend API key is correct and has permissions
- Check email doesn't bounce (spam filters)

### Issue: Getting all emails instead of department-specific

**Solution:**
- This shouldn't happen with current implementation
- Verify the subject's `department_id` is correctly set
- Verify HOD's `depart_id` in `user_role` matches subject department

## 📝 Sample Test Workflow

1. **Setup** (`.env.local`):
   ```env
   RESEND_API_KEY=re_xxxxx
   RESEND_FROM_EMAIL=onboarding@resend.dev
   USE_TEST_EMAILS=true
   TEST_FACULTY_EMAIL=your-email@example.com
   TEST_HOD_EMAIL=your-email@example.com
   ```

2. **Run Application**:
   ```bash
   npm run dev
   ```

3. **Test Faculty Submission**:
   - Login as faculty
   - Submit a paper
   - Check your email for HOD notification

4. **Test HOD Approval**:
   - Login as HOD
   - Approve the paper
   - Check your email for approval notification

5. **Test HOD Rejection**:
   - Login as HOD
   - Reject the paper with comments
   - Check your email for rejection notification

## 🎯 Next Steps

1. ✅ Complete the Resend account setup
2. ✅ Get your API key and add to `.env.local`
3. ✅ Test with test emails first
4. ✅ Verify all three workflows work
5. ✅ Switch to production emails when ready

---

**Note**: All email logic is non-blocking. If email fails, the primary operations (paper submission, approval, rejection) will still succeed. Always check logs for email delivery status.
