import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getCourses, getEnrollments, getProgress } from '../../lib/supabase'
import ProgressBar from '../../components/shared/ProgressBar'

export default function StudentCourses() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    setLoading(true)
    try {
      const [all, enrolled] = await Promise.all([getCourses(), getEnrollments(user.id)])
      const mine = all.filter(c => enrolled.includes(c.id))
      setCourses(mine)
      const pm = {}
      for (const c of mine) { pm[c.id] = await getProgress(user.id, c.id) }
      setProgressMap(pm)
    } finally { setLoading(false) }
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

  function goToCourse(course) {
    const allLessons = course.modules.flatMap(m => m.lessons)
    if (allLessons[0]) navigate(`/student/curso/${course.id}/leccion/${allLessons[0].id}`)
  }

  if (loading) return <div className="loading-screen"><div><div className="spinner" /></div></div>

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Mis cursos</div>
          <div className="page-sub">Todos tus cursos disponibles</div>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-title">Sin cursos aún</div>
          <div className="empty-sub">El administrador te inscribirá en los cursos disponibles.</div>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map(course => {
            const { total, done, pct } = calcProgress(course)
            return (
              <div key={course.id} className="course-card" onClick={() => goToCourse(course)}>
                <div className="course-thumb" style={{ background: course.color || 'var(--teal-light)' }}>
                  {course.icon || '📚'}
                </div>
                <div className="course-body">
                  <div className="course-name">{course.name}</div>
                  <div className="course-desc">{course.description}</div>
                  <div className="course-meta">
                    <span>{course.modules.length} módulos</span>
                    <span>{total} clases</span>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <ProgressBar value={pct} />
                  </div>
                  <span className={`badge ${pct === 100 ? 'badge-green' : pct > 0 ? 'badge-amber' : 'badge-gray'}`}>
                    {pct === 100 ? '✓ Completado' : pct > 0 ? 'En progreso' : 'Sin iniciar'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
