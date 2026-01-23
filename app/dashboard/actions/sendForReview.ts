"use server"

import { createClient } from "@supabase/supabase-js"

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
      .select()
      .single()

    if (error) {
      console.error("Error updating submission status:", error)
      return { success: false, error: "Failed to send paper for review" }
    }

    if (!data) {
      return { success: false, error: "No latest submission found for this CIE" }
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
