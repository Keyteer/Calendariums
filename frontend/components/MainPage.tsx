import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native'
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

      // Prioridad 1: Intentar obtener de la tabla users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', session.user.id)
        .single()

      if (userData && !userError) {
        // ✅ Usuario existe en la tabla
        setFullName(userData.full_name || 'Usuario')
      } else {
        // ⚠️ Usuario no existe en tabla, usar metadata
        const metadataName = session.user.user_metadata?.full_name;
        const emailName = session.user.email?.split('@')[0];

        console.log('User not in table, using metadata:', {
          full_name: metadataName,
          email: session.user.email,
          metadata: session.user.user_metadata
        });

        setFullName(metadataName || emailName || 'Usuario')

        // Intentar crear el usuario en la tabla para la próxima vez
        if (metadataName || emailName) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              username: session.user.user_metadata?.username || emailName,
              full_name: metadataName || emailName || 'Usuario'
            })

          if (insertError) {
            console.error('Error creating user in table:', insertError)
          } else {
            console.log('✅ User created in table successfully')
          }
        }
      }

      // Obtener eventos del backend (con fechas)
      const fetchedEvents = await getEvents(session.user.id)
      console.log('Fetched events:', fetchedEvents)
      setEvents(fetchedEvents?.events || [])
    } catch (error) {
      console.error('Error loading user data:', error)
      // Último fallback
      setFullName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading ? (
        <Text style={styles.greeting}>Cargando...</Text>
      ) : (
        <>
          <Text style={styles.greeting}>Hola {fullName}</Text>
          <View style={styles.eventsBox}>
            <Text style={styles.eventsTitle}>Eventos</Text>
            <ScrollView style={styles.eventsScroll}>
              <Text selectable style={styles.eventsJson}>{JSON.stringify(events, null, 2)}</Text>
            </ScrollView>
          </View>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={() => supabase.auth.signOut()}
          >
            <Text style={styles.signOutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEFAE0',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },

  eventsBox: {
    maxHeight: 300,
    width: '90%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
    marginTop: 8,
  },

  eventsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 16,
    color: '#333',
  },

  eventsScroll: {
    maxHeight: 250,
  },

  eventsJson: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
  },

  signOutButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20,
  },

  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
