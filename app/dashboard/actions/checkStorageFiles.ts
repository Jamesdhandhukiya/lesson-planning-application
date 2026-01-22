"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function checkStorageFiles() {
  try {
    console.log("Checking exam-papers bucket...")

    // Check if bucket exists and get info
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.error("Error listing buckets:", bucketsError)
      return { success: false, error: "Cannot access buckets", details: bucketsError }
    }

    const examPapersBucket = buckets?.find((b) => b.name === "exam-papers")
    if (!examPapersBucket) {
      console.error("exam-papers bucket not found")
      return {
        success: false,
        error: "exam-papers bucket not found",
        availableBuckets: buckets?.map((b) => b.name),
      }
    }

    console.log("exam-papers bucket found:", examPapersBucket)

    // Try to list all files in the bucket
    const { data: files, error: listError } = await supabase.storage
      .from("exam-papers")
      .list("", {
        limit: 100,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      })

    if (listError) {
      console.error("Error listing files:", listError)
      return { success: false, error: "Cannot list files", details: listError }
    }

    console.log("Files in bucket:", files?.length)

    // Also check what's in the database
    const { data: submissions, error: submissionsError } = await supabase
      .from("exam_paper_submissions")
      .select("id, file_name, storage_path, status")
      .order("created_at", { ascending: false })
      .limit(5)

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError)
      return { success: false, error: "Cannot fetch submissions", details: submissionsError }
    }

    console.log("Recent submissions in DB:", submissions?.length)
    submissions?.forEach((sub) => {
      console.log(`  - File: ${sub.file_name}, Path: ${sub.storage_path}, Status: ${sub.status}`)
    })

    return {
      success: true,
      bucket: examPapersBucket,
      filesInStorage: files?.length || 0,
      storageFiles: files,
      submissionsInDB: submissions?.length || 0,
      databaseSubmissions: submissions,
    }
  } catch (error) {
    console.error("Error checking storage:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
