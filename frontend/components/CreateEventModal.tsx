import React, { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Switch,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useApp } from '../context/AppContext'
import { createEvent, getEventTypes, EventType } from '../services/events'

interface CreateEventModalProps {
  visible: boolean
  onClose: () => void
  preselectedDate?: string
}

export default function CreateEventModal({
  visible,
  onClose,
  preselectedDate,
}: CreateEventModalProps) {
  const { session, selectedDate, refreshEvents } = useApp()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [selectedType, setSelectedType] = useState<EventType | null>(null)
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [loading, setLoading] = useState(false)

  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [endType, setEndType] = useState<'never' | 'until' | 'count'>('never')
  const [endDate, setEndDate] = useState('')
  const [count, setCount] = useState('10')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [endDateObj, setEndDateObj] = useState(new Date())

  // Reminder state
  const [reminderMinutes, setReminderMinutes] = useState('15')

  // Cargar tipos de eventos
  useEffect(() => {
    loadEventTypes()
  }, [])

  // Inicializar fecha cuando se abre el modal
  useEffect(() => {
    if (visible) {
      const initialDate = preselectedDate || selectedDate
      setDate(initialDate)
      const now = new Date()
      const startHour = (now.getHours() + 1) % 24
      const endHour = (startHour + 1) % 24
      setStartTime(`${String(startHour).padStart(2, '0')}:00`)
      setEndTime(`${String(endHour).padStart(2, '0')}:00`)
    }
  }, [visible, preselectedDate, selectedDate])

  async function loadEventTypes() {
    const types = await getEventTypes()
    setEventTypes(types)
    if (types.length > 0) {
      setSelectedType(types[0]) // Seleccionar el primero por defecto
    }
  }

  // Helper functions for recurrence
  function translateFreq(freq: string) {
    const map: Record<string, string> = { DAILY: 'Diaria', WEEKLY: 'Semanal', MONTHLY: 'Mensual', YEARLY: 'Anual' }
    return map[freq] || freq
  }

  function translateEndType(type: string) {
    const map: Record<string, string> = { never: 'Nunca', until: 'Hasta fecha', count: 'Después de' }
    return map[type] || type
  }

  function toggleDay(day: string) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  function handleDatePickerChange(event: any, selectedDate?: Date) {
    setShowDatePicker(Platform.OS === 'ios')

    if (selectedDate) {
      setEndDateObj(selectedDate)
      // Formatear la fecha como YYYY-MM-DD
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      setEndDate(`${year}-${month}-${day}`)
    }
  }

  function buildRRule(): string | null {
    if (!isRecurring) return null

    let rrule = `FREQ=${frequency}`

    if (frequency === 'WEEKLY' && selectedDays.length > 0) {
      rrule += `;BYDAY=${selectedDays.join(',')}`
    }

    if (endType === 'until' && endDate) {
      rrule += `;UNTIL=${endDate.replace(/-/g, '')}`
    } else if (endType === 'count' && count) {
      rrule += `;COUNT=${count}`
    }

    return rrule
  }

  function resetForm() {
    setTitle('')
    setDescription('')
    setLocation('')
    setDate(selectedDate)
    setStartTime('')
    setEndTime('')
    setIsRecurring(false)
    setFrequency('WEEKLY')
    setSelectedDays([])
    setEndType('never')
    setEndDate('')
    setCount('0')
    setShowDatePicker(false)
    setEndDateObj(new Date())
    setReminderMinutes('15')
    if (eventTypes.length > 0) {
      setSelectedType(eventTypes[0])
    }
  }

  async function handleSubmit() {
    // Validaciones
    if (!title.trim()) {
      Alert.alert('Error', 'El título es requerido')
      return
    }

    if (!selectedType) {
      Alert.alert('Error', 'Selecciona un tipo de evento')
      return
    }

    if (!date || !startTime || !endTime) {
      Alert.alert('Error', 'Completa la fecha y horarios')
      return
    }

    // Construir timestamps con zona horaria local
    // Crear Date objects en hora local
    const startDate = new Date(`${date}T${startTime}:00`)
    const endDate = new Date(`${date}T${endTime}:00`)

    // Validar que end > start
    if (endDate <= startDate) {
      Alert.alert('Error', 'La hora de fin debe ser después de la hora de inicio')
      return
    }

    // Convertir a ISO string (incluye timezone)
    const start_datetime = startDate.toISOString()
    const end_datetime = endDate.toISOString()

    // Validación adicional para recurrencia
    if (isRecurring && frequency === 'WEEKLY' && selectedDays.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un día de la semana')
      return
    }

    // Construir RRULE si hay recurrencia
    const rruleString = buildRRule()
    const recurrence_rule = rruleString
      ? { rrule: rruleString, timezone: 'America/Santiago' }
      : undefined

    try {
      setLoading(true)

      const eventData = {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        event_type_id: selectedType.name, // Usamos el nombre porque event_type_id es text
        creator_id: session!.user.id,
        start_datetime,
        end_datetime,
        recurrence_rule,
        time_anticipation: parseInt(reminderMinutes) || 15,
      }

      const response = await createEvent(eventData)

      if (response.error) {
        throw new Error(response.error)
      }

      Alert.alert('Éxito', 'Evento creado correctamente')

      // Refrescar eventos
      await refreshEvents()

      // Cerrar modal y limpiar formulario
      resetForm()
      onClose()
    } catch (error) {
      console.error('Error creating event:', error)
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo crear el evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nuevo Evento</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color="#283618" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Título */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Ej: Reunión de equipo"
                placeholderTextColor="#999"
              />
            </View>

            {/* Tipo de evento */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tipo de evento *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesScroll}>
                {eventTypes.map((type) => (
                  <TouchableOpacity
                    key={type.name}
                    style={[
                      styles.typeButton,
                      selectedType?.name === type.name && styles.typeButtonActive,
                      { borderColor: type.color },
                      selectedType?.name === type.name && { backgroundColor: type.color + '20' },
                    ]}
                    onPress={() => setSelectedType(type)}
                  >
                    <View style={[styles.typeDot, { backgroundColor: type.color }]} />
                    <Text
                      style={[
                        styles.typeButtonText,
                        selectedType?.name === type.name && { color: type.color, fontWeight: 'bold' },
                      ]}
                    >
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Fecha */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Fecha *</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />
            </View>

            {/* Horarios */}
            <View style={styles.timeRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Hora inicio *</Text>
                <TextInput
                  style={styles.input}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Hora fin *</Text>
                <TextInput
                  style={styles.input}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Ubicación */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Ubicación</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Ej: Sala de conferencias"
                placeholderTextColor="#999"
              />
            </View>

            {/* Descripción */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Agrega detalles adicionales..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Recordatorio */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Recordatorio (minutos antes)</Text>
              <TextInput
                style={styles.input}
                value={reminderMinutes}
                onChangeText={setReminderMinutes}
                placeholder="15"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            {/* Recurrencia */}
            <View style={styles.formGroup}>
              <View style={styles.recurringToggleContainer}>
                <Text style={styles.label}>¿Se repite?</Text>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: '#D1D5DB', true: '#606C38' }}
                  thumbColor={isRecurring ? '#BC6C25' : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Sección de recurrencia expandible */}
            {isRecurring && (
              <View style={styles.recurrenceSection}>
                {/* Frecuencia */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Frecuencia</Text>
                  <View style={styles.frequencyButtons}>
                    {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const).map(freq => (
                      <TouchableOpacity
                        key={freq}
                        style={[styles.freqButton, frequency === freq && styles.freqButtonActive]}
                        onPress={() => setFrequency(freq)}
                      >
                        <Text style={[styles.freqButtonText, frequency === freq && styles.freqButtonTextActive]}>
                          {translateFreq(freq)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Selector de días (solo WEEKLY) */}
                {frequency === 'WEEKLY' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Días</Text>
                    <View style={styles.daysContainer}>
                      {[
                        {label: 'L', value: 'MO'},
                        {label: 'M', value: 'TU'},
                        {label: 'Mi', value: 'WE'},
                        {label: 'J', value: 'TH'},
                        {label: 'V', value: 'FR'},
                        {label: 'S', value: 'SA'},
                        {label: 'D', value: 'SU'}
                      ].map(day => (
                        <TouchableOpacity
                          key={day.value}
                          style={[styles.dayButton, selectedDays.includes(day.value) && styles.dayButtonActive]}
                          onPress={() => toggleDay(day.value)}
                        >
                          <Text style={[styles.dayButtonText, selectedDays.includes(day.value) && styles.dayButtonTextActive]}>
                            {day.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Termina */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Termina</Text>
                  <View style={styles.endTypeContainer}>
                    {(['never', 'until', 'count'] as const).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.endTypeButton, endType === type && styles.endTypeButtonActive]}
                        onPress={() => setEndType(type)}
                      >
                        <Text style={[styles.endTypeButtonText, endType === type && styles.endTypeButtonTextActive]}>
                          {translateEndType(type)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {endType === 'until' && (
                    <>
                      <TouchableOpacity
                        style={[styles.datePickerButton, { marginTop: 12 }]}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Feather name="calendar" size={18} color="#606C38" />
                        <Text style={styles.datePickerButtonText}>
                          {endDate || 'Seleccionar fecha'}
                        </Text>
                      </TouchableOpacity>

                      {showDatePicker && (
                        <DateTimePicker
                          value={endDateObj}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={handleDatePickerChange}
                          minimumDate={new Date()}
                          accentColor="#606C38"
                          themeVariant="light"
                        />
                      )}
                    </>
                  )}

                  {endType === 'count' && (
                    <TextInput
                      style={[styles.input, { marginTop: 12 }]}
                      value={count}
                      onChangeText={setCount}
                      placeholder="Días"
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onClose}
            >
              <Text style={styles.buttonSecondaryText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonPrimary,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonPrimaryText}>
                {loading ? 'Creando...' : 'Crear Evento'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContainer: {
    backgroundColor: '#FEFAE0',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#283618',
  },

  closeButton: {
    padding: 4,
  },

  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  formGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#283618',
    marginBottom: 8,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#283618',
  },

  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },

  typesScroll: {
    flexGrow: 0,
  },

  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },

  typeButtonActive: {
    borderWidth: 2,
  },

  typeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },

  typeButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },

  timeRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },

  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },

  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonPrimary: {
    backgroundColor: '#606C38',
  },

  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#606C38',
  },

  buttonSecondaryText: {
    color: '#606C38',
    fontSize: 16,
    fontWeight: 'bold',
  },

  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },

  // Recurrence styles
  recurringToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  recurrenceSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },

  frequencyButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },

  freqButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },

  freqButtonActive: {
    borderColor: '#606C38',
    backgroundColor: '#606C3820',
  },

  freqButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  freqButtonTextActive: {
    color: '#606C38',
    fontWeight: 'bold',
  },

  daysContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },

  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dayButtonActive: {
    borderColor: '#606C38',
    backgroundColor: '#606C38',
  },

  dayButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },

  dayButtonTextActive: {
    color: '#FFFFFF',
  },

  endTypeContainer: {
    flexDirection: 'column',
    gap: 8,
  },

  endTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    width: '100%',
  },

  endTypeButtonActive: {
    borderColor: '#606C38',
    backgroundColor: '#606C3820',
  },

  endTypeButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },

  endTypeButtonTextActive: {
    color: '#606C38',
    fontWeight: 'bold',
  },

  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#606C38',
    backgroundColor: '#FFFFFF',
  },

  datePickerButtonText: {
    fontSize: 14,
    color: '#606C38',
    fontWeight: '500',
  },

  reminderButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },

  reminderButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },

  reminderButtonActive: {
    borderColor: '#606C38',
    backgroundColor: '#606C3820',
  },

  reminderButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  reminderButtonTextActive: {
    color: '#606C38',
    fontWeight: 'bold',
  },
})
