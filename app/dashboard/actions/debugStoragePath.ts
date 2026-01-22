"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function debugStoragePath(storagePath: string) {
  try {
    console.log("Debug: Checking storage path:", storagePath)

    // Extract directory path
    const lastSlashIndex = storagePath.lastIndexOf("/")
    const dirPath = lastSlashIndex > 0 ? storagePath.substring(0, lastSlashIndex) : ""
    console.log("Debug: Listing files in directory:", dirPath || "(root)")

    const { data: files, error: listError } = await supabase.storage
      .from("exam-papers")
      .list(dirPath, {
        limit: 100,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      })

    if (listError) {
      console.error("Debug: Error listing files:", listError)
      return {
        success: false,
        error: listError.message,
        debug: {
          storagePath,
          dirPath,
          message: "Could not list directory",
        },
      }
    }

    console.log("Debug: Files found:", files?.length)
    files?.forEach((file) => {
      console.log("  -", file.name)
    })

    // Check if our file exists
    const fileName = storagePath.split("/").pop()
    const fileExists = files?.some((f) => f.name === fileName)

    if (fileExists) {
      return {
        success: true,
        fileExists: true,
        debug: {
          storagePath,
          fileName,
          directoryContents: files,
          message: "File exists in storage",
        },
      }
    } else {
      return {
        success: false,
        fileExists: false,
        debug: {
          storagePath,
          fileName,
          expectedFile: fileName,
          directoryContents: files,
          message: "File not found in storage",
        },
      }
    }
  } catch (error) {
    console.error("Debug error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
