"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function addHODRole(emailOrName: string, departmentId: string) {
  try {
    // Find user by email or name
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email, name")
      .or(`email.ilike.%${emailOrName}%,name.ilike.%${emailOrName}%`)
      .limit(1)

    if (userError || !users || users.length === 0) {
      return { success: false, error: "User not found" }
    }

    const userId = users[0].id
    console.log(`Found user: ${users[0].name} (${users[0].email})`)

    // Check if HOD role already exists
    const { data: existing } = await supabase
      .from("user_role")
      .select("id")
      .eq("user_id", userId)
      .eq("role_name", "HOD")

    if (existing && existing.length > 0) {
      return { success: false, error: "User already has HOD role" }
    }

    // Add HOD role
    const { data, error } = await supabase
      .from("user_role")
      .insert([
        {
          user_id: userId,
          role_name: "HOD",
          depart_id: departmentId,
        },
      ])
      .select()

    if (error) {
      console.error("Error adding HOD role:", error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      message: `HOD role added successfully to ${users[0].name}`,
      data,
    }
  } catch (error) {
    console.error("Error in addHODRole:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function getUsers(searchTerm: string) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name")
      .or(`email.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
      .limit(10)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in getUsers:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function getDepartments() {
  try {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name")
      .order("name")

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in getDepartments:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
