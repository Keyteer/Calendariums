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
} from 'react-native'
import { Feather } from '@expo/vector-icons'
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

  function resetForm() {
    setTitle('')
    setDescription('')
    setLocation('')
    setDate(selectedDate)
    setStartTime('')
    setEndTime('')
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
})
