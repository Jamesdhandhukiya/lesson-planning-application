"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function testSignedUrl(storagePath: string) {
  try {
    console.log("Testing signed URL creation for path:", storagePath)

    // Step 1: Check if file exists
    console.log("Step 1: Checking if file exists...")
    const { data: fileList, error: listError } = await supabase.storage
      .from("exam-papers")
      .list(storagePath.substring(0, storagePath.lastIndexOf("/")), {
        limit: 100,
      })

    if (listError) {
      console.error("Error listing directory:", listError)
      return {
        success: false,
        step: "list",
        error: listError.message,
        storagePath,
      }
    }

    const fileName = storagePath.split("/").pop()
    const fileExists = fileList?.some((f) => f.name === fileName)
    console.log("File exists:", fileExists, "Looking for:", fileName)
    console.log("Files in directory:", fileList?.map((f) => f.name))

    if (!fileExists) {
      return {
        success: false,
        step: "fileNotFound",
        storagePath,
        fileName,
        filesFound: fileList?.map((f) => f.name) || [],
      }
    }

    // Step 2: Try to create signed URL
    console.log("Step 2: Creating signed URL...")
    const { data, error: signError } = await supabase.storage
      .from("exam-papers")
      .createSignedUrl(storagePath, 3600)

    if (signError) {
      console.error("Error creating signed URL:", signError)
      return {
        success: false,
        step: "createSignedUrl",
        error: signError.message,
        storagePath,
      }
    }

    console.log("Signed URL created successfully")

    // Step 3: Try to download/access the file
    console.log("Step 3: Testing file access...")
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("exam-papers")
      .download(storagePath)

    if (downloadError) {
      console.warn("Warning - could not download file:", downloadError.message)
      // This is just a warning, the signed URL still works
    } else {
      console.log("File successfully downloaded, size:", fileData?.size)
    }

    return {
      success: true,
      storagePath,
      fileName,
      signedUrl: data?.signedUrl,
      fileSize: fileData?.size,
    }
  } catch (error) {
    console.error("Error in testSignedUrl:", error)
    return {
      success: false,
      step: "exception",
      error: error instanceof Error ? error.message : "Unknown error",
      storagePath,
    }
  }
}
