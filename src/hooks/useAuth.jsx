import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getProfile } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    try {
      const p = await getProfile(userId)
      setProfile(p || { id: userId, role: 'student', full_name: '', email: '' })
    } catch (e) {
      console.error('Error loading profile', e)
      setProfile({ id: userId, role: 'student', full_name: '', email: '' })
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, reloadProfile: () => loadProfile(user?.id) }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
