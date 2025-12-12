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
import { Group, useApp } from '../context/AppContext'
import { createGroupEvent } from '../services/groups'
import { getEventTypes, EventType } from '../services/events'

interface CreateGroupEventModalProps {
  visible: boolean
  onClose: () => void
  group: Group
  userId: string
  onEventCreated?: () => void
}

export default function CreateGroupEventModal({
  visible,
  onClose,
  group,
  userId,
  onEventCreated,
}: CreateGroupEventModalProps) {
  const { refreshEvents, refreshGroups } = useApp()

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

  // Cargar tipos de eventos
  useEffect(() => {
    loadEventTypes()
  }, [])

  // Inicializar fecha cuando se abre el modal
  useEffect(() => {
    if (visible) {
      const today = new Date()
      setDate(today.toISOString().split('T')[0])
      const now = new Date()
      const startHour = (now.getHours() + 1) % 24
      const endHour = (startHour + 1) % 24
      setStartTime(`${String(startHour).padStart(2, '0')}:00`)
      setEndTime(`${String(endHour).padStart(2, '0')}:00`)
    }
  }, [visible])

  async function loadEventTypes() {
    const types = await getEventTypes()
    setEventTypes(types)
    if (types.length > 0) {
      setSelectedType(types[0])
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
      const yyyy = selectedDate.getFullYear()
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const dd = String(selectedDate.getDate()).padStart(2, '0')
      setEndDate(`${yyyy}-${mm}-${dd}`)
    }
  }

  function buildRRule(): string | null {
    if (!isRecurring) return null

    let rrule = `FREQ=${frequency}`

    if (frequency === 'WEEKLY' && selectedDays.length > 0) {
      const dayMap: Record<string, string> = {
        'L': 'MO', 'M': 'TU', 'X': 'WE', 'J': 'TH', 'V': 'FR', 'S': 'SA', 'D': 'SU'
      }
      const byday = selectedDays.map(d => dayMap[d]).join(',')
      rrule += `;BYDAY=${byday}`
    }

    if (endType === 'until' && endDate) {
      const until = endDate.replace(/-/g, '') + 'T235959Z'
      rrule += `;UNTIL=${until}`
    }

    if (endType === 'count') {
      rrule += `;COUNT=${count}`
    }

    return rrule
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

    // Construir timestamps
    const startDate = new Date(`${date}T${startTime}:00`)
    const endDate = new Date(`${date}T${endTime}:00`)

    // Validar que end > start
    if (endDate <= startDate) {
      Alert.alert('Error', 'La hora de fin debe ser después de la hora de inicio')
      return
    }

    // Convertir a ISO string
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
      ? { rrule: rruleString, timezone: 'UTC' }
      : undefined

    setLoading(true)

    try {
      const eventData = {
        title: title.trim(),
        description: description.trim(),
        event_type_id: selectedType.name, // Usamos el nombre porque event_type_id es text
        creator_id: userId,
        start_datetime,
        end_datetime,
        location: location.trim() || undefined,
        recurrence_rules: recurrence_rule ? [recurrence_rule] : undefined
      }

      const response = await createGroupEvent(group.id, eventData)

      if (response.error) {
        Alert.alert('Error', response.error)
        return
      }

      Alert.alert(
        'Evento Creado',
        `El evento "${title}" ha sido creado y todos los miembros del grupo han sido invitados.`,
        [
          {
            text: 'OK',
            onPress: async () => {
              await Promise.all([
                refreshEvents(),
                refreshGroups()
              ])
              resetForm()
              onClose()
              onEventCreated?.()
            }
          }
        ]
      )
    } catch (error) {
      console.error('Error creating group event:', error)
      Alert.alert('Error', 'No se pudo crear el evento')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setTitle('')
    setDescription('')
    setLocation('')
    setIsRecurring(false)
    setSelectedDays([])
    setEndType('never')
    setCount('10')
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
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Crear Evento de Grupo</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#283618" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Grupo info */}
            <View style={styles.groupInfo}>
              <Feather name="users" size={16} color="#606C38" />
              <Text style={styles.groupInfoText}>{group.name}</Text>
            </View>

            {/* Título */}
            <View style={styles.field}>
              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Ej: Reunión de equipo"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Descripción */}
            <View style={styles.field}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Detalles del evento..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Tipo de evento */}
            <View style={styles.field}>
              <Text style={styles.label}>Tipo de Evento *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.typeContainer}>
                  {eventTypes.map((type) => (
                    <TouchableOpacity
                      key={type.name}
                      style={[
                        styles.typeChip,
                        selectedType?.name === type.name && styles.typeChipActive,
                        { backgroundColor: selectedType?.name === type.name ? type.color : '#F3F4F6' }
                      ]}
                      onPress={() => setSelectedType(type)}
                    >
                      <Text style={[
                        styles.typeChipText,
                        selectedType?.name === type.name && styles.typeChipTextActive
                      ]}>
                        {type.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Fecha */}
            <View style={styles.field}>
              <Text style={styles.label}>Fecha *</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Horarios */}
            <View style={styles.row}>
              <View style={[styles.field, styles.halfWidth]}>
                <Text style={styles.label}>Hora Inicio *</Text>
                <TextInput
                  style={styles.input}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={[styles.field, styles.halfWidth]}>
                <Text style={styles.label}>Hora Fin *</Text>
                <TextInput
                  style={styles.input}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Ubicación */}
            <View style={styles.field}>
              <Text style={styles.label}>Ubicación</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Ej: Sala de conferencias"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Recurrencia */}
            <View style={styles.field}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Evento Recurrente</Text>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: '#E5E7EB', true: '#606C38' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {isRecurring && (
              <>
                {/* Frecuencia */}
                <View style={styles.field}>
                  <Text style={styles.label}>Frecuencia</Text>
                  <View style={styles.segmentedControl}>
                    {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const).map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        style={[
                          styles.segment,
                          frequency === freq && styles.segmentActive
                        ]}
                        onPress={() => setFrequency(freq)}
                      >
                        <Text style={[
                          styles.segmentText,
                          frequency === freq && styles.segmentTextActive
                        ]}>
                          {translateFreq(freq)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Días de la semana (solo para WEEKLY) */}
                {frequency === 'WEEKLY' && (
                  <View style={styles.field}>
                    <Text style={styles.label}>Días de la Semana</Text>
                    <View style={styles.daysRow}>
                      {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.dayChip,
                            selectedDays.includes(day) && styles.dayChipActive
                          ]}
                          onPress={() => toggleDay(day)}
                        >
                          <Text style={[
                            styles.dayChipText,
                            selectedDays.includes(day) && styles.dayChipTextActive
                          ]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Finalización */}
                <View style={styles.field}>
                  <Text style={styles.label}>Finaliza</Text>
                  <View style={styles.segmentedControl}>
                    {(['never', 'until', 'count'] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.segment,
                          endType === type && styles.segmentActive
                        ]}
                        onPress={() => setEndType(type)}
                      >
                        <Text style={[
                          styles.segmentText,
                          endType === type && styles.segmentTextActive
                        ]}>
                          {translateEndType(type)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {endType === 'until' && (
                  <View style={styles.field}>
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={styles.inputText}>
                        {endDate || 'Seleccionar fecha'}
                      </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={endDateObj}
                        mode="date"
                        display="default"
                        onChange={handleDatePickerChange}
                      />
                    )}
                  </View>
                )}

                {endType === 'count' && (
                  <View style={styles.field}>
                    <TextInput
                      style={styles.input}
                      value={count}
                      onChangeText={setCount}
                      placeholder="Número de ocurrencias"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                    />
                  </View>
                )}
              </>
            )}

            {/* Botón crear */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Creando...' : 'Crear Evento de Grupo'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
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
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#283618',
  },

  scrollView: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#606C3815',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 20,
  },

  groupInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#606C38',
    marginLeft: 8,
  },

  field: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#283618',
    marginBottom: 8,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#283618',
  },

  inputText: {
    fontSize: 15,
    color: '#283618',
  },

  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  halfWidth: {
    width: '48%',
  },

  typeContainer: {
    flexDirection: 'row',
  },

  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },

  typeChipActive: {
    // backgroundColor viene dinámico
  },

  typeChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  typeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },

  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },

  segmentActive: {
    backgroundColor: '#606C38',
  },

  segmentText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dayChipActive: {
    backgroundColor: '#606C38',
    borderColor: '#606C38',
  },

  dayChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },

  dayChipTextActive: {
    color: '#FFFFFF',
  },

  submitButton: {
    backgroundColor: '#606C38',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },

  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },

  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
