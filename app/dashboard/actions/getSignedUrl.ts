"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function getSignedUrl(storagePath: string) {
  try {
    if (!storagePath) {
      return { success: false, error: "Storage path is required" }
    }

    console.log("Creating signed URL for:", storagePath)

    const { data, error } = await supabase.storage
      .from("exam-papers")
      .createSignedUrl(storagePath, 3600)

    if (error) {
      console.error("Error creating signed URL:", error)
      return { success: false, error: error.message }
    }

    if (!data?.signedUrl) {
      return { success: false, error: "No signed URL returned" }
    }

    console.log("Signed URL created successfully")
    return { success: true, signedUrl: data.signedUrl }
  } catch (error) {
    console.error("Error in getSignedUrl:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
