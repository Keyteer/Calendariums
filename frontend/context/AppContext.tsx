import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { getEvents } from '../services/events'

// Tipos
export interface Event {
  id: string
  event_id?: string  // ID del evento base (para instancias recurrentes)
  is_recurring_instance?: boolean  // Si es una instancia expandida
  title: string
  description?: string
  location?: string
  start_datetime: string
  end_datetime: string
  created_by_ai: boolean
  event_type_id: string
  event_types?: {
    name: string
    color: string
    icon: string
  }
  recurrence_rules?: any[]
  event_participants?: Array<{ user_id: string; status: string }>
}

export interface User {
  id: string
  username: string
  full_name: string
}

interface AppContextType {
  session: Session | null
  setSession: (session: Session | null) => void
  user: User | null
  events: Event[]
  selectedDate: string
  loading: boolean
  setSelectedDate: (date: string) => void
  refreshEvents: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [loading, setLoading] = useState(true)

  // Obtener datos del usuario
  const refreshUser = async () => {
    if (!session?.user) return

    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, username, full_name')
        .eq('id', session.user.id)
        .single()

      if (userData && !error) {
        setUser(userData)
      } else {
        // Fallback a metadata
        const metadataName = session.user.user_metadata?.full_name
        const emailName = session.user.email?.split('@')[0]

        setUser({
          id: session.user.id,
          username: session.user.user_metadata?.username || emailName || 'user',
          full_name: metadataName || emailName || 'Usuario',
        })

        // Intentar crear el usuario en la tabla
        await supabase.from('users').insert({
          id: session.user.id,
          username: session.user.user_metadata?.username || emailName,
          full_name: metadataName || emailName || 'Usuario',
        })
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  // Obtener eventos
  const refreshEvents = async () => {
    if (!session?.user) return

    try {
      const fetchedEvents = await getEvents(session.user.id)
      setEvents(fetchedEvents?.events || [])
    } catch (error) {
      console.error('Error refreshing events:', error)
    }
  }

  // Cargar datos iniciales cuando cambia la sesión
  useEffect(() => {
    const loadData = async () => {
      if (session) {
        setLoading(true)
        await Promise.all([refreshUser(), refreshEvents()])
        setLoading(false)
      } else {
        setUser(null)
        setEvents([])
        setLoading(false)
      }
    }

    loadData()
  }, [session])

  return (
    <AppContext.Provider
      value={{
        session,
        setSession,
        user,
        events,
        selectedDate,
        loading,
        setSelectedDate,
        refreshEvents,
        refreshUser,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
