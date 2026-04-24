import { useState, useEffect } from 'react'
import {
  getAllProfiles, getCourses, getAllEnrollments,
  enroll, unenroll, updateProfile, getAllProgress
} from '../../lib/supabase'
import Modal from '../../components/shared/Modal'
import ProgressBar from '../../components/shared/ProgressBar'

export default function AdminStudents() {
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [progress, setProgress] = useState([])
  const [modal, setModal] = useState(null) // null | { type: 'add' | 'edit', student? }
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [profiles, c, e, p] = await Promise.all([
        getAllProfiles(), getCourses(), getAllEnrollments(), getAllProgress()
      ])
      setStudents(profiles.filter(p => p.role !== 'admin'))
      setCourses(c)
      setEnrollments(e)
      setProgress(p)
    } finally { setLoading(false) }
  }

  function openAdd() {
    setForm({ email: '', password: '', full_name: '', enrollCourses: [] })
    setError('')
    setModal({ type: 'add' })
  }

  function openEdit(student) {
    const enrolled = enrollments.filter(e => e.user_id === student.id).map(e => e.course_id)
    setForm({ full_name: student.full_name, enrollCourses: enrolled })
    setError('')
    setModal({ type: 'edit', student })
  }

  async function handleAdd() {
    if (!form.email || !form.password || !form.full_name) {
      setError('Completa todos los campos'); return
    }
    setSaving(true)
    setError('')
    try {
      // Call Supabase edge function to create user
      const { data, error: fnError } = await import('../../lib/supabase').then(m =>
        m.supabase.functions.invoke('create-user', {
          body: { email: form.email, password: form.password, full_name: form.full_name, role: 'student' }
        })
      )
      if (fnError) throw new Error(fnError.message)
      const newUserId = data.user_id
      // Enroll in selected courses
      for (const cid of (form.enrollCourses || [])) {
        await enroll(newUserId, cid)
      }
      setModal(null)
      await loadData()
    } catch (e) {
      setError(e.message || 'Error al crear el estudiante')
    } finally { setSaving(false) }
  }

  async function handleEdit() {
    setSaving(true)
    setError('')
    try {
      const s = modal.student
      await updateProfile(s.id, { full_name: form.full_name })
      // Update enrollments
      const current = enrollments.filter(e => e.user_id === s.id).map(e => e.course_id)
      const toAdd = (form.enrollCourses || []).filter(c => !current.includes(c))
      const toRemove = current.filter(c => !(form.enrollCourses || []).includes(c))
      for (const cid of toAdd) await enroll(s.id, cid)
      for (const cid of toRemove) await unenroll(s.id, cid)
      setModal(null)
      await loadData()
    } catch (e) {
      setError(e.message)
    } finally { setSaving(false) }
  }

  function toggleCourse(cid) {
    setForm(f => {
      const has = f.enrollCourses.includes(cid)
      return { ...f, enrollCourses: has ? f.enrollCourses.filter(x => x !== cid) : [...f.enrollCourses, cid] }
    })
  }

  function studentPct(sid) {
    const se = enrollments.filter(e => e.user_id === sid)
    let total = 0, done = 0
    se.forEach(e => {
      const c = courses.find(x => x.id === e.course_id)
      if (c) c.modules.forEach(m => { total += m.lessons.length })
      done += progress.filter(p => p.user_id === sid && p.course_id === e.course_id && p.completed).length
    })
    return total > 0 ? Math.round((done / total) * 100) : 0
  }

  if (loading) return <div className="loading-screen"><div><div className="spinner" /></div></div>

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Estudiantes</div>
          <div className="page-sub">{students.length} estudiantes registrados</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={openAdd}>+ Agregar estudiante</button>
        </div>
      </div>

      <div className="card">
        {students.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-title">Sin estudiantes aún</div>
            <div className="empty-sub">Agrega tu primer estudiante para comenzar.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Cursos inscritos</th>
                  <th>Progreso</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const pct = studentPct(s.id)
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
                      <td>{enrolled}</td>
                      <td><ProgressBar value={pct} width="140px" /></td>
                      <td>
                        <span className={`badge ${pct === 100 ? 'badge-green' : pct > 0 ? 'badge-amber' : 'badge-gray'}`}>
                          {pct === 100 ? 'Completado' : pct > 0 ? 'En progreso' : 'Sin iniciar'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-8">
                          <button className="btn" onClick={() => openEdit(s)}>Editar</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <Modal
          title={modal.type === 'add' ? 'Agregar estudiante' : 'Editar estudiante'}
          subtitle={modal.type === 'add' ? 'El estudiante podrá iniciar sesión inmediatamente' : modal.student.full_name}
          onClose={() => setModal(null)}
        >
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="form-group">
            <label className="form-label">Nombre completo</label>
            <input className="form-input" value={form.full_name || ''} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Ana Martínez" />
          </div>

          {modal.type === 'add' && (
            <>
              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <input className="form-input" type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ana@ejemplo.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input className="form-input" type="password" value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Cursos a inscribir</label>
            {courses.map(c => (
              <label key={c.id} className="form-check">
                <input
                  type="checkbox"
                  checked={(form.enrollCourses || []).includes(c.id)}
                  onChange={() => toggleCourse(c.id)}
                  style={{ width: 'auto' }}
                />
                {c.icon || '📚'} {c.name}
              </label>
            ))}
          </div>

          <div className="modal-actions">
            <button className="btn" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={modal.type === 'add' ? handleAdd : handleEdit} disabled={saving}>
              {saving ? 'Guardando...' : modal.type === 'add' ? 'Crear estudiante' : 'Guardar cambios'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
