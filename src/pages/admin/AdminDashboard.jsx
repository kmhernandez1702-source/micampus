import { useState, useEffect } from 'react'
import { getCourses, getAllProfiles, getAllEnrollments, getAllProgress } from '../../lib/supabase'
import ProgressBar from '../../components/shared/ProgressBar'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [courses, profiles, enrollments, progress] = await Promise.all([
        getCourses(), getAllProfiles(), getAllEnrollments(), getAllProgress()
      ])
      const students = profiles.filter(p => p.role !== 'admin')
      let totalLessons = 0
      courses.forEach(c => c.modules.forEach(m => { totalLessons += m.lessons.length }))
      const totalCompleted = progress.filter(p => p.completed).length

      setStats({ courses, students, enrollments, progress, totalLessons, totalCompleted })
    } finally { setLoading(false) }
  }

  if (loading || !stats) return <div className="loading-screen"><div><div className="spinner" /></div></div>

  const { courses, students, enrollments, progress, totalLessons, totalCompleted } = stats

  function studentProgress(studentId) {
    const studentEnrolled = enrollments.filter(e => e.user_id === studentId)
    let total = 0, done = 0
    studentEnrolled.forEach(e => {
      const c = courses.find(x => x.id === e.course_id)
      if (!c) return
      c.modules.forEach(m => { total += m.lessons.length })
      done += progress.filter(p => p.user_id === studentId && p.course_id === e.course_id && p.completed).length
    })
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Resumen general de la plataforma</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--teal-light)' }}>👥</div>
          <div className="stat-num">{students.length}</div>
          <div className="stat-label">Estudiantes activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ede9fe' }}>📚</div>
          <div className="stat-num">{courses.length}</div>
          <div className="stat-label">Cursos publicados</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-bg)' }}>🎬</div>
          <div className="stat-num">{totalLessons}</div>
          <div className="stat-label">Total de clases</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--warn-bg)' }}>✅</div>
          <div className="stat-num">{totalCompleted}</div>
          <div className="stat-label">Clases completadas</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Progreso de estudiantes</div>
        </div>
        {students.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-title">Sin estudiantes aún</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Cursos</th>
                  <th>Progreso general</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const { total, done, pct } = studentProgress(s.id)
                  const enrolled = enrollments.filter(e => e.user_id === s.id).length
                  const initials = s.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="flex-center gap-10">
                          <div className="avatar">{initials}</div>
                          <div>
                            <div className="fw-500">{s.full_name}</div>
                            <div className="text-sm text-gray">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{enrolled} cursos</td>
                      <td><ProgressBar value={pct} width="160px" /></td>
                      <td>
                        <span className={`badge ${pct === 100 ? 'badge-green' : pct > 0 ? 'badge-amber' : 'badge-gray'}`}>
                          {pct === 100 ? 'Completado' : pct > 0 ? 'En progreso' : 'Sin iniciar'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Cursos activos</div>
        </div>
        <div className="card-body">
          <div className="courses-grid">
            {courses.map(c => {
              let lessons = 0
              c.modules.forEach(m => { lessons += m.lessons.length })
              const enrolled = enrollments.filter(e => e.course_id === c.id).length
              return (
                <div key={c.id} className="course-card" style={{ cursor: 'default' }}>
                  <div className="course-thumb" style={{ background: c.color || 'var(--teal-light)' }}>
                    {c.icon || '📚'}
                  </div>
                  <div className="course-body">
                    <div className="course-name">{c.name}</div>
                    <div className="course-desc">{c.description}</div>
                    <div className="course-meta">
                      <span>{c.modules.length} módulos · {lessons} clases</span>
                      <span>{enrolled} inscritos</span>
                    </div>
                    <span className="badge badge-teal">Publicado</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
