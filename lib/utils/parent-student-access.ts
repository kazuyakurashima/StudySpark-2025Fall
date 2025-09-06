import { createClient } from '@/lib/supabase/server'

export interface ParentStudentRelation {
  parent_id: string
  student_id: string
  relationship_type: 'parent' | 'guardian'
  created_at: string
  updated_at: string
}

export interface AccessCheckResult {
  hasAccess: boolean
  relation?: ParentStudentRelation
  error?: string
}

/**
 * Check if a parent has access to a student's data
 */
export async function checkParentStudentAccess(
  parentId: string,
  studentId: string
): Promise<AccessCheckResult> {
  try {
    const supabase = await createClient()

    // Validate UUIDs
    if (!isValidUUID(parentId) || !isValidUUID(studentId)) {
      return {
        hasAccess: false,
        error: '無効なIDが指定されました'
      }
    }

    // Check if relation exists
    const { data: relation, error } = await supabase
      .from('parent_student_relations')
      .select('*')
      .eq('parent_id', parentId)
      .eq('student_id', studentId)
      .single()

    if (error) {
      // No relation found or database error
      if (error.code === 'PGRST116') { // No rows returned
        return {
          hasAccess: false,
          error: 'この生徒の情報にアクセスする権限がありません'
        }
      }
      
      console.error('Database error checking parent-student relation:', error)
      return {
        hasAccess: false,
        error: 'データベースエラーが発生しました'
      }
    }

    return {
      hasAccess: true,
      relation
    }

  } catch (error) {
    console.error('Error checking parent-student access:', error)
    return {
      hasAccess: false,
      error: 'アクセス権限の確認中にエラーが発生しました'
    }
  }
}

/**
 * Get all students that a parent has access to
 */
export async function getParentStudents(parentId: string) {
  try {
    const supabase = await createClient()

    if (!isValidUUID(parentId)) {
      throw new Error('無効な保護者IDです')
    }

    const { data: relations, error } = await supabase
      .from('parent_student_relations')
      .select(`
        student_id,
        relationship_type,
        profiles!inner(
          id,
          display_name,
          avatar_url,
          created_at
        )
      `)
      .eq('parent_id', parentId)

    if (error) {
      console.error('Error fetching parent students:', error)
      throw new Error('生徒情報の取得に失敗しました')
    }

    return relations || []

  } catch (error) {
    console.error('Error in getParentStudents:', error)
    throw error
  }
}

/**
 * Check if user is authenticated as the specified parent
 */
export async function validateParentAuth(parentId: string) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        isValid: false,
        error: '認証が必要です'
      }
    }

    // Check if the authenticated user is the specified parent
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', parentId)
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        isValid: false,
        error: 'この保護者アカウントにアクセスする権限がありません'
      }
    }

    if (profile.role !== 'parent') {
      return {
        isValid: false,
        error: '保護者権限が必要です'
      }
    }

    return {
      isValid: true,
      userId: user.id,
      parentProfile: profile
    }

  } catch (error) {
    console.error('Error validating parent auth:', error)
    return {
      isValid: false,
      error: '認証の確認中にエラーが発生しました'
    }
  }
}

/**
 * Create or update parent-student relationship
 */
export async function createParentStudentRelation(
  parentId: string,
  studentId: string,
  relationshipType: 'parent' | 'guardian' = 'parent'
) {
  try {
    const supabase = await createClient()

    if (!isValidUUID(parentId) || !isValidUUID(studentId)) {
      throw new Error('無効なIDが指定されました')
    }

    const { data, error } = await supabase
      .from('parent_student_relations')
      .upsert({
        parent_id: parentId,
        student_id: studentId,
        relationship_type: relationshipType,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'parent_id,student_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating parent-student relation:', error)
      throw new Error('親子関係の作成に失敗しました')
    }

    return data

  } catch (error) {
    console.error('Error in createParentStudentRelation:', error)
    throw error
  }
}

/**
 * Remove parent-student relationship
 */
export async function removeParentStudentRelation(
  parentId: string,
  studentId: string
) {
  try {
    const supabase = await createClient()

    if (!isValidUUID(parentId) || !isValidUUID(studentId)) {
      throw new Error('無効なIDが指定されました')
    }

    const { error } = await supabase
      .from('parent_student_relations')
      .delete()
      .eq('parent_id', parentId)
      .eq('student_id', studentId)

    if (error) {
      console.error('Error removing parent-student relation:', error)
      throw new Error('親子関係の削除に失敗しました')
    }

    return { success: true }

  } catch (error) {
    console.error('Error in removeParentStudentRelation:', error)
    throw error
  }
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}