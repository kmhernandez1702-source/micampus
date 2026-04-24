import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'

const NAV = [
  {
    label: 'Mi aprendizaje',
    links: [
      { to: '/student', end: true, icon: '🏠', label: 'Inicio' },
      { to: '/student/cursos', icon: '📚', label: 'Mis cursos' },
    ]
  }
]

export default function StudentLayout() {
  return (
    <div className="app-layout">
      <Sidebar items={NAV} />
      <main className="main-area">
        <Outlet />
      </main>
    </div>
  )
}
