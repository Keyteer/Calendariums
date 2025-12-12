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
import { Calendar } from 'react-native-calendars'
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
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

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

  const getMarkedDates = () => {
    const marked: any = {}

    memberActivities.forEach((member) => {
      member.activities.forEach((activity) => {
        const date = new Date(activity.start_datetime).toISOString().split('T')[0]
        if (!marked[date]) {
          marked[date] = { marked: true, dotColor: '#606C38' }
        }
      })
    })

    // Marcar el día seleccionado
    if (viewMode === 'month') {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#606C38',
      }
    }

    return marked
  }

  const getEventsForDate = (date: string) => {
    const events: Array<{ member: MemberActivities; activity: Activity; color: string }> = []

    memberActivities.forEach((member, index) => {
      member.activities.forEach((activity) => {
        const activityDate = new Date(activity.start_datetime).toISOString().split('T')[0]
        if (activityDate === date) {
          events.push({
            member,
            activity,
            color: getMemberColor(index)
          })
        }
      })
    })

    return events.sort((a, b) =>
      new Date(a.activity.start_datetime).getTime() - new Date(b.activity.start_datetime).getTime()
    )
  }

  const renderDayColumn = (dayDate: Date, dayIndex: number) => {
    const isToday = dayDate.toDateString() === new Date().toDateString()
    const columnWidth = Math.max((SCREEN_WIDTH - 80) / 7, 80) // Mínimo 80px por columna

    return (
      <View key={dayIndex} style={[styles.dayColumn, { width: columnWidth }]}>
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

        <View style={styles.centerControls}>
          <View style={styles.weekInfo}>
            <Text style={styles.weekRange}>
              {viewMode === 'week' ? formatWeekRange() : 'Calendario Mensual'}
            </Text>
            <TouchableOpacity onPress={goToToday}>
              <Text style={styles.todayButton}>Hoy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.navControls}>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'week' ? 'month' : 'week')}
            style={styles.viewToggle}
          >
            <Feather
              name={viewMode === 'week' ? 'calendar' : 'list'}
              size={20}
              color="#606C38"
            />
          </TouchableOpacity>
          {viewMode === 'week' && (
            <>
              <TouchableOpacity onPress={goToPreviousWeek} style={styles.navButton}>
                <Feather name="chevron-left" size={24} color="#606C38" />
              </TouchableOpacity>
              <TouchableOpacity onPress={goToNextWeek} style={styles.navButton}>
                <Feather name="chevron-right" size={24} color="#606C38" />
              </TouchableOpacity>
            </>
          )}
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
      ) : viewMode === 'month' ? (
        <View style={styles.monthViewContainer}>
          {/* Calendario mensual */}
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={getMarkedDates()}
            theme={{
              backgroundColor: '#FEFAE0',
              calendarBackground: '#FEFAE0',
              textSectionTitleColor: '#606C38',
              selectedDayBackgroundColor: '#606C38',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#BC6C25',
              dayTextColor: '#283618',
              textDisabledColor: '#d9d9d9',
              dotColor: '#606C38',
              selectedDotColor: '#ffffff',
              arrowColor: '#606C38',
              monthTextColor: '#283618',
              indicatorColor: '#606C38',
              textDayFontWeight: '400',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 14,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 12,
            }}
          />

          {/* Eventos del día seleccionado */}
          <View style={styles.selectedDayEventsContainer}>
            <Text style={styles.selectedDayTitle}>
              Eventos del{' '}
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
              })}
            </Text>

            <ScrollView style={styles.eventsScrollView}>
              {getEventsForDate(selectedDate).length === 0 ? (
                <View style={styles.noEventsDay}>
                  <Feather name="calendar" size={32} color="#9CA3AF" />
                  <Text style={styles.noEventsText}>No hay eventos este día</Text>
                </View>
              ) : (
                getEventsForDate(selectedDate).map((item, index) => (
                  <View key={index} style={styles.eventCard}>
                    <View
                      style={[styles.eventColorBar, { backgroundColor: item.color }]}
                    />
                    <View style={styles.eventCardContent}>
                      <View style={styles.eventCardHeader}>
                        <View
                          style={[
                            styles.memberDot,
                            { backgroundColor: item.color },
                          ]}
                        >
                          <Text style={styles.memberDotText}>
                            {getMemberInitials(item.member)}
                          </Text>
                        </View>
                        <Text style={styles.memberName}>
                          {item.member.user?.full_name ||
                            item.member.user?.username ||
                            'Usuario'}
                        </Text>
                      </View>
                      <View style={styles.eventTimeRow}>
                        <Feather name="clock" size={14} color="#6B7280" />
                        <Text style={styles.eventTime}>
                          {new Date(item.activity.start_datetime).toLocaleTimeString(
                            'es-ES',
                            { hour: '2-digit', minute: '2-digit' }
                          )}{' '}
                          -{' '}
                          {new Date(item.activity.end_datetime).toLocaleTimeString(
                            'es-ES',
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
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
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: '#FEFAE0',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },

  navButton: {
    padding: 8,
  },

  centerControls: {
    flex: 1,
    alignItems: 'center',
  },

  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  viewToggle: {
    padding: 8,
    marginRight: 8,
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
    minWidth: 80,
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

  // Estilos para vista mensual
  monthViewContainer: {
    flex: 1,
    backgroundColor: '#FEFAE0',
  },

  selectedDayEventsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#FEFAE0',
  },

  selectedDayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#283618',
    marginBottom: 12,
  },

  eventsScrollView: {
    flex: 1,
  },

  noEventsDay: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  noEventsText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },

  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  eventColorBar: {
    width: 4,
  },

  eventCardContent: {
    flex: 1,
    padding: 12,
  },

  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  memberDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  memberDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },

  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#283618',
    flex: 1,
  },

  eventTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  eventTime: {
    fontSize: 13,
    color: '#6B7280',
  },
})
