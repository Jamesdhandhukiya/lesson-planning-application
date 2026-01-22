"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function fetchExamPaperSubmissions(
  subjectId: string,
  facultyId: string,
  cieIndex?: number
) {
  try {
    if (!subjectId || !facultyId) {
      return { success: false, error: "Missing required parameters" }
    }

    let query = supabase
      .from("exam_paper_submissions")
      .select("*")
      .eq("subject_id", subjectId)
      .eq("faculty_id", facultyId)

    // If cieIndex is provided, filter by specific CIE
    if (cieIndex !== undefined) {
      query = query.eq("cie_index", cieIndex)
    }

    const { data, error } = await query.order("cie_index", { ascending: true }).order("submission_order", { ascending: false })

    if (error) {
      console.error("Error fetching submissions:", error)
      return { success: false, error: "Failed to fetch submissions" }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error in fetchExamPaperSubmissions:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function getLatestSubmissions(subjectId: string, facultyId: string) {
  try {
    if (!subjectId || !facultyId) {
      return { success: false, error: "Missing required parameters" }
    }

    const { data, error } = await supabase
      .from("exam_paper_submissions")
      .select("*")
      .eq("subject_id", subjectId)
      .eq("faculty_id", facultyId)
      .eq("is_latest", true)
      .order("cie_index", { ascending: true })

    if (error) {
      console.error("Error fetching latest submissions:", error)
      return { success: false, error: "Failed to fetch submissions" }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error in getLatestSubmissions:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function getAllSubmissionsForCIE(
  subjectId: string,
  facultyId: string,
  cieIndex: number
) {
  try {
    const { data, error } = await supabase
      .from("exam_paper_submissions")
      .select("*")
      .eq("subject_id", subjectId)
      .eq("faculty_id", facultyId)
      .eq("cie_index", cieIndex)
      .order("submission_order", { ascending: false })

    if (error) {
      console.error("Error fetching CIE submissions:", error)
      return { success: false, error: "Failed to fetch submissions" }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error in getAllSubmissionsForCIE:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
