import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'

import { Session } from '@supabase/supabase-js'

export default function MainPage({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    if (session) getUserData()
  }, [session])

  async function getUserData() {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const { data, error } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', session.user.id)
        .single()

      if (error) throw error

      setFullName(data?.full_name || 'Usuario')
    } catch (error) {
      console.error('Error loading user data:', error)
      setFullName('Usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      

      {loading ? (
        <Text style={styles.greeting}>Cargando...</Text>
      ) : (
        <Text style={styles.greeting}>Hola {fullName}</Text>
      )}

      <TouchableOpacity 
        style={styles.myButton}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.myButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEFAE0',
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 60,
    color: '#333',
  },

  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },

  myButton: {
    backgroundColor: '#6A7441',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 50,
    alignItems: 'center',
    width: 200,
  },

  myButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
})
