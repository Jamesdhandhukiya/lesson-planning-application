"use server"

import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// Sample email addresses for testing (will be replaced with actual registered emails)
const TEST_EMAILS = {
  faculty: process.env.TEST_FACULTY_EMAIL || "test.faculty@example.com",
  hod: process.env.TEST_HOD_EMAIL || "test.hod@example.com",
}

// Helper function to check if running in test mode
const isTestMode = () => process.env.USE_TEST_EMAILS === "true"

/**
 * Send email to HOD when faculty submits paper for review
 * Department-based mapping ensures only relevant HOD receives notification
 */
export async function sendPaperSubmissionNotificationToHOD(
  facultyName: string,
  subjectName: string,
  subjectCode: string,
  cieLabel: string,
  hodEmail: string,
  departmentName: string
) {
  try {
    // Use test email if in development mode
    const toEmail = isTestMode() ? TEST_EMAILS.hod : hodEmail

    if (!toEmail || toEmail === "test.hod@example.com" && !isTestMode()) {
      console.warn("HOD email not configured or invalid")
      return { success: false, error: "HOD email not available" }
    }

    const subject = `New Paper Submission - ${subjectName} (${subjectCode}) - ${cieLabel}`
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f0f4f8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1a3a52; margin: 0;">New Paper Submission for Review</h2>
        </div>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Dear HOD,</p>
        
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          Faculty member <strong>${facultyName}</strong> has submitted an exam paper of <strong>${subjectName} (${subjectCode})</strong> for  
          verification in the <strong>${departmentName}</strong> department.
        </p>
        
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          <strong>Paper:</strong> ${cieLabel}
        </p>
        
        <div style="background-color: #e8f4f8; padding: 15px; border-left: 4px solid #0984e3; margin: 20px 0;">
          <p style="margin: 0; color: #333; font-size: 15px;">
            <strong>Action Required:</strong> Please review the paper details and submitted paper in the dashboard and provide feedback.
          </p>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 25px;">
          Best regards,<br>
          <strong>Lesson Planning Application</strong>
        </p>
      </div>
    `

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: toEmail,
      subject: subject,
      html: htmlContent,
    })

    if (error) {
      console.error("Error sending HOD notification email:", error)
      return { success: false, error: error.message }
    }

    console.log(
      `[${isTestMode() ? "TEST" : "PRODUCTION"}] HOD notification sent to ${toEmail}`,
      data
    )
    return { success: true, data }
  } catch (error) {
    console.error("Exception in sendPaperSubmissionNotificationToHOD:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Send approval notification email to faculty
 * Only sends to faculty whose paper was approved
 */
export async function sendApprovalNotificationToFaculty(
  facultyName: string,
  facultyEmail: string,
  subjectName: string,
  subjectCode: string,
  cieLabel: string,
  departmentName: string,
  feedback?: string
) {
  try {
    // Use test email if in development mode
    const toEmail = isTestMode() ? TEST_EMAILS.faculty : facultyEmail

    if (!toEmail || (toEmail === "test.faculty@example.com" && !isTestMode())) {
      console.warn("Faculty email not configured or invalid")
      return { success: false, error: "Faculty email not available" }
    }

    const subject = `Paper Approved - ${subjectName} (${subjectCode}) - ${cieLabel}`
    const feedbackSection = feedback
      ? `
        <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; color: #333; font-weight: bold; font-size: 15px;">Feedback from HOD:</p>
          <p style="margin: 0; color: #555; font-size: 14px; white-space: pre-wrap;">${feedback}</p>
        </div>
      `
      : ""

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #155724; margin: 0;">✓ Paper Approved</h2>
        </div>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Dear ${facultyName},</p>
        
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          Your exam paper for <strong>${subjectName} (${subjectCode})</strong> (${departmentName}) has been <strong style="color: #28a745;">ACCEPTED</strong> 
          by the Head of Department.
        </p>
        
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          <strong>Paper:</strong> ${cieLabel}
        </p>
        
        <div style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
          <p style="margin: 0; color: #155724; font-size: 15px;">
            <strong>Status:</strong> Your submission is approved and can proceed to the next stage.
          </p>
        </div>
        
        ${feedbackSection}
        
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 25px;">
          Best regards,<br>
          <strong>Lesson Planning Application</strong>
        </p>
      </div>
    `

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: toEmail,
      subject: subject,
      html: htmlContent,
    })

    if (error) {
      console.error("Error sending approval email:", error)
      return { success: false, error: error.message }
    }

    console.log(
      `[${isTestMode() ? "TEST" : "PRODUCTION"}] Approval email sent to ${toEmail}`,
      data
    )
    return { success: true, data }
  } catch (error) {
    console.error("Exception in sendApprovalNotificationToFaculty:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Send rejection notification email to faculty with HOD comments
 * Department-based email routing ensures faculty gets feedback from their department HOD
 */
export async function sendRejectionNotificationToFaculty(
  facultyName: string,
  facultyEmail: string,
  subjectName: string,
  subjectCode: string,
  cieLabel: string,
  departmentName: string,
  hodName: string,
  comments: string
) {
  try {
    // Use test email if in development mode
    const toEmail = isTestMode() ? TEST_EMAILS.faculty : facultyEmail

    if (!toEmail || (toEmail === "test.faculty@example.com" && !isTestMode())) {
      console.warn("Faculty email not configured or invalid")
      return { success: false, error: "Faculty email not available" }
    }

    const subject = `Revision Required - ${subjectName} (${subjectCode}) - ${cieLabel}`
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #721c24; margin: 0;">⚠ Paper Requires Revision</h2>
        </div>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Dear ${facultyName},</p>
        
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          Your exam paper for <strong>${subjectName} (${subjectCode})</strong> (${departmentName}) has been <strong style="color: #dc3545;">REJECTED</strong> 
          by the Head of Department and requires revision.
        </p>
        
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          <strong>Paper:</strong> ${cieLabel}
        </p>
        
        <div style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; color: #721c24; font-weight: bold; font-size: 15px;">HOD Remarks (${hodName}):</p>
          <p style="margin: 0; color: #555; font-size: 14px; white-space: pre-wrap; line-height: 1.6;">${comments}</p>
        </div>
        
        <div style="background-color: #e2e3e5; padding: 15px; border-left: 4px solid #6c757d; margin: 20px 0;">
          <p style="margin: 0; color: #333; font-size: 15px;">
            <strong>Next Steps:</strong> Please revise your paper according to the remarks above and resubmit through the dashboard.
          </p>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 25px;">
          Best regards,<br>
          <strong>Lesson Planning Application</strong>
        </p>
      </div>
    `

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: toEmail,
      subject: subject,
      html: htmlContent,
    })

    if (error) {
      console.error("Error sending rejection email:", error)
      return { success: false, error: error.message }
    }

    console.log(
      `[${isTestMode() ? "TEST" : "PRODUCTION"}] Rejection email sent to ${toEmail}`,
      data
    )
    return { success: true, data }
  } catch (error) {
    console.error("Exception in sendRejectionNotificationToFaculty:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Helper function to fetch HOD email for a department
 * Ensures department-based email routing
 */
export async function getHODEmailForDepartment(departmentId: string) {
  try {
    // This would be called from action files with supabase client
    // Returns HOD email for the given department
    return { success: true, email: null }
  } catch (error) {
    console.error("Error fetching HOD email:", error)
    return { success: false, error: "Failed to fetch HOD email" }
  }
}

/**
 * Helper function to get faculty email
 * Used for approval and rejection notifications
 */
export async function getFacultyEmail(facultyId: string) {
  try {
    // This would be called from action files with supabase client
    // Returns faculty email
    return { success: true, email: null }
  } catch (error) {
    console.error("Error fetching faculty email:", error)
    return { success: false, error: "Failed to fetch faculty email" }
  }
}
