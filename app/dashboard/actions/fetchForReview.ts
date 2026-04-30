"use server"

import { createClient } from "@supabase/supabase-js"
import {
  sendApprovalNotificationToFaculty,
  sendRejectionNotificationToFaculty,
} from "@/services/emailService"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function fetchPapersForReview(authId: string, roleName: string = "HOD") {
  try {
    if (!authId) {
      return { success: false, error: "Auth ID is required" }
    }

    const normalizedRole = roleName?.trim()
    console.log(`DEBUG: normalizedRole: "${normalizedRole}"`)

    if (normalizedRole === "Course Owner") {
      // 1. Get the postgres user ID from the auth ID first to be safe
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", authId)
        .single()

      if (userError || !userData) {
        console.error("Error finding user for Course Owner check:", userError)
        return { success: false, error: "Unable to identify user profile" }
      }

      console.log(`Found Postgres user ID ${userData.id} for auth_id ${authId}`)

      // 2. Get all subject IDs assigned to this Course Owner using BOTH IDs to be safe
      const { data: coRoles, error: coError } = await supabase
        .from("user_role")
        .select("subject_id")
        .eq("role_name", "Course Owner")
        .or(`user_id.eq.${userData.id},user_id.eq.${authId}`)

      if (coError) {
        console.error("Error fetching Course Owner roles:", coError)
        return { success: false, error: "Unable to verify Course Owner assignments" }
      }

      console.log(`DEBUG: Found ${coRoles?.length} Course Owner roles for user:`, coRoles)

      const subjectIds = coRoles
        .map((r: any) => r.subject_id)
        .filter(Boolean)

      console.log(`DEBUG: Found ${subjectIds.length} subject IDs for Course Owner:`, subjectIds)

      if (subjectIds.length === 0) {
        console.log("DEBUG: No subjects found for this Course Owner.")
        return { success: true, data: [] }
      }

      // 3. Fetch submissions for these subjects
      console.log(`DEBUG: Querying exam_paper_submissions for subjects in:`, subjectIds)
      const { data: submissions, error: submissionsError } = await supabase
        .from("exam_paper_submissions")
        .select(`
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
        `)
        .order("created_at", { ascending: false })
        .in("subject_id", subjectIds)

      if (submissionsError) {
        console.error("Error fetching Course Owner submissions:", submissionsError)
        return { success: false, error: "Failed to fetch submissions for review" }
      }

      console.log(`DEBUG: Final submissions found: ${submissions?.length}`)

      return { 
        success: true, 
        data: submissions || [],
        debug: {
          roleUsed: "Course Owner",
          postgresUserId: userData.id,
          authId: authId,
          subjectIds: subjectIds,
          totalSubmissionsFound: submissions?.length
        }
      }
    }

    // Get HOD role directly by joining with users table
    const { data: hodRoleData, error: hodRoleError } = await supabase
      .from("user_role")
      .select("id, user_id, depart_id, users!inner(id, auth_id)")
      .eq("role_name", "HOD")
      .eq("users.auth_id", authId)

    if (hodRoleError) {
      console.error("Error checking HOD role:", hodRoleError)
      return { success: false, error: "Unable to verify HOD role" }
    }

    if (!hodRoleData || hodRoleData.length === 0) {
      console.log("No HOD role found for auth_id:", authId)
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

    return { 
      success: true, 
      data: filteredSubmissions || [],
      debug: {
        roleUsed: "HOD",
        departmentId: departmentId,
        totalFound: filteredSubmissions?.length
      }
    }
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

    // Fetch submission details before updating (for email)
    const { data: submissionData, error: fetchError } = await supabase
      .from("exam_paper_submissions")
      .select(
        `
        id,
        cie_index,
        subject_id,
        faculty_id,
        status,
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
      .eq("id", submissionId)
      .single()

    if (fetchError || !submissionData) {
      console.error("Error fetching submission details:", fetchError)
      return { success: false, error: "Failed to fetch submission details" }
    }

    // Separate status logic: status field will store "CO_STATUS|HOD_STATUS"
    // Default is "sent-for-review|sent-for-review" (implicit if it's just one value)
    let currentStatus = submissionData.status || "sent-for-review"
    let [coStatus, hodStatus] = currentStatus.includes("|") 
      ? currentStatus.split("|") 
      : [currentStatus, currentStatus]

    if (status.startsWith("CO:")) {
      coStatus = status.replace("CO:", "")
    } else if (status.startsWith("HOD:")) {
      hodStatus = status.replace("HOD:", "")
    } else {
      // Legacy or direct update
      coStatus = status
      hodStatus = status
    }

    const newStatus = `${coStatus}|${hodStatus}`
    const updateData: any = { status: newStatus }
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

    // Send approval email if status is 'accepted' or 'approved' (handling prefixes like CO:approved)
    const normalizedStatus = status.toLowerCase()
    if (normalizedStatus.includes("accepted") || normalizedStatus.includes("approved")) {
      const anySubData = submissionData as any;
      const facultyName = anySubData.users?.name || "Faculty"
      const facultyEmail = anySubData.users?.email || ""
      const subjectName = anySubData.subjects?.name || "Unknown Subject"
      const subjectCode = anySubData.subjects?.code || "N/A"
      const cieLabel = typeof anySubData.cie_index === "number" ? `CIE ${anySubData.cie_index + 1}` : (anySubData.exam_name || "CIE")
      const departmentName = anySubData.subjects?.departments?.name || "Department"

      const reviewerRole = status.startsWith("CO:") ? "Course Owner" : (status.startsWith("HOD:") ? "HOD" : "HOD")

      const emailResult = await sendApprovalNotificationToFaculty(
        facultyName,
        facultyEmail,
        subjectName,
        subjectCode,
        cieLabel,
        departmentName,
        feedback,
        reviewerRole
      )

      if (!emailResult.success) {
        console.warn("Failed to send approval email:", emailResult.error)
        // Don't fail the operation if email fails
      } else {
        console.log("Approval email sent successfully")
      }
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
  hodAuthId: string,
  status: string = "rejected"
) {
  try {
    if (!submissionId || !comment.trim() || !hodAuthId) {
      return { success: false, error: "Missing required fields" }
    }

    // First, get the HOD user details
    const { data: hodData, error: hodError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("auth_id", hodAuthId)
      .single()

    if (hodError || !hodData) {
      console.error("Error fetching HOD user:", hodError)
      return { success: false, error: "Unable to identify HOD user" }
    }

    // Fetch submission details including faculty and subject info (for email)
    const { data: submissionData, error: fetchError } = await supabase
      .from("exam_paper_submissions")
      .select(
        `
        id,
        cie_index,
        subject_id,
        faculty_id,
        status,
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
      .eq("id", submissionId)
      .single()

    if (fetchError || !submissionData) {
      console.error("Error fetching submission details:", fetchError)
      return { success: false, error: "Failed to fetch submission details" }
    }

    // Handle composite status logic
    let currentStatus = (submissionData as any).status || "sent-for-review"
    let [coStatus, hodStatus] = currentStatus.includes("|") 
      ? currentStatus.split("|") 
      : [currentStatus, currentStatus]

    if (status.startsWith("CO:")) {
      coStatus = status.replace("CO:", "")
    } else if (status.startsWith("HOD:")) {
      hodStatus = status.replace("HOD:", "")
    } else {
      coStatus = status
      hodStatus = status
    }
    const newStatus = `${coStatus}|${hodStatus}`

    // Update submission status to rejected (using composite status)
    const { error: updateError } = await supabase
      .from("exam_paper_submissions")
      .update({ status: newStatus })
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
          hod_id: hodData.id,
          comment: comment.trim(),
          is_visible_to_faculty: true,
        },
      ])
      .select()

    if (commentError) {
      console.error("Error storing rejection comment:", commentError)
      return { success: false, error: "Paper rejected but comment failed to save" }
    }

    // Send rejection email to faculty with HOD comments
    const anySubData = submissionData as any;
    const facultyName = anySubData.users?.name || "Faculty"
    const facultyEmail = anySubData.users?.email || ""
    const subjectName = anySubData.subjects?.name || "Unknown Subject"
    const subjectCode = anySubData.subjects?.code || "N/A"
    const cieLabel = typeof anySubData.cie_index === "number" ? `CIE ${anySubData.cie_index + 1}` : (anySubData.exam_name || "CIE")
    const departmentName = anySubData.subjects?.departments?.name || "Department"
    const hodName = hodData.name || "HOD"
    const reviewerRole = status.startsWith("CO:") ? "Course Owner" : (status.startsWith("HOD:") ? "HOD" : "HOD")

    const emailResult = await sendRejectionNotificationToFaculty(
      facultyName,
      facultyEmail,
      subjectName,
      subjectCode,
      cieLabel,
      departmentName,
      hodName,
      comment.trim(),
      reviewerRole
    )

    if (!emailResult.success) {
      console.warn("Failed to send rejection email:", emailResult.error)
      // Don't fail the operation if email fails
    } else {
      console.log("Rejection email sent successfully")
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

    // Also fetch the current status of the submission to check for approvals
    const { data: submission, error: subError } = await supabase
      .from("exam_paper_submissions")
      .select("status")
      .eq("id", submissionId)
      .single()

    return { 
      success: true, 
      data: comments || [],
      status: submission?.status || "pending"
    }
  } catch (error) {
    console.error("Error in fetchRejectionComments:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
