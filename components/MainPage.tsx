import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { StyleSheet, View, Text } from 'react-native'
import { Button } from '@rneui/themed'
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
        .eq('id', session?.user.id)
        .single()

      if (error) throw error

      if (data) {
        setFullName(data.full_name || 'Usuario')
      }
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

      <View style={styles.signOutContainer}>
        <Button title="Cerrar Sesión" onPress={() => supabase.auth.signOut()} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  signOutContainer: {
    marginTop: 40,
    width: '80%',
  },
})
