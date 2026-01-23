"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface UploadExamPaperParams {
  file: File
  subjectId: string
  facultyId: string
  cieIndex: number
  examName: string
  subjectCode: string
}

export async function uploadExamPaper({
  file,
  subjectId,
  facultyId,
  cieIndex,
  examName,
  subjectCode,
}: UploadExamPaperParams) {
  try {
    // Validate inputs
    if (!file || !subjectId || !facultyId) {
      return { success: false, error: "Missing required parameters" }
    }

    // Validate file type
    const allowedTypes = ["pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg", "webp"]
    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return { success: false, error: "Invalid file type" }
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: "File size exceeds 10MB limit" }
    }

    // Generate unique file path in Supabase storage
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const fileName = `${timestamp}-${randomString}-${file.name}`
    const storagePath = `exam-papers/${subjectId}/${subjectCode}/cie-${cieIndex + 1}/${fileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase storage
    const { data, error: uploadError } = await supabase.storage
      .from("exam-papers")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return { success: false, error: "Failed to upload file to storage" }
    }

    // Get the latest submission count for this CIE
    const { data: existingSubmissions, error: fetchError } = await supabase
      .from("exam_paper_submissions")
      .select("submission_order", { count: "exact" })
      .eq("subject_id", subjectId)
      .eq("faculty_id", facultyId)
      .eq("cie_index", cieIndex)
      .order("submission_order", { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error("Fetch error:", fetchError)
      return { success: false, error: "Failed to check existing submissions" }
    }

    const latestSubmissionOrder = existingSubmissions?.[0]?.submission_order || 0
    const newSubmissionOrder = latestSubmissionOrder + 1

    // Mark previous submissions as not latest
    if (latestSubmissionOrder > 0) {
      await supabase
        .from("exam_paper_submissions")
        .update({ is_latest: false })
        .eq("subject_id", subjectId)
        .eq("faculty_id", facultyId)
        .eq("cie_index", cieIndex)
    }

    // Save submission metadata to database
    const { data: submission, error: insertError } = await supabase
      .from("exam_paper_submissions")
      .insert([
        {
          subject_id: subjectId,
          faculty_id: facultyId,
          cie_index: cieIndex,
          exam_name: examName,
          file_name: file.name,
          file_type: fileExtension,
          file_size: file.size,
          storage_path: storagePath,
          submission_order: newSubmissionOrder,
          is_latest: true,
          status: "submitted",
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error("Database insert error:", insertError)
      // Clean up storage file if database insert fails
      await supabase.storage.from("exam-papers").remove([storagePath])
      return { success: false, error: "Failed to save submission to database" }
    }

    return {
      success: true,
      data: submission,
      message: `File uploaded successfully as submission #${newSubmissionOrder}`,
    }
  } catch (error) {
    console.error("Error uploading exam paper:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function getExamPaperSignedUrl(storagePath: string) {
  try {
    if (!storagePath) {
      return { success: false, error: "Storage path is required" }
    }

    const { data, error } = await supabase.storage
      .from("exam-papers")
      .createSignedUrl(storagePath, 3600)

    if (error) {
      console.error("Error creating signed URL:", error)
      return { success: false, error: "Failed to generate download link" }
    }

    if (data?.signedUrl) {
      return { success: true, signedUrl: data.signedUrl }
    }

    return { success: false, error: "No signed URL generated" }
  } catch (error) {
    console.error("Error in getExamPaperSignedUrl:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
