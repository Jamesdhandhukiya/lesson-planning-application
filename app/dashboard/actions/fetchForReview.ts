"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function fetchPapersForReview(hodAuthId: string) {
  try {
    if (!hodAuthId) {
      return { success: false, error: "HOD auth ID is required" }
    }

    console.log("Fetching papers for HOD auth_id:", hodAuthId)

    // Get HOD role directly by joining with users table
    const { data: hodRoleData, error: hodRoleError } = await supabase
      .from("user_role")
      .select("id, user_id, depart_id, users!inner(id, auth_id)")
      .eq("role_name", "HOD")
      .eq("users.auth_id", hodAuthId)

    if (hodRoleError) {
      console.error("Error checking HOD role:", hodRoleError)
      return { success: false, error: "Unable to verify HOD role" }
    }

    if (!hodRoleData || hodRoleData.length === 0) {
      console.log("No HOD role found for auth_id:", hodAuthId)
      return { success: false, error: "User is not assigned as HOD" }
    }

    const hodUserId = hodRoleData[0].user_id
    const departmentId = hodRoleData[0].depart_id

    console.log("HOD user_id:", hodUserId)
    console.log("HOD department:", departmentId)

    // Get all exam paper submissions from subjects in this department
    // (instead of filtering by faculty assigned to HOD)
    const { data: submissions, error: submissionsError } = await supabase
      .from("exam_paper_submissions")
      .select(
        `
        id,
        created_at,
        updated_at,
        subject_id,
        faculty_id,
        cie_index,
        exam_name,
        file_name,
        file_type,
        file_size,
        storage_path,
        submission_order,
        is_latest,
        status,
        feedback,
        subjects (
          id,
          name,
          code,
          semester,
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
          email,
          auth_id
        )
        `
      )
      .order("created_at", { ascending: false })

    if (submissionsError) {
      console.error("Error fetching submissions for review:", submissionsError)
      return { success: false, error: "Failed to fetch submissions for review" }
    }

    console.log("Total submissions in database:", submissions?.length)

    // Filter by department
    const filteredSubmissions = (submissions || []).filter((sub: any) => {
      return sub.subjects && sub.subjects.department_id === departmentId
    })

    console.log("Submissions filtered by department:", filteredSubmissions?.length)

    return { success: true, data: filteredSubmissions || [] }
  } catch (error) {
    console.error("Error in fetchPapersForReview:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function updateSubmissionStatus(
  submissionId: string,
  status: string,
  feedback?: string
) {
  try {
    if (!submissionId) {
      return { success: false, error: "Submission ID is required" }
    }

    const updateData: any = { status }
    if (feedback) {
      updateData.feedback = feedback
    }

    const { data, error } = await supabase
      .from("exam_paper_submissions")
      .update(updateData)
      .eq("id", submissionId)
      .select()

    if (error) {
      console.error("Error updating submission status:", error)
      return { success: false, error: "Failed to update submission status" }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in updateSubmissionStatus:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function rejectSubmissionWithComment(
  submissionId: string,
  comment: string,
  hodAuthId: string
) {
  try {
    if (!submissionId || !comment.trim() || !hodAuthId) {
      return { success: false, error: "Missing required fields" }
    }

    // First, get the HOD user ID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", hodAuthId)
      .single()

    if (userError || !userData) {
      console.error("Error fetching HOD user:", userError)
      return { success: false, error: "Unable to identify HOD user" }
    }

    // Update submission status to rejected
    const { error: updateError } = await supabase
      .from("exam_paper_submissions")
      .update({ status: "rejected" })
      .eq("id", submissionId)

    if (updateError) {
      console.error("Error updating submission status:", updateError)
      return { success: false, error: "Failed to reject paper" }
    }

    // Insert rejection comment into history
    const { data: commentData, error: commentError } = await supabase
      .from("rejection_comments")
      .insert([
        {
          submission_id: submissionId,
          hod_id: userData.id,
          comment: comment.trim(),
          is_visible_to_faculty: true,
        },
      ])
      .select()

    if (commentError) {
      console.error("Error storing rejection comment:", commentError)
      return { success: false, error: "Paper rejected but comment failed to save" }
    }

    return { success: true, data: commentData }
  } catch (error) {
    console.error("Error in rejectSubmissionWithComment:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function fetchRejectionComments(submissionId: string) {
  try {
    if (!submissionId) {
      return { success: false, error: "Submission ID is required" }
    }

    const { data: comments, error } = await supabase
      .from("rejection_comments")
      .select(
        `
        id,
        created_at,
        comment,
        hod_id,
        users!hod_id (
          id,
          name,
          email
        )
        `
      )
      .eq("submission_id", submissionId)
      .eq("is_visible_to_faculty", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching rejection comments:", error)
      return { success: false, error: "Failed to fetch comments" }
    }

    return { success: true, data: comments || [] }
  } catch (error) {
    console.error("Error in fetchRejectionComments:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
