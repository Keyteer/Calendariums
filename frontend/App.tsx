import { useState, useEffect } from 'react'
import { supabase } from './services/supabase'
import Auth from './components/Auth'
import LoginPage from './components/LoginPage'
import SimpleNavigator from './components/SimpleNavigator'
import { View, Text } from 'react-native'
import { AppProvider, useApp } from './context/AppContext'
import { useDeepLinking } from './hooks/useDeepLinking'

function AppContent() {
  const { session, setSession } = useApp()
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)

  // Manejar deep links para invitaciones
  useDeepLinking()

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
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Cargando App...</Text>
      </View>
    )
  }

  // If user is logged in, show simple navigator with tabs
  if (session?.user) {
    return (
      <SimpleNavigator
        key={session.user.id}
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

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
