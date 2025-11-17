import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { StyleSheet, View, Text, ScrollView } from 'react-native'
import { Button } from '@rneui/themed'
import { Session } from '@supabase/supabase-js'
import { getEvents } from '../services/events'

export default function MainPage({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [events, setEvents] = useState<any[]>([])

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

      const fetchedEvents = await getEvents(session.user.id)
      console.log('Fetched events:', fetchedEvents)
      setEvents(fetchedEvents || [])

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
        <>
          <Text style={styles.greeting}>Hola {fullName}</Text>
          <View style={styles.eventsBox}>
            <Text style={styles.eventsTitle}>Eventos</Text>
            <Text selectable style={styles.eventsJson}>{JSON.stringify(events, null, 2)}</Text>
          </View>
        </>
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
  eventsBox: {
    maxHeight: 200,
    width: '80%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#fafafa',
    marginTop: 8,
  },
  eventsTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventsJson: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
})
