import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Platform } from 'react-native'
import { Session } from '@supabase/supabase-js'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { supabase } from '../services/supabase'
import { getEvents } from '../services/events'
import { uploadPushToken } from '../services/push-token'

// Configure how notifications are handled when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// Tipos
export interface Event {
  id: string
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
  expoPushToken: string | null
  setSelectedDate: (date: string) => void
  refreshEvents: () => Promise<void>
  refreshUser: () => Promise<void>
  registerForPushNotifications: () => Promise<string | null>
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
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)

  // Register for push notifications and save token to Supabase
  const registerForPushNotifications = async (): Promise<string | null> => {
    if (!session?.user) return null

    try {
      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        })
      }

      // Check/request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied')
        return null
      }

      // Get the Expo push token
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId
        ?? Constants?.easConfig?.projectId

      if (!projectId) {
        console.error('No EAS projectId found')
        return null
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
      const token = tokenData.data
      
      setExpoPushToken(token)
      console.log('Expo Push Token:', token)

      // Upload token to Supabase
      await uploadPushToken(session.user.id, token)

      return token
    } catch (error) {
      console.error('Error registering for push notifications:', error)
      return null
    }
  }

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
        // Register for push notifications after user data is loaded
        await registerForPushNotifications()
        setLoading(false)
      } else {
        setUser(null)
        setEvents([])
        setExpoPushToken(null)
        setLoading(false)
      }
    }

    loadData()
  }, [session])

  // Set up notification listeners
  useEffect(() => {
    // Listen for incoming notifications (when app is in foreground)
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification.request.content)
      }
    )

    // Listen for when user taps on a notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('User tapped notification:', response)
        // You can add navigation logic here based on notification data
        // const data = response.notification.request.content.data
      }
    )

    // Cleanup listeners on unmount
    return () => {
      notificationListener.remove()
      responseListener.remove()
    }
  }, [])

  return (
    <AppContext.Provider
      value={{
        session,
        setSession,
        user,
        events,
        selectedDate,
        loading,
        expoPushToken,
        setSelectedDate,
        refreshEvents,
        refreshUser,
        registerForPushNotifications,
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
