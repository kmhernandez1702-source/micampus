import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { signOut } from '../../lib/supabase'

export default function Sidebar({ items }) {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="sidebar">
      <div className="sb-brand">
        <div className="sb-brand-icon">🎓</div>
        <div className="sb-brand-name">Mi<span>Campus</span></div>
      </div>

      <div className="sb-user">
        <div className="sb-avatar">{initials}</div>
        <div className="sb-user-name">{profile?.full_name || 'Usuario'}</div>
        <div className="sb-user-role">{profile?.role === 'admin' ? 'Administrador' : 'Estudiante'}</div>
      </div>

      <div className="sb-nav">
        {items.map((section, si) => (
          <div key={si}>
            {section.label && <div className="sb-section-label">{section.label}</div>}
            {section.links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `sb-item${isActive ? ' active' : ''}`}
              >
                <span className="sb-item-icon">{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div className="sb-footer">
        <button className="sb-item" onClick={handleLogout} style={{ color: 'rgba(255,255,255,0.4)' }}>
          <span className="sb-item-icon">⬅</span>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
