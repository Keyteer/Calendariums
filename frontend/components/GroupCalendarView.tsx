import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { getGroupActivities } from '../services/groups'
import { Group } from '../context/AppContext'

interface GroupCalendarViewProps {
  group: Group
  onBack: () => void
}

interface Activity {
  event_id: string
  start_datetime: string
  end_datetime: string
}

interface MemberActivities {
  user_id: string
  role: string
  user?: {
    full_name?: string
    username: string
  }
  activities: Activity[]
}

const MEMBER_COLORS = [
  '#606C38',
  '#BC6C25',
  '#DDA15E',
  '#6B7280',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#10B981',
]

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6 AM - 10 PM
const SCREEN_WIDTH = Dimensions.get('window').width

export default function GroupCalendarView({ group, onBack }: GroupCalendarViewProps) {
  const [loading, setLoading] = useState(false)
  const [memberActivities, setMemberActivities] = useState<MemberActivities[]>([])
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()))
  const [weekDays, setWeekDays] = useState<Date[]>([])

  useEffect(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(currentWeekStart)
      date.setDate(currentWeekStart.getDate() + i)
      return date
    })
    setWeekDays(days)
  }, [currentWeekStart])

  useEffect(() => {
    if (weekDays.length > 0) {
      loadActivities() // eslint-disable-line
    }
  }, [weekDays])

  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Lunes como inicio
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const loadActivities = async () => {
    setLoading(true)
    try {
      const startDate = weekDays[0].toISOString().split('T')[0]
      const endDate = weekDays[6].toISOString().split('T')[0]

      const response = await getGroupActivities(group.id, startDate, endDate)

      if (!response.error && response.members) {
        setMemberActivities(response.members)
      }
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() - 7)
    setCurrentWeekStart(newStart)
  }

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() + 7)
    setCurrentWeekStart(newStart)
  }

  const goToToday = () => {
    setCurrentWeekStart(getWeekStart(new Date()))
  }

  const getMemberColor = (index: number): string => {
    return MEMBER_COLORS[index % MEMBER_COLORS.length]
  }

  const getMemberInitials = (member: MemberActivities): string => {
    const name = member.user?.full_name || member.user?.username || 'U'
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const renderTimeBlock = (activity: Activity, memberIndex: number, dayDate: Date) => {
    const start = new Date(activity.start_datetime)
    const end = new Date(activity.end_datetime)

    // Verificar si el evento está en este día
    const activityDate = start.toDateString()
    const currentDate = dayDate.toDateString()

    if (activityDate !== currentDate) return null

    // Calcular posición y altura
    const startHour = start.getHours() + start.getMinutes() / 60
    const endHour = end.getHours() + end.getMinutes() / 60

    // Filtrar eventos fuera del rango 6 AM - 10 PM
    if (endHour < 6 || startHour > 22) return null

    const displayStartHour = Math.max(startHour, 6)
    const displayEndHour = Math.min(endHour, 22)

    const top = (displayStartHour - 6) * 60 // 60px por hora
    const height = (displayEndHour - displayStartHour) * 60

    return (
      <View
        key={activity.event_id}
        style={[
          styles.timeBlock,
          {
            top,
            height: Math.max(height, 15),
            backgroundColor: getMemberColor(memberIndex) + '80', // 50% opacidad
            borderLeftColor: getMemberColor(memberIndex),
          },
        ]}
      />
    )
  }

  const renderDayColumn = (dayDate: Date, dayIndex: number) => {
    const isToday = dayDate.toDateString() === new Date().toDateString()

    return (
      <View key={dayIndex} style={styles.dayColumn}>
        {/* Header del día */}
        <View style={[styles.dayHeader, isToday && styles.todayHeader]}>
          <Text style={[styles.dayName, isToday && styles.todayText]}>
            {dayDate.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}
          </Text>
          <Text style={[styles.dayNumber, isToday && styles.todayText]}>
            {dayDate.getDate()}
          </Text>
        </View>

        {/* Grid de horas */}
        <View style={styles.hoursContainer}>
          {HOURS.map((hour) => (
            <View key={hour} style={styles.hourSlot} />
          ))}

          {/* Bloques de tiempo de todos los miembros */}
          {memberActivities.map((member, memberIndex) =>
            member.activities.map((activity) =>
              renderTimeBlock(activity, memberIndex, dayDate)
            )
          )}
        </View>
      </View>
    )
  }

  const formatWeekRange = (): string => {
    if (weekDays.length === 0) return ''
    const start = weekDays[0]
    const end = weekDays[6]

    return `${start.getDate()} ${start.toLocaleDateString('es-ES', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('es-ES', { month: 'short' })}`
  }

  return (
    <View style={styles.container}>
      {/* Header de navegación */}
      <View style={styles.navigationHeader}>
        <TouchableOpacity onPress={onBack} style={styles.navButton}>
          <Feather name="arrow-left" size={24} color="#283618" />
        </TouchableOpacity>

        <View style={styles.weekInfo}>
          <Text style={styles.weekRange}>{formatWeekRange()}</Text>
          <TouchableOpacity onPress={goToToday}>
            <Text style={styles.todayButton}>Hoy</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navControls}>
          <TouchableOpacity onPress={goToPreviousWeek} style={styles.navButton}>
            <Feather name="chevron-left" size={24} color="#606C38" />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextWeek} style={styles.navButton}>
            <Feather name="chevron-right" size={24} color="#606C38" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Leyenda de miembros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.legendContainer}
        contentContainerStyle={styles.legendContent}
      >
        {memberActivities.map((member, index) => (
          <View key={member.user_id} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: getMemberColor(index) },
              ]}
            >
              <Text style={styles.legendInitials}>
                {getMemberInitials(member)}
              </Text>
            </View>
            <Text style={styles.legendName} numberOfLines={1}>
              {member.user?.full_name || member.user?.username}
            </Text>
          </View>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#606C38" />
          <Text style={styles.loadingText}>Cargando disponibilidad...</Text>
        </View>
      ) : (
        <ScrollView style={styles.calendarContainer}>
          <View style={styles.calendar}>
            {/* Columna de horas */}
            <View style={styles.hoursLabels}>
              <View style={styles.dayHeaderPlaceholder} />
              {HOURS.map((hour) => (
                <View key={hour} style={styles.hourLabel}>
                  <Text style={styles.hourText}>
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </Text>
                </View>
              ))}
            </View>

            {/* Días de la semana */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.daysContainer}>
                {weekDays.map((day, index) => renderDayColumn(day, index))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFAE0',
  },

  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },

  navButton: {
    padding: 8,
  },

  navControls: {
    flexDirection: 'row',
  },

  weekInfo: {
    alignItems: 'center',
  },

  weekRange: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#283618',
    marginBottom: 4,
  },

  todayButton: {
    fontSize: 12,
    color: '#606C38',
    fontWeight: '600',
  },

  legendContainer: {
    maxHeight: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },

  legendContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },

  legendDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  legendInitials: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  legendName: {
    fontSize: 13,
    color: '#283618',
    maxWidth: 100,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },

  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },

  calendarContainer: {
    flex: 1,
  },

  calendar: {
    flexDirection: 'row',
  },

  hoursLabels: {
    width: 60,
    backgroundColor: '#FEFAE0',
  },

  dayHeaderPlaceholder: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },

  hourLabel: {
    height: 60,
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingRight: 8,
    alignItems: 'flex-end',
  },

  hourText: {
    fontSize: 11,
    color: '#6B7280',
  },

  daysContainer: {
    flexDirection: 'row',
  },

  dayColumn: {
    width: 100,
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
  },

  dayHeader: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },

  todayHeader: {
    backgroundColor: '#606C3820',
  },

  dayName: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },

  dayNumber: {
    fontSize: 18,
    color: '#283618',
    fontWeight: 'bold',
  },

  todayText: {
    color: '#606C38',
  },

  hoursContainer: {
    position: 'relative',
    height: 17 * 60, // 17 horas * 60px
  },

  hourSlot: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  timeBlock: {
    position: 'absolute',
    width: '100%',
    borderLeftWidth: 3,
    borderRadius: 4,
    opacity: 0.7,
  },
})
