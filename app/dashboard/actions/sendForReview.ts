"use server"

import { createClient } from "@supabase/supabase-js"
import { sendPaperSubmissionNotificationToReviewer } from "@/services/emailService"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function sendPaperForReview(
  subjectId: string,
  facultyId: string,
  cieIndex: number
) {
  try {
    if (!subjectId || !facultyId) {
      return { success: false, error: "Missing required parameters" }
    }

    // Update the latest submission for this subject/faculty/CIE to 'sent-for-review' status
    const { data, error } = await supabase
      .from("exam_paper_submissions")
      .update({ status: "sent-for-review" })
      .eq("subject_id", subjectId)
      .eq("faculty_id", facultyId)
      .eq("cie_index", cieIndex)
      .eq("is_latest", true)
      .select(
        `
        id,
        subject_id,
        faculty_id,
        subjects (
          id,
          name,
          code,
          department_id,
          departments (
            id,
            name,
            abbreviation_depart
          )
        ),
        users (
          id,
          name,
          email
        )
        `
      )
      .single()

    if (error) {
      console.error("Error updating submission status:", error)
      return { success: false, error: "Failed to send paper for review" }
    }

    if (!data) {
      return { success: false, error: "No latest submission found for this CIE" }
    }

    // Fetch HOD details for the department (department-based routing)
    const anyData = data as any;
    const departmentId = anyData.subjects?.department_id
    const facultyName = anyData.users?.name || "Faculty"
    const subjectName = anyData.subjects?.name || "Unknown Subject"
    const subjectCode = anyData.subjects?.code || "N/A"
    const cieLabel = `CIE ${cieIndex + 1}`
    const departmentName = anyData.subjects?.departments?.name || "Department"

    if (departmentId) {
      const notificationTargets: Array<{
        email: string
        roleName: string
      }> = []

      // Find Course Owner for this subject
      const { data: coData, error: coError } = await supabase
        .from("user_role")
        .select(`
          id,
          users (
            id,
            name,
            email
          ),
          subjects!inner (
            code
          )
        `)
        .eq("role_name", "Course Owner")
        .eq("subjects.code", subjectCode)
        .limit(1)
        .maybeSingle()

      if (!coError && (coData as any)?.users?.email) {
        notificationTargets.push({
          email: (coData as any).users.email,
          roleName: "Course Owner",
        })
      }

      // Find HOD for the department
      const { data: hodData, error: hodError } = await supabase
        .from("user_role")
        .select(`
          id,
          depart_id,
          users (
            id,
            name,
            email
          )
        `)
        .eq("role_name", "HOD")
        .eq("depart_id", departmentId)
        .single()

      if (!hodError && (hodData as any)?.users?.email) {
        const hodEmail = (hodData as any).users.email
        if (!notificationTargets.some((target) => target.email === hodEmail)) {
          notificationTargets.push({
            email: hodEmail,
            roleName: "HOD",
          })
        }
      }

      if (notificationTargets.length === 0) {
        console.warn("Could not find HOD or Course Owner for department/subject")
      } else {
        await Promise.all(
          notificationTargets.map(async (target) => {
            const emailResult = await sendPaperSubmissionNotificationToReviewer(
              facultyName,
              subjectName,
              subjectCode,
              cieLabel,
              target.email,
              departmentName,
              target.roleName
            )

            if (!emailResult.success) {
              console.warn(
                `Failed to send ${target.roleName} notification email:`,
                emailResult.error
              )
            } else {
              console.log(
                `${target.roleName} notification email sent successfully to ${target.email}`
              )
            }
          })
        )
      }
    }

    return {
      success: true,
      data,
      message: "Paper sent for review successfully!",
    }
  } catch (error) {
    console.error("Error in sendPaperForReview:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
