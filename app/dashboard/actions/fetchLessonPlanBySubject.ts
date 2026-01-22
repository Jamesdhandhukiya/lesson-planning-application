"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function fetchLessonPlanBySubjectId(subjectId: string) {
  try {
    if (!subjectId) {
      return { success: false, error: "Subject ID is required" }
    }

    // Get the lesson plan for this subject with all related data
    const { data: form, error } = await supabase
      .from("forms")
      .select(`
        *,
        subjects(id, name, code, department_id, departments(id, name, abbreviation_depart)),
        users:faculty_id(id, name, email)
      `)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) {
      console.error("Error fetching lesson plan:", error)
      return { success: false, error: "Failed to fetch lesson plan" }
    }

    if (!form || form.length === 0) {
      return { success: false, error: "Lesson plan not found" }
    }

    const formData = form[0]
    const formContent = formData.form || formData
    
    return {
      success: true,
      data: {
        form: formContent,
        generalDetails: formContent.generalDetails || {},
        cies: formContent.cies || [],
        units: formContent.units || formContent.unitPlanning?.units || [],
        practicals: formContent.practicals || formContent.practicalPlanning?.practicals || [],
        subjects: formData.subjects,
        users: formData.users,
        metadata: formData.metadata,
      },
    }
  } catch (error) {
    console.error("Error in fetchLessonPlanBySubjectId:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
