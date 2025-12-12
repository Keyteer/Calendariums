import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useApp } from '../context/AppContext'
import { getPendingInvitations, updateParticipantStatus, checkEventConflicts } from '../services/events'

interface PendingGroupInvitationsProps {
  visible: boolean
  onClose: () => void
  groupId?: string // Opcional: filtrar por grupo específico
  userId: string
}

interface PendingInvitation {
  id: string // participant ID
  event_id: string
  status: string
  events: {
    id: string
    title: string
    description?: string
    start_datetime: string
    end_datetime: string
    location?: string
    event_types?: {
      name: string
      color: string
      icon: string
    }
  }
}

export default function PendingGroupInvitations({
  visible,
  onClose,
  groupId,
  userId,
}: PendingGroupInvitationsProps) {
  const { refreshEvents, refreshGroups } = useApp()
  const [loading, setLoading] = useState(false)
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      loadInvitations()
    }
  }, [visible])

  const loadInvitations = async () => {
    setLoading(true)
    try {
      const response = await getPendingInvitations(userId)

      if (!response.error && response.invitations) {
        // Si hay groupId, filtrar solo invitaciones de ese grupo
        // Por ahora mostramos todas las invitaciones pendientes
        setInvitations(response.invitations)
      }
    } catch (error) {
      console.error('Error loading invitations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (invitation: PendingInvitation) => {
    // Verificar conflictos antes de aceptar
    const conflicts = await checkEventConflicts(
      userId,
      invitation.events.start_datetime,
      invitation.events.end_datetime
    )

    if (conflicts.length > 0) {
      // Mostrar advertencia de conflictos
      const conflictTitles = conflicts.map((e: any) => e.title).join(', ')
      Alert.alert(
        'Conflicto de Horario',
        `Este evento se solapa con: ${conflictTitles}. ¿Deseas aceptar de todas formas?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Aceptar',
            onPress: () => processAccept(invitation.id)
          }
        ]
      )
    } else {
      processAccept(invitation.id)
    }
  }

  const processAccept = async (participantId: string) => {
    setProcessingId(participantId)
    try {
      const response = await updateParticipantStatus(participantId, 'accepted')

      if (response.error) {
        Alert.alert('Error', 'No se pudo aceptar la invitación')
        return
      }

      Alert.alert('Invitación Aceptada', 'Has aceptado el evento')
      await loadInvitations()
      await refreshEvents?.()
      await refreshGroups?.()
    } catch (error) {
      console.error('Error accepting invitation:', error)
      Alert.alert('Error', 'Ocurrió un error al aceptar')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDecline = (participantId: string) => {
    Alert.alert(
      'Rechazar Invitación',
      '¿Estás seguro de que deseas rechazar esta invitación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: () => processDecline(participantId)
        }
      ]
    )
  }

  const processDecline = async (participantId: string) => {
    setProcessingId(participantId)
    try {
      const response = await updateParticipantStatus(participantId, 'declined')

      if (response.error) {
        Alert.alert('Error', 'No se pudo rechazar la invitación')
        return
      }

      Alert.alert('Invitación Rechazada', 'Has rechazado el evento')
      await loadInvitations()
      await refreshEvents?.()
      await refreshGroups?.()
    } catch (error) {
      console.error('Error declining invitation:', error)
      Alert.alert('Error', 'Ocurrió un error al rechazar')
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
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
            <Text style={styles.title}>Invitaciones Pendientes</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#283618" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#606C38" />
              <Text style={styles.loadingText}>Cargando invitaciones...</Text>
            </View>
          ) : invitations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No tienes invitaciones pendientes</Text>
              <Text style={styles.emptySubtext}>
                Cuando te inviten a eventos de grupo, aparecerán aquí
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
              {invitations.map((invitation) => (
                <View key={invitation.id} style={styles.invitationCard}>
                  {/* Event type badge */}
                  {invitation.events.event_types && (
                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: invitation.events.event_types.color }
                      ]}
                    >
                      <Text style={styles.typeBadgeText}>
                        {invitation.events.event_types.name}
                      </Text>
                    </View>
                  )}

                  {/* Event info */}
                  <Text style={styles.eventTitle}>{invitation.events.title}</Text>

                  {invitation.events.description && (
                    <Text style={styles.eventDescription} numberOfLines={2}>
                      {invitation.events.description}
                    </Text>
                  )}

                  <View style={styles.eventDetails}>
                    <View style={styles.detailRow}>
                      <Feather name="calendar" size={16} color="#606C38" />
                      <Text style={styles.detailText}>
                        {formatDate(invitation.events.start_datetime)}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Feather name="clock" size={16} color="#606C38" />
                      <Text style={styles.detailText}>
                        {formatTime(invitation.events.start_datetime)} -{' '}
                        {formatTime(invitation.events.end_datetime)}
                      </Text>
                    </View>

                    {invitation.events.location && (
                      <View style={styles.detailRow}>
                        <Feather name="map-pin" size={16} color="#606C38" />
                        <Text style={styles.detailText}>{invitation.events.location}</Text>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.button, styles.declineButton]}
                      onPress={() => handleDecline(invitation.id)}
                      disabled={processingId === invitation.id}
                    >
                      <Feather name="x" size={18} color="#EF4444" />
                      <Text style={styles.declineButtonText}>Rechazar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.button, styles.acceptButton]}
                      onPress={() => handleAccept(invitation)}
                      disabled={processingId === invitation.id}
                    >
                      {processingId === invitation.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Feather name="check" size={18} color="#FFFFFF" />
                          <Text style={styles.acceptButtonText}>Aceptar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
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

  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#283618',
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },

  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#283618',
    marginTop: 16,
    textAlign: 'center',
  },

  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },

  scrollView: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  invitationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#606C38',
  },

  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },

  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },

  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#283618',
    marginBottom: 6,
  },

  eventDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },

  eventDetails: {
    marginBottom: 16,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  detailText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },

  declineButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF4444',
  },

  declineButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  acceptButton: {
    backgroundColor: '#606C38',
  },

  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
})
