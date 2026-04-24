import { useState, useEffect } from 'react'
import {
  getCourses, createCourse, updateCourse, deleteCourse,
  createModule, deleteModule, createLesson, updateLesson, deleteLesson
} from '../../lib/supabase'
import Modal from '../../components/shared/Modal'

const COLORS = [
  { label: 'Verde agua', value: '#e8f5f3' },
  { label: 'Ámbar', value: '#fef3c7' },
  { label: 'Violeta', value: '#ede9fe' },
  { label: 'Rosa', value: '#fce7f3' },
  { label: 'Verde', value: '#dcfce7' },
  { label: 'Azul', value: '#dbeafe' },
]

const EMOJIS = ['📚', '📊', '🚀', '💡', '🎯', '🏆', '🔬', '💻', '🎨', '📝', '🌟', '⚡']

export default function AdminCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null) // courseId being edited inline

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try { setCourses(await getCourses()) } finally { setLoading(false) }
  }

  // ── Course CRUD ──
  function openAddCourse() {
    setForm({ name: '', description: '', icon: '📚', color: '#e8f5f3' })
    setModal({ type: 'course' })
  }

  async function saveCourse() {
    if (!form.name) return
    setSaving(true)
    try {
      if (form.id) {
        await updateCourse(form.id, { name: form.name, description: form.description, icon: form.icon, color: form.color })
      } else {
        await createCourse({ name: form.name, description: form.description, icon: form.icon, color: form.color })
      }
      setModal(null)
      await loadData()
    } finally { setSaving(false) }
  }

  async function handleDeleteCourse(courseId) {
    if (!confirm('¿Eliminar este curso y todo su contenido?')) return
    await deleteCourse(courseId)
    await loadData()
  }

  // ── Module CRUD ──
  const [moduleForm, setModuleForm] = useState({})
  const [addingModule, setAddingModule] = useState(null)

  async function handleAddModule(courseId) {
    if (!moduleForm[courseId]) return
    setSaving(true)
    try {
      const c = courses.find(x => x.id === courseId)
      const idx = c.modules.length
      await createModule({ course_id: courseId, name: moduleForm[courseId], order_index: idx })
      setModuleForm(f => ({ ...f, [courseId]: '' }))
      setAddingModule(null)
      await loadData()
    } finally { setSaving(false) }
  }

  async function handleDeleteModule(moduleId) {
    if (!confirm('¿Eliminar este módulo y todas sus clases?')) return
    await deleteModule(moduleId)
    await loadData()
  }

  // ── Lesson CRUD ──
  const [lessonModal, setLessonModal] = useState(null)
  const [lessonForm, setLessonForm] = useState({})

  function openAddLesson(module) {
    setLessonForm({
      module_id: module.id,
      course_id: module.course_id,
      name: '',
      description: '',
      video_id: '',
      has_task: false,
      task_name: '',
      task_url: '',
      task_instructions: '',
      order_index: module.lessons.length
    })
    setLessonModal({ type: 'add', moduleName: module.name })
  }

  function openEditLesson(lesson, module) {
    setLessonForm({ ...lesson, module_id: module.id, course_id: module.course_id })
    setLessonModal({ type: 'edit', moduleName: module.name })
  }

  async function saveLesson() {
    if (!lessonForm.name) return
    setSaving(true)
    try {
      if (lessonForm.id) {
        await updateLesson(lessonForm.id, lessonForm)
      } else {
        await createLesson(lessonForm)
      }
      setLessonModal(null)
      await loadData()
    } finally { setSaving(false) }
  }

  async function handleDeleteLesson(lessonId) {
    if (!confirm('¿Eliminar esta clase?')) return
    await deleteLesson(lessonId)
    await loadData()
  }

  if (loading) return <div className="loading-screen"><div><div className="spinner" /></div></div>

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Cursos</div>
          <div className="page-sub">{courses.length} cursos en la plataforma</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={openAddCourse}>+ Nuevo curso</button>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <div className="empty-title">Sin cursos aún</div>
          <div className="empty-sub">Crea tu primer curso para comenzar.</div>
        </div>
      ) : (
        courses.map(course => {
          const totalLessons = course.modules.reduce((a, m) => a + m.lessons.length, 0)
          const isOpen = expanded === course.id
          return (
            <div key={course.id} className="card" style={{ marginBottom: 16 }}>
              {/* Course header */}
              <div className="card-header">
                <div className="flex-center gap-10">
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: course.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {course.icon}
                  </div>
                  <div>
                    <div className="fw-600" style={{ fontSize: 15 }}>{course.name}</div>
                    <div className="text-sm text-gray">{course.modules.length} módulos · {totalLessons} clases</div>
                  </div>
                </div>
                <div className="flex gap-8">
                  <button className="btn" onClick={() => setExpanded(isOpen ? null : course.id)}>
                    {isOpen ? '▲ Cerrar' : '▼ Editar contenido'}
                  </button>
                  <button className="btn" onClick={() => {
                    setForm({ id: course.id, name: course.name, description: course.description, icon: course.icon, color: course.color })
                    setModal({ type: 'course' })
                  }}>✏️</button>
                  <button className="btn btn-danger" onClick={() => handleDeleteCourse(course.id)}>🗑️</button>
                </div>
              </div>

              {/* Course content editor */}
              {isOpen && (
                <div className="card-body">
                  {course.modules.map((mod, mi) => (
                    <div key={mod.id} style={{ marginBottom: 20, padding: 16, background: 'var(--gray-light)', borderRadius: 12 }}>
                      <div className="flex-center gap-10" style={{ marginBottom: 12, justifyContent: 'space-between' }}>
                        <div className="fw-600" style={{ fontSize: 14 }}>📁 {mod.name}</div>
                        <div className="flex gap-8">
                          <button className="btn" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => openAddLesson({ ...mod, course_id: course.id })}>
                            + Clase
                          </button>
                          <button className="btn btn-danger" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => handleDeleteModule(mod.id)}>
                            🗑️
                          </button>
                        </div>
                      </div>

                      {mod.lessons.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--gray)', padding: '8px 0' }}>Sin clases aún. Agrega la primera.</div>
                      ) : (
                        <div className="lesson-list">
                          {mod.lessons.map((l, li) => (
                            <div key={l.id} className="lesson-item" style={{ cursor: 'default' }}>
                              <div className="lesson-status">🎬</div>
                              <div className="lesson-info">
                                <div className="lesson-name">{li + 1}. {l.name}</div>
                                <div className="lesson-meta">
                                  {l.video_id ? '✓ Video' : '⚠ Sin video'}
                                  {l.has_task ? ' · 📝 Tarea' : ''}
                                </div>
                              </div>
                              <div className="flex gap-8">
                                <button className="btn" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => openEditLesson(l, { ...mod, course_id: course.id })}>Editar</button>
                                <button className="btn btn-danger" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => handleDeleteLesson(l.id)}>🗑</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add module */}
                  {addingModule === course.id ? (
                    <div className="flex gap-8" style={{ marginTop: 8 }}>
                      <input
                        className="form-input"
                        placeholder="Nombre del módulo"
                        value={moduleForm[course.id] || ''}
                        onChange={e => setModuleForm(f => ({ ...f, [course.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleAddModule(course.id)}
                        autoFocus
                      />
                      <button className="btn btn-primary" onClick={() => handleAddModule(course.id)} disabled={saving}>Agregar</button>
                      <button className="btn" onClick={() => setAddingModule(null)}>Cancelar</button>
                    </div>
                  ) : (
                    <button className="btn" style={{ marginTop: 8 }} onClick={() => setAddingModule(course.id)}>
                      + Agregar módulo
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Course modal */}
      {modal?.type === 'course' && (
        <Modal
          title={form.id ? 'Editar curso' : 'Nuevo curso'}
          onClose={() => setModal(null)}
        >
          <div className="form-group">
            <label className="form-label">Nombre del curso</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Excel Avanzado" />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción breve del curso..." />
          </div>
          <div className="form-group">
            <label className="form-label">Ícono</label>
            <div className="flex" style={{ flexWrap: 'wrap', gap: 8 }}>
              {EMOJIS.map(em => (
                <button key={em} onClick={() => setForm(f => ({ ...f, icon: em }))}
                  style={{ width: 38, height: 38, fontSize: 20, border: `2px solid ${form.icon === em ? 'var(--teal)' : 'var(--border)'}`, borderRadius: 8, background: 'white', cursor: 'pointer' }}>
                  {em}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Color de portada</label>
            <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c.value} onClick={() => setForm(f => ({ ...f, color: c.value }))}
                  title={c.label}
                  style={{ width: 36, height: 36, borderRadius: 8, background: c.value, border: `2px solid ${form.color === c.value ? 'var(--teal)' : 'var(--border)'}`, cursor: 'pointer' }}>
                </button>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveCourse} disabled={saving || !form.name}>
              {saving ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Crear curso'}
            </button>
          </div>
        </Modal>
      )}

      {/* Lesson modal */}
      {lessonModal && (
        <Modal
          title={lessonModal.type === 'add' ? 'Nueva clase' : 'Editar clase'}
          subtitle={`Módulo: ${lessonModal.moduleName}`}
          onClose={() => setLessonModal(null)}
          maxWidth={600}
        >
          <div className="form-group">
            <label className="form-label">Nombre de la clase</label>
            <input className="form-input" value={lessonForm.name} onChange={e => setLessonForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Introducción a las tablas dinámicas" />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción (opcional)</label>
            <textarea className="form-textarea" value={lessonForm.description || ''} onChange={e => setLessonForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción breve de la clase..." />
          </div>
          <div className="form-group">
            <label className="form-label">ID o URL del video de YouTube</label>
            <input className="form-input" value={lessonForm.video_id || ''} onChange={e => setLessonForm(f => ({ ...f, video_id: e.target.value }))} placeholder="Ej: dQw4w9WgXcQ o https://youtu.be/..." />
            <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>Acepta el ID completo o la URL de YouTube (privado/no listado/público)</div>
          </div>

          <div className="form-group">
            <label className="form-check" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={!!lessonForm.has_task} onChange={e => setLessonForm(f => ({ ...f, has_task: e.target.checked }))} style={{ width: 'auto' }} />
              <span style={{ fontWeight: 500 }}>Esta clase requiere tarea/formulario</span>
            </label>
          </div>

          {lessonForm.has_task && (
            <>
              <div className="form-group">
                <label className="form-label">Nombre de la tarea</label>
                <input className="form-input" value={lessonForm.task_name || ''} onChange={e => setLessonForm(f => ({ ...f, task_name: e.target.value }))} placeholder="Ej: Práctica de fórmulas" />
              </div>
              <div className="form-group">
                <label className="form-label">URL del formulario (Google Forms u otro)</label>
                <input className="form-input" value={lessonForm.task_url || ''} onChange={e => setLessonForm(f => ({ ...f, task_url: e.target.value }))} placeholder="https://forms.gle/..." />
              </div>
              <div className="form-group">
                <label className="form-label">Instrucciones para el estudiante</label>
                <textarea className="form-textarea" value={lessonForm.task_instructions || ''} onChange={e => setLessonForm(f => ({ ...f, task_instructions: e.target.value }))} placeholder="Instrucciones adicionales..." />
              </div>
            </>
          )}

          <div className="modal-actions">
            <button className="btn" onClick={() => setLessonModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveLesson} disabled={saving || !lessonForm.name}>
              {saving ? 'Guardando...' : lessonModal.type === 'add' ? 'Crear clase' : 'Guardar cambios'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
