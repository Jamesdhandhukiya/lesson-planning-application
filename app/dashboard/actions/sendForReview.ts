"use server"

import { createClient } from "@supabase/supabase-js"
import { sendPaperSubmissionNotificationToHOD } from "@/services/emailService"

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
    const departmentId = data.subjects?.department_id
    const facultyName = data.users?.name || "Faculty"
    const subjectName = data.subjects?.name || "Unknown Subject"
    const subjectCode = data.subjects?.code || "N/A"
    const cieLabel = `CIE ${cieIndex + 1}`
    const departmentName = data.subjects?.departments?.name || "Department"

    if (departmentId) {
      const { data: hodData, error: hodError } = await supabase
        .from("user_role")
        .select(
          `
          id,
          depart_id,
          users (
            id,
            name,
            email
          )
          `
        )
        .eq("role_name", "HOD")
        .eq("depart_id", departmentId)
        .single()

      if (hodError) {
        console.warn("Could not find HOD for department:", hodError)
      } else if (hodData?.users?.email) {
        // Send notification email to HOD
        const emailResult = await sendPaperSubmissionNotificationToHOD(
          facultyName,
          subjectName,
          subjectCode,
          cieLabel,
          hodData.users.email,
          departmentName
        )

        if (!emailResult.success) {
          console.warn("Failed to send HOD notification email:", emailResult.error)
          // Don't fail the operation if email fails
        } else {
          console.log("HOD notification email sent successfully")
        }
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
