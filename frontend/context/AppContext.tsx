import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { getEvents } from '../services/events'
import { getUserGroups } from '../services/groups'

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

export interface Group {
  id: string
  name: string
  description?: string
  creator_id: string
  created_at: string
  updated_at?: string
  member_count?: number
  user_role?: 'admin' | 'moderator' | 'member'
  pending_invitations_count?: number
  group_members?: Array<{
    user_id: string
    role: string
    joined_at: string
  }>
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'moderator' | 'member'
  joined_at: string
  user?: {
    id: string
    username: string
    full_name: string
  }
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
  groups: Group[]
  selectedGroup: Group | null
  groupsLoading: boolean
  setSelectedGroup: (group: Group | null) => void
  refreshGroups: () => Promise<void>
  totalPendingGroupInvitations: number
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
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [groupsLoading, setGroupsLoading] = useState(false)

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

  // Obtener grupos
  const refreshGroups = async () => {
    if (!session?.user) return

    try {
      setGroupsLoading(true)
      const response = await getUserGroups(session.user.id)

      if (response.error) {
        console.error('Error fetching groups:', response.error)
        setGroups([])
        return
      }

      // Obtener invitaciones pendientes del usuario
      const pendingResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6969'}/events/pending/${session.user.id}`)
      const pendingData = await pendingResponse.json()
      const pendingInvitations = pendingData.invitations || []

      // Crear un mapa de group_id -> count de invitaciones pendientes
      const pendingCountByGroup: { [key: string]: number } = {}

      // Contar invitaciones por grupo
      pendingInvitations.forEach((invitation: any) => {
        const groupId = invitation.events?.group_id
        if (groupId) {
          pendingCountByGroup[groupId] = (pendingCountByGroup[groupId] || 0) + 1
        }
      })

      // Transformar los datos de grupos
      const groupsData = response.groups?.map((item: any) => {
        const group = item.groups || item
        const userMembership = group.group_members?.find((m: any) => m.user_id === session.user.id)

        return {
          ...group,
          user_role: userMembership?.role,
          member_count: group.group_members?.length || 0,
          pending_invitations_count: pendingCountByGroup[group.id] || 0
        }
      }) || []

      setGroups(groupsData)
    } catch (error) {
      console.error('Error refreshing groups:', error)
      setGroups([])
    } finally {
      setGroupsLoading(false)
    }
  }

  // Calcular total de invitaciones pendientes
  const totalPendingGroupInvitations = groups.reduce(
    (total, group) => total + (group.pending_invitations_count || 0),
    0
  )

  // Cargar datos iniciales cuando cambia la sesión
  useEffect(() => {
    const loadData = async () => {
      if (session) {
        setLoading(true)
        await Promise.all([refreshUser(), refreshEvents(), refreshGroups()])
        setLoading(false)
      } else {
        setUser(null)
        setEvents([])
        setGroups([])
        setSelectedGroup(null)
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
        groups,
        selectedGroup,
        groupsLoading,
        setSelectedGroup,
        refreshGroups,
        totalPendingGroupInvitations,
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
