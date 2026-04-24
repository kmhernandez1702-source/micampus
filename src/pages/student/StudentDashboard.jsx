import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getCourses, getEnrollments, getProgress } from '../../lib/supabase'
import ProgressBar from '../../components/shared/ProgressBar'

export default function StudentDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [enrolledCourses, setEnrolledCourses] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  async function loadData() {
    setLoading(true)
    try {
      const [allCourses, enrolledIds] = await Promise.all([
        getCourses(),
        getEnrollments(user.id)
      ])
      const myC = allCourses.filter(c => enrolledIds.includes(c.id))
      setEnrolledCourses(myC)

      const pm = {}
      for (const c of myC) {
        pm[c.id] = await getProgress(user.id, c.id)
      }
      setProgressMap(pm)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function calcProgress(course) {
    let total = 0, done = 0
    course.modules.forEach(m => {
      total += m.lessons.length
      m.lessons.forEach(l => {
        if ((progressMap[course.id] || []).find(p => p.lesson_id === l.id && p.completed)) done++
      })
    })
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }

  const totalLessons = enrolledCourses.reduce((acc, c) => {
    c.modules.forEach(m => acc += m.lessons.length)
    return acc
  }, 0)

  const totalDone = enrolledCourses.reduce((acc, c) => {
    return acc + (progressMap[c.id] || []).filter(p => p.completed).length
  }, 0)

  if (loading) return <div className="loading-screen"><div><div className="spinner" /><div>Cargando...</div></div></div>

  const firstName = profile?.full_name?.split(' ')[0] || 'Estudiante'

  function goToFirstLesson(course) {
    const allLessons = course.modules.flatMap(m => m.lessons)
    const prog = progressMap[course.id] || []
    // Find first unlocked incomplete lesson
    for (let i = 0; i < allLessons.length; i++) {
      const l = allLessons[i]
      const done = prog.find(p => p.lesson_id === l.id && p.completed)
      if (!done) {
        navigate(`/student/curso/${course.id}/leccion/${l.id}`)
        return
      }
    }
    // All done — go to first
    if (allLessons[0]) navigate(`/student/curso/${course.id}/leccion/${allLessons[0].id}`)
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">¡Hola, {firstName}! 👋</div>
          <div className="page-sub">Aquí está tu resumen de aprendizaje</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--teal-light)' }}>📚</div>
          <div className="stat-num">{enrolledCourses.length}</div>
          <div className="stat-label">Cursos activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-bg)' }}>✅</div>
          <div className="stat-num">{totalDone}</div>
          <div className="stat-label">Clases completadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--warn-bg)' }}>⏳</div>
          <div className="stat-num">{totalLessons - totalDone}</div>
          <div className="stat-label">Clases pendientes</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ede9fe' }}>🎯</div>
          <div className="stat-num">{totalLessons > 0 ? Math.round((totalDone / totalLessons) * 100) : 0}%</div>
          <div className="stat-label">Progreso general</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Mis cursos en progreso</div></div>
        <div className="card-body">
          {enrolledCourses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-title">Sin cursos aún</div>
              <div className="empty-sub">El administrador te inscribirá en los cursos disponibles.</div>
            </div>
          ) : (
            <div className="courses-grid">
              {enrolledCourses.map(course => {
                const { total, done, pct } = calcProgress(course)
                return (
                  <div key={course.id} className="course-card" onClick={() => goToFirstLesson(course)}>
                    <div className="course-thumb" style={{ background: course.color || 'var(--teal-light)' }}>
                      {course.icon || '📚'}
                    </div>
                    <div className="course-body">
                      <div className="course-name">{course.name}</div>
                      <div className="course-desc">{course.description}</div>
                      <div className="course-meta">
                        <span>{total} clases</span>
                        <span>{done} completadas</span>
                      </div>
                      <ProgressBar value={pct} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
