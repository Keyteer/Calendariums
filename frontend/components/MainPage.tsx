import React, { useState } from 'react'
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native'
import { Calendar, DateData } from 'react-native-calendars'
import { Feather } from '@expo/vector-icons'
import { useApp, Event } from '../context/AppContext'
import CreateEventModal from './CreateEventModal'
import AiSuggestionModal from './AiSuggestionModal'
import { deleteEvent } from '../services/events'

export default function MainPage() {
  const { user, events, selectedDate, setSelectedDate, loading, refreshEvents } = useApp()
  const [modalVisible, setModalVisible] = useState(false)
  const [aiModalVisible, setAiModalVisible] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    await refreshEvents()
    setRefreshing(false)
  }

  // Filtrar eventos del día seleccionado
  const getEventsForDate = (date: string): Event[] => {
    return events.filter((event) => {
      const eventDateTime = new Date(event.start_datetime)
      const eventDate = `${eventDateTime.getFullYear()}-${String(eventDateTime.getMonth() + 1).padStart(2, '0')}-${String(eventDateTime.getDate()).padStart(2, '0')}`
      return eventDate === date
    }).sort((a, b) => {
      return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
    })
  }

  const handleDeleteEvent = (event: Event) => {
    // Si es una instancia recurrente, usar el event_id del evento base
    const eventIdToDelete = event.is_recurring_instance && event.event_id ? event.event_id : event.id
    const warningMessage = event.is_recurring_instance
      ? `¿Estás seguro de que deseas eliminar "${event.title}"? Esto eliminará todas las repeticiones del evento.`
      : `¿Estás seguro de que deseas eliminar "${event.title}"?`

    Alert.alert(
      'Eliminar evento',
      warningMessage,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteEvent(eventIdToDelete)
            if (result.error) {
              Alert.alert('Error', 'No se pudo eliminar el evento')
            } else {
              await refreshEvents()
            }
          },
        },
      ]
    )
  }

  const dayEvents = getEventsForDate(selectedDate)

  // Marcar días con eventos en el calendario
  const getMarkedDates = () => {
    const marked: any = {}

    events.forEach((event) => {
      // Usar fecha local, no UTC
      const eventDateTime = new Date(event.start_datetime)
      const date = `${eventDateTime.getFullYear()}-${String(eventDateTime.getMonth() + 1).padStart(2, '0')}-${String(eventDateTime.getDate()).padStart(2, '0')}`
      if (!marked[date]) {
        marked[date] = { marked: true, dotColor: event.event_types?.color || '#3B82F6' }
      }
    })

    // Marcar el día seleccionado
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: '#606C38',
    }

    return marked
  }

  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString)
  }

  const formatTime = (datetime: string) => {
    const date = new Date(datetime)
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const formatSelectedDate = () => {
    const date = new Date(`${selectedDate}T12:00:00`)
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header con saludo */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola {user?.full_name || 'Usuario'}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#606C38']}
            tintColor="#606C38"
          />
        }
      >
        {/* Calendario */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={onDayPress}
            markedDates={getMarkedDates()}
            theme={{
              backgroundColor: '#FEFAE0',
              calendarBackground: '#FFFFFF',
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
        </View>

        {/* Planner del día */}
        <View style={styles.plannerContainer}>
          <Text style={styles.plannerTitle}>
            {formatSelectedDate().charAt(0).toUpperCase() + formatSelectedDate().slice(1)}
          </Text>

          {dayEvents.length === 0 ? (
            <View style={styles.noEventsContainer}>
              <Feather name="calendar" size={48} color="#DDA15E" />
              <Text style={styles.noEventsText}>No hay actividades agendadas hoy</Text>
            </View>
          ) : (
            <View style={styles.eventsListContainer}>
              {dayEvents.map((event) => (
                <View
                  key={event.id}
                  style={[
                    styles.eventCard,
                    { borderLeftColor: event.event_types?.color || '#3B82F6' },
                  ]}
                >
                  <View style={styles.eventHeader}>
                    <View style={styles.eventTimeContainer}>
                      <Text style={styles.eventTime}>
                        {formatTime(event.start_datetime)}
                      </Text>
                      <Text style={styles.eventTimeSeparator}>-</Text>
                      <Text style={styles.eventTime}>
                        {formatTime(event.end_datetime)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleDeleteEvent(event)}
                      style={styles.deleteButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="trash-2" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.eventDetails}>
                    <Text style={styles.eventTitle}>{event.title}</Text>

                    {/* Badge de grupo */}
                    {event.group_id && event.groups && (
                      <View style={styles.groupBadge}>
                        <Feather name="users" size={12} color="#606C38" />
                        <Text style={styles.groupText}>{event.groups.name}</Text>
                      </View>
                    )}

                    {event.recurrence_rules && event.recurrence_rules.length > 0 && (
                      <View style={styles.recurringBadge}>
                        <Feather name="repeat" size={12} color="#606C38" />
                        <Text style={styles.recurringText}>Recurrente</Text>
                      </View>
                    )}

                    {event.event_types && (
                      <View style={styles.eventTypeContainer}>
                        <View
                          style={[
                            styles.eventTypeBadge,
                            { backgroundColor: event.event_types.color + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.eventTypeText,
                              { color: event.event_types.color },
                            ]}
                          >
                            {event.event_types.name}
                          </Text>
                        </View>
                      </View>
                    )}

                    {event.location && (
                      <View style={styles.eventLocationContainer}>
                        <Feather name="map-pin" size={12} color="#6B7280" />
                        <Text style={styles.eventLocation}>{event.location}</Text>
                      </View>
                    )}

                    {event.description && (
                      <Text style={styles.eventDescription} numberOfLines={2}>
                        {event.description}
                      </Text>
                    )}

                    {/* Participantes del evento de grupo */}
                    {event.group_id && event.event_participants && event.event_participants.length > 1 && (
                      <View style={styles.participantsContainer}>
                        <Feather name="users" size={12} color="#6B7280" />
                        <Text style={styles.participantsText}>
                          {event.event_participants
                            .filter(p => p.status === 'accepted' && p.users)
                            .map(p => p.users?.full_name || p.users?.username)
                            .filter(Boolean)
                            .join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Botón flotante para agregar */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: '#606C38', marginBottom: 16 }]}
          activeOpacity={0.8}
          onPress={() => setAiModalVisible(true)}
        >
          <Feather name="cpu" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => setModalVisible(true)}
        >
          <Feather name="plus" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Modal para crear evento */}
      <CreateEventModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        preselectedDate={selectedDate}
      />

      {/* Modal para sugerencias AI */}
      <AiSuggestionModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFAE0',
  },

  scrollView: {
    flex: 1,
  },

  loadingText: {
    fontSize: 18,
    color: '#606C38',
    textAlign: 'center',
    marginTop: 100,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FEFAE0',
  },

  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#283618',
  },

  calendarContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  plannerContainer: {
    marginHorizontal: 16,
    marginBottom: 100,
  },

  plannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#283618',
    marginBottom: 16,
  },

  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  noEventsText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },

  eventsListContainer: {
    gap: 12,
  },

  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  eventTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  deleteButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },

  eventTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#606C38',
  },

  eventTimeSeparator: {
    marginHorizontal: 6,
    color: '#9CA3AF',
    fontSize: 14,
  },

  eventDetails: {
    gap: 6,
  },

  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#283618',
    marginBottom: 4,
  },

  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
    backgroundColor: '#606C3815',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },

  groupText: {
    fontSize: 11,
    color: '#606C38',
    fontWeight: '600',
  },

  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },

  recurringText: {
    fontSize: 11,
    color: '#606C38',
    fontStyle: 'italic',
  },

  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },

  participantsText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },

  eventTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  eventTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  eventTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  eventLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  eventLocation: {
    fontSize: 13,
    color: '#6B7280',
  },

  eventDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },

  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'center',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#BC6C25',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
})
