import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return { id: userId, role: 'student', full_name: '', email: '' }
  return data
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')
  if (error) throw error
  return data || []
}

export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
  if (error) throw error
}

export async function getCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select(`*, modules (*, lessons (*))`)
    .order('created_at')
  if (error) throw error
  return (data || []).map(course => ({
    ...course,
    modules: (course.modules || [])
      .sort((a, b) => a.order_index - b.order_index)
      .map(mod => ({
        ...mod,
        lessons: (mod.lessons || []).sort((a, b) => a.order_index - b.order_index)
      }))
  }))
}

export async function getCourse(courseId) {
  const { data, error } = await supabase
    .from('courses')
    .select(`*, modules (*, lessons (*))`)
    .eq('id', courseId)
    .single()
  if (error) throw error
  return {
    ...data,
    modules: (data.modules || [])
      .sort((a, b) => a.order_index - b.order_index)
      .map(mod => ({
        ...mod,
        lessons: (mod.lessons || []).sort((a, b) => a.order_index - b.order_index)
      }))
  }
}

export async function createCourse(courseData) {
  const { data, error } = await supabase.from('courses').insert(courseData).select().single()
  if (error) throw error
  return data
}

export async function updateCourse(courseId, updates) {
  const { error } = await supabase.from('courses').update(updates).eq('id', courseId)
  if (error) throw error
}

export async function deleteCourse(courseId) {
  const { error } = await supabase.from('courses').delete().eq('id', courseId)
  if (error) throw error
}

export async function createModule(moduleData) {
  const { data, error } = await supabase.from('modules').insert(moduleData).select().single()
  if (error) throw error
  return data
}

export async function deleteModule(moduleId) {
  const { error } = await supabase.from('modules').delete().eq('id', moduleId)
  if (error) throw error
}

export async function createLesson(lessonData) {
  const { data, error } = await supabase.from('lessons').insert(lessonData).select().single()
  if (error) throw error
  return data
}

export async function updateLesson(lessonId, updates) {
  const { error } = await supabase.from('lessons').update(updates).eq('id', lessonId)
  if (error) throw error
}

export async function deleteLesson(lessonId) {
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId)
  if (error) throw error
}

export async function getEnrollments(userId) {
  const { data, error } = await supabase.from('enrollments').select('course_id').eq('user_id', userId)
  if (error) throw error
  return (data || []).map(e => e.course_id)
}

export async function enroll(userId, courseId) {
  const { error } = await supabase.from('enrollments').upsert({ user_id: userId, course_id: courseId })
  if (error) throw error
}

export async function unenroll(userId, courseId) {
  const { error } = await supabase.from('enrollments').delete().eq('user_id', userId).eq('course_id', courseId)
  if (error) throw error
}

export async function getAllEnrollments() {
  const { data, error } = await supabase.from('enrollments').select('*')
  if (error) throw error
  return data || []
}

export async function getProgress(userId, courseId) {
  const { data, error } = await supabase.from('progress').select('*').eq('user_id', userId).eq('course_id', courseId)
  if (error) throw error
  return data || []
}

export async function markLessonComplete(userId, courseId, lessonId) {
  const { error } = await supabase.from('progress').upsert({
    user_id: userId, course_id: courseId, lesson_id: lessonId,
    completed: true, completed_at: new Date().toISOString()
  }, { onConflict: 'user_id,lesson_id' })
  if (error) throw error
}

export async function markTaskSubmitted(userId, courseId, lessonId) {
  const { error } = await supabase.from('progress').upsert({
    user_id: userId, course_id: courseId, lesson_id: lessonId,
    task_submitted: true, task_submitted_at: new Date().toISOString()
  }, { onConflict: 'user_id,lesson_id' })
  if (error) throw error
}

export async function getAllProgress() {
  const { data, error } = await supabase.from('progress').select('*')
  if (error) throw error
  return data || []
}

export async function adminCreateUser(email, password, fullName, role = 'student') {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: { email, password, full_name: fullName, role }
  })
  if (error) throw error
  return data
}
