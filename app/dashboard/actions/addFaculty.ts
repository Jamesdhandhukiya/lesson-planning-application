"use server"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/adminClient"

export const addFaculty = async (formData: FormData) => {
  try {
    const email = formData.get("email") as string
    const name = formData.get("name") as string
    const departId = formData.get("departId") as string
    const subjectId = formData.get("subjectId") as string
    const academicYear = formData.get("academicYear") as string
    const division = formData.get("division") as string
    const isCourseOwner = formData.get("isCourseOwner") === "true"

    const supabaseAdmin = createAdminClient()
    const supabase = await createClient()

    // Check if user already exists in users table
    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("auth_id, id, email, name")
      .eq("email", email)
      .single()

    let authUserId: string
    let userData: any

    if (existingUser) {
      authUserId = existingUser.auth_id
      userData = existingUser

      if (existingUser.name !== name) {
        const { data: updatedUser, error: updateError } = await supabase
          .from("users")
          .update({ name })
          .eq("auth_id", existingUser.auth_id)
          .select("*")
          .single()

        if (updateError) {
          console.error("Error updating user name:", updateError)
          return { success: false, error: updateError.message }
        }
        userData = updatedUser
      }
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: "depstar@charusat",
        email_confirm: true,
      })

      if (authError) {
        console.error("Auth error:", authError)
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: "Failed to create user" }
      }

      authUserId = authData.user.id

      const { data: newUserData, error: userError } = await supabase
        .from("users")
        .insert({
          auth_id: authUserId,
          name,
          email,
        })
        .select("*")
        .single()

      if (userError) {
        console.error("User table error:", userError)
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        return { success: false, error: userError.message }
      }

      userData = newUserData
    }

    const { data: existingRole, error: roleCheckError } = await supabase
      .from("user_role")
      .select("*")
      .eq("user_id", userData.id)
      .eq("role_name", "Faculty")
      .eq("depart_id", departId)
      .eq("subject_id", subjectId || null)
      .single()

    if (existingRole) {
      return { success: false, error: "Faculty role already exists for this user and subject" }
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_role")
      .insert({
        user_id: authUserId,
        role_name: "Faculty",
        depart_id: departId,
        subject_id: subjectId || null,
        academic_year: academicYear,
        division,
      })
      .select("*")
      .single()

    if (roleError) {
      console.error("User role error:", roleError)
      if (!existingUser) {
        await supabase.from("users").delete().eq("auth_id", authUserId)
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
      }
      return { success: false, error: roleError.message }
    }

    if (isCourseOwner && subjectId) {
      const { error: coError } = await supabase.from("user_role").insert({
        user_id: authUserId,
        role_name: "Course Owner",
        depart_id: departId,
        subject_id: subjectId,
        academic_year: academicYear,
        division,
      })
      if (coError) {
        console.error("Course owner role error:", coError)
      }
    }

    return {
      success: true,
      data: {
        user: userData,
        role: roleData,
        isNewUser: !existingUser,
      },
    }
  } catch (error) {
    console.error("Unexpected error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export const editFaculty = async (formData: FormData) => {
  try {
    const id = formData.get("id") as string
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const academicYear = formData.get("academicYear") as string
    const division = formData.get("division") as string

    const subjectIds: string[] = []
    let index = 0
    while (formData.has(`subjectIds[${index}]`)) {
      const subjectId = formData.get(`subjectIds[${index}]`) as string
      if (subjectId) {
        subjectIds.push(subjectId)
      }
      index++
    }

    const courseOwnerSubjectIds: string[] = []
    let coIndex = 0
    while (formData.has(`courseOwnerSubjectIds[${coIndex}]`)) {
      const subjectId = formData.get(`courseOwnerSubjectIds[${coIndex}]`) as string
      if (subjectId) {
        courseOwnerSubjectIds.push(subjectId)
      }
      coIndex++
    }

    if (subjectIds.length === 0) {
      return { success: false, error: "At least one subject must be selected" }
    }

    const supabase = await createClient()

    // 1. Get the current user_role and user info
    const { data: currentRole, error: getCurrentError } = await supabase
      .from("user_role")
      .select("user_id, depart_id")
      .eq("id", id)
      .single()

    if (getCurrentError || !currentRole) {
      return { success: false, error: "Record not found: " + (getCurrentError?.message || "") }
    }

    // 2. Find the user systematically to get BOTH Postgres ID and Auth ID
    const { data: userDataProfile, error: userFetchError } = await supabase
      .from("users")
      .select("id, auth_id")
      .or(`id.eq.${currentRole.user_id},auth_id.eq.${currentRole.user_id}`)
      .single()

    if (userFetchError || !userDataProfile) {
      return { success: false, error: "User not found: " + (userFetchError?.message || "") }
    }

    const postgresUserId = userDataProfile.id;
    const authUserId = userDataProfile.auth_id;

    // 3. Update user contact info
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({ name, email })
      .eq("id", postgresUserId)

    if (userUpdateError) {
      return { success: false, error: "Failed to update user profile: " + userUpdateError.message }
    }

    // 4. Delete existing roles (Faculty and Course Owner) for this user in this department
    // Delete by BOTH possible IDs to be thorough during migration
    const { error: deleteError } = await supabase
      .from("user_role")
      .delete()
      .or(`user_id.eq.${postgresUserId},user_id.eq.${authUserId}`)
      .in("role_name", ["Faculty", "Course Owner"])
      .eq("depart_id", currentRole.depart_id)

    if (deleteError) {
      return { success: false, error: "Failed to clear old roles: " + deleteError.message }
    }

    // 5. Insert new roles (always use Auth ID for the user_role table)
    const roleEntries = subjectIds.map((subjectId) => ({
      user_id: authUserId,
      role_name: "Faculty",
      depart_id: currentRole.depart_id,
      subject_id: subjectId,
      academic_year: academicYear,
      division,
    }))
    
    courseOwnerSubjectIds.forEach((subjectId) => {
      roleEntries.push({
        user_id: authUserId,
        role_name: "Course Owner",
        depart_id: currentRole.depart_id,
        subject_id: subjectId,
        academic_year: academicYear,
        division,
      })
    })

    const { data: roleData, error: roleError } = await supabase
      .from("user_role")
      .insert(roleEntries)
      .select("*")

    if (roleError) {
      return { success: false, error: "Failed to assign new roles: " + roleError.message }
    }

    return { success: true, data: { user: userDataProfile, roles: roleData } }
  } catch (error) {
    console.error("Unexpected error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export const deleteFaculty = async (userAuthId: string, departmentId: string) => {
  try {
    const supabase = await createClient()

    const { error: roleDeleteError } = await supabase
      .from("user_role")
      .delete()
      .eq("user_id", userAuthId)
      .in("role_name", ["Faculty", "Course Owner"])
      .eq("depart_id", departmentId)

    if (roleDeleteError) {
      console.error("Error deleting user roles:", roleDeleteError)
      return { success: false, error: roleDeleteError.message }
    }

    return { success: true, deletedUser: false }
  } catch (error) {
    console.error("Unexpected error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export const deleteFacultyRole = async (roleId: string) => {
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    const { data: roleData, error: getRoleError } = await supabase
      .from("user_role")
      .select("user_id")
      .eq("id", roleId)
      .single()

    if (getRoleError) {
      return { success: false, error: getRoleError.message }
    }

    const { error: roleDeleteError } = await supabase.from("user_role").delete().eq("id", roleId)

    if (roleDeleteError) {
      return { success: false, error: roleDeleteError.message }
    }

    const { data: otherRoles, error: checkRolesError } = await supabase
      .from("user_role")
      .select("id")
      .eq("user_id", roleData.user_id)

    if (checkRolesError) {
      return { success: false, error: checkRolesError.message }
    }

    if (otherRoles.length === 0) {
      const { error: userDeleteError } = await supabase.from("users").delete().eq("auth_id", roleData.user_id)

      if (userDeleteError) {
        console.error("Error deleting from users table:", userDeleteError)
      }

      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(roleData.user_id)

      if (authDeleteError) {
        console.error("Error deleting from auth:", authDeleteError)
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
