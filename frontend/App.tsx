import { useState, useEffect } from 'react'
import { supabase } from './services/supabase'
import Auth from './components/Auth'
import LoginPage from './components/LoginPage'
import MainPage from './components/MainPage'
import { View } from 'react-native'
import { Session } from '@supabase/supabase-js'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)

  // Load session ONCE on startup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen to login/logout
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  // Si no se hace esto se muere el LoginPage rip
  if (loading) return null

  // If user is logged in, show main page
  if (session?.user) {
    return (
      <MainPage
        key={session.user.id}
        session={session}
      />
    )
  }

  // If user is NOT logged in, show LoginPage or Auth
  return (
    <View style={{ flex: 1 }}>
      {showAuth ? (
        <Auth onBackPress={() => setShowAuth(false)} />
      ) : (
        <LoginPage onLoginPress={() => setShowAuth(true)} />
      )}
    </View>
  )
}
