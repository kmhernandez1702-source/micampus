import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  getCourse, getProgress,
  markLessonComplete, markTaskSubmitted
} from '../../lib/supabase'
import ProgressBar from '../../components/shared/ProgressBar'

export default function StudentLesson() {
  const { courseId, lessonId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [course, setCourse] = useState(null)
  const [progress, setProgress] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const [c, p] = await Promise.all([getCourse(courseId), getProgress(user.id, courseId)])
      setCourse(c)
      setProgress(p)
    } finally { setLoading(false) }
  }, [courseId, user])

  useEffect(() => { loadData() }, [loadData])

  if (loading || !course) return <div className="loading-screen"><div><div className="spinner" /></div></div>

  // Build flat lesson list with module name
  const allLessons = course.modules.flatMap(m =>
    m.lessons.map(l => ({ ...l, moduleName: m.name }))
  )

  const currentIdx = allLessons.findIndex(l => l.id === lessonId)
  const lesson = allLessons[currentIdx]

  if (!lesson) return <div className="loading-screen">Clase no encontrada</div>

  // Progress helpers
  function getLessonProgress(lid) {
    return progress.find(p => p.lesson_id === lid) || {}
  }

  // Sequential unlock logic
  function isUnlocked(idx) {
    if (idx === 0) return true
    const prev = allLessons[idx - 1]
    const pp = getLessonProgress(prev.id)
    return pp.completed && (!prev.has_task || pp.task_submitted)
  }

  // If current lesson is locked, redirect to last unlocked
  if (!isUnlocked(currentIdx)) {
    const lastUnlocked = allLessons.findLastIndex((_, i) => isUnlocked(i))
    const target = lastUnlocked >= 0 ? allLessons[lastUnlocked] : allLessons[0]
    navigate(`/student/curso/${courseId}/leccion/${target.id}`, { replace: true })
    return null
  }

  const lp = getLessonProgress(lesson.id)
  const videoDone = !!lp.completed
  const taskDone = !!lp.task_submitted
  const canComplete = !videoDone && (!lesson.has_task || taskDone)

  // Stats
  const totalLessons = allLessons.length
  const doneLessons = allLessons.filter(l => getLessonProgress(l.id).completed).length
  const pct = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0

  async function handleMarkTaskDone() {
    setSaving(true)
    try {
      await markTaskSubmitted(user.id, courseId, lesson.id)
      await loadData()
    } finally { setSaving(false) }
  }

  async function handleComplete() {
    if (!canComplete) return
    setSaving(true)
    try {
      await markLessonComplete(user.id, courseId, lesson.id)
      await loadData()
      // Auto-advance to next lesson
      const next = allLessons[currentIdx + 1]
      if (next) navigate(`/student/curso/${courseId}/leccion/${next.id}`)
    } finally { setSaving(false) }
  }

  function goToLesson(l, idx) {
    if (!isUnlocked(idx)) return
    navigate(`/student/curso/${courseId}/leccion/${l.id}`)
  }

  // YouTube embed URL
  function getEmbedUrl(videoId) {
    if (!videoId) return null
    // Accept full URLs or just IDs
    const match = videoId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([^&\n?#]+)/)
    const id = match ? match[1] : videoId
    return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`
  }

  const embedUrl = getEmbedUrl(lesson.video_id)

  return (
    <>
      <div className="topbar">
        <div style={{ flex: 1 }}>
          <div className="breadcrumb">
            <span onClick={() => navigate('/student')}>Inicio</span>
            <span className="breadcrumb-sep">/</span>
            <span onClick={() => navigate('/student/cursos')}>{course.name}</span>
            <span className="breadcrumb-sep">/</span>
            <span style={{ color: 'var(--dark)' }}>{lesson.name}</span>
          </div>
          <div className="page-title">{course.icon || '📚'} {course.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <ProgressBar value={pct} width="220px" />
            <span className="text-sm text-gray">{doneLessons}/{totalLessons} clases</span>
          </div>
        </div>
      </div>

      <div className="lesson-layout">
        {/* LEFT: Video + actions */}
        <div>
          {/* Video */}
          <div className="video-container">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={lesson.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                <div style={{ fontSize: 42, marginBottom: 12 }}>🎬</div>
                <div>Video no configurado aún</div>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.5 }}>Agrega el ID de YouTube en el panel admin</div>
              </div>
            )}
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 16, marginBottom: 4 }}>{lesson.name}</h2>
          {lesson.description && <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 12 }}>{lesson.description}</p>}

          {/* Task section */}
          {lesson.has_task && !taskDone && (
            <div className="task-box">
              <h4>📝 Tarea requerida: {lesson.task_name || 'Tarea de la clase'}</h4>
              <p>
                Completa este formulario antes de avanzar a la siguiente clase.
                Una vez enviado, presiona "Ya envié la tarea" para continuar.
              </p>
              {lesson.task_instructions && (
                <p style={{ fontStyle: 'italic', marginBottom: 12 }}>{lesson.task_instructions}</p>
              )}
              <div className="task-actions">
                {lesson.task_url && (
                  <a
                    href={lesson.task_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ fontSize: 13 }}
                  >
                    📋 Abrir formulario ↗
                  </a>
                )}
                <button
                  className="btn"
                  onClick={handleMarkTaskDone}
                  disabled={saving}
                  style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}
                >
                  ✓ Ya envié la tarea
                </button>
              </div>
            </div>
          )}

          {lesson.has_task && taskDone && !videoDone && (
            <div className="task-done-box">
              ✅ Tarea enviada — ¡listo para completar esta clase!
            </div>
          )}

          {/* Complete button */}
          {!videoDone ? (
            <button
              className={`btn ${canComplete ? 'btn-success' : ''}`}
              style={{ marginTop: 16, width: '100%', justifyContent: 'center', padding: '12px' }}
              onClick={handleComplete}
              disabled={!canComplete || saving}
            >
              {saving ? 'Guardando...' : canComplete ? '✅ Marcar clase como completada' : lesson.has_task ? '⏳ Completa y envía la tarea primero' : '⏳ Mira el video y completa la clase'}
            </button>
          ) : (
            <div className="task-done-box">
              ✅ Clase completada
              {currentIdx < allLessons.length - 1 && (
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                  onClick={() => navigate(`/student/curso/${courseId}/leccion/${allLessons[currentIdx + 1].id}`)}
                >
                  Siguiente clase →
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Lesson list */}
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Contenido del curso</div>
            </div>
            <div style={{ padding: '12px' }}>
              {course.modules.map(mod => {
                const modLessons = mod.lessons
                return (
                  <div key={mod.id} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '6px 4px 4px' }}>
                      📁 {mod.name}
                    </div>
                    <div className="lesson-list">
                      {modLessons.map(l => {
                        const idx = allLessons.findIndex(x => x.id === l.id)
                        const lProg = getLessonProgress(l.id)
                        const done = !!lProg.completed
                        const locked = !isUnlocked(idx)
                        const active = l.id === lesson.id
                        return (
                          <div
                            key={l.id}
                            className={`lesson-item${done ? ' done' : ''}${active && !done ? ' active' : ''}${locked ? ' locked' : ''}`}
                            onClick={() => goToLesson(l, idx)}
                          >
                            <div className="lesson-status">
                              {done ? '✅' : locked ? '🔒' : active ? '▶' : '○'}
                            </div>
                            <div className="lesson-info">
                              <div className="lesson-name">{l.name}</div>
                              <div className="lesson-meta">
                                {l.has_task ? 'Video + Tarea' : 'Video'}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
