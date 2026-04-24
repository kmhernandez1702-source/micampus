import { useState, useEffect } from 'react'
import { getCourses, getAllProfiles, getAllEnrollments, getAllProgress } from '../../lib/supabase'
import ProgressBar from '../../components/shared/ProgressBar'

export default function AdminProgress() {
  const [data, setData] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [courses, profiles, enrollments, progress] = await Promise.all([
        getCourses(), getAllProfiles(), getAllEnrollments(), getAllProgress()
      ])
      const students = profiles.filter(p => p.role !== 'admin')
      setData({ courses, students, enrollments, progress })
    } finally { setLoading(false) }
  }

  if (loading || !data) return <div className="loading-screen"><div><div className="spinner" /></div></div>

  const { courses, students, enrollments, progress } = data

  // Build rows: one per student-course pair
  const rows = students.flatMap(s =>
    enrollments.filter(e => e.user_id === s.id).map(e => {
      const c = courses.find(x => x.id === e.course_id)
      if (!c) return null
      let total = 0
      c.modules.forEach(m => { total += m.lessons.length })
      const done = progress.filter(p => p.user_id === s.id && p.course_id === c.id && p.completed).length
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      const status = pct === 100 ? 'done' : pct > 0 ? 'progress' : 'pending'
      return { student: s, course: c, total, done, pct, status }
    }).filter(Boolean)
  )

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Progreso global</div>
          <div className="page-sub">Seguimiento de todos los estudiantes por curso</div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-bg)' }}>🏆</div>
          <div className="stat-num">{rows.filter(r => r.status === 'done').length}</div>
          <div className="stat-label">Cursos completados</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--warn-bg)' }}>📖</div>
          <div className="stat-num">{rows.filter(r => r.status === 'progress').length}</div>
          <div className="stat-label">En progreso</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--locked-bg)' }}>⏸</div>
          <div className="stat-num">{rows.filter(r => r.status === 'pending').length}</div>
          <div className="stat-label">Sin iniciar</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--teal-light)' }}>📊</div>
          <div className="stat-num">
            {rows.length > 0 ? Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length) : 0}%
          </div>
          <div className="stat-label">Promedio general</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { value: 'all', label: 'Todos' },
          { value: 'progress', label: 'En progreso' },
          { value: 'pending', label: 'Sin iniciar' },
          { value: 'done', label: 'Completados' },
        ].map(f => (
          <button
            key={f.value}
            className="btn"
            onClick={() => setFilter(f.value)}
            style={filter === f.value ? { background: 'var(--teal)', borderColor: 'var(--teal)', color: 'white' } : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-title">Sin resultados</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Curso</th>
                  <th>Completadas</th>
                  <th>Total</th>
                  <th>Progreso</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const initials = r.student.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
                  return (
                    <tr key={i}>
                      <td>
                        <div className="flex-center gap-8">
                          <div className="avatar">{initials}</div>
                          <span className="fw-500">{r.student.full_name}</span>
                        </div>
                      </td>
                      <td>
                        <span>{r.course.icon} {r.course.name}</span>
                      </td>
                      <td><strong style={{ color: 'var(--teal)' }}>{r.done}</strong></td>
                      <td className="text-gray">{r.total}</td>
                      <td><ProgressBar value={r.pct} width="130px" /></td>
                      <td>
                        <span className={`badge ${r.status === 'done' ? 'badge-green' : r.status === 'progress' ? 'badge-amber' : 'badge-gray'}`}>
                          {r.status === 'done' ? '✓ Completo' : r.status === 'progress' ? 'En progreso' : 'Pendiente'}
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
    </>
  )
}
