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
import { useApp, Group } from '../context/AppContext'
import { getGroupMembers, removeMemberFromGroup, updateMemberRole } from '../services/groups'

interface GroupSettingsModalProps {
  visible: boolean
  onClose: () => void
  group: Group
}

export default function GroupSettingsModal({
  visible,
  onClose,
  group,
}: GroupSettingsModalProps) {
  const { user, refreshGroups } = useApp()
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<any[]>([])

  const isAdmin = group.user_role === 'admin'
  const isModerator = group.user_role === 'moderator' || isAdmin

  useEffect(() => {
    if (visible) {
      loadMembers()
    }
  }, [visible])

  const loadMembers = async () => {
    setLoading(true)
    try {
      const response = await getGroupMembers(group.id)
      if (!response.error) {
        setMembers(response.members || [])
      }
    } catch (error) {
      console.error('Error loading members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = (member: any) => {
    // Admin puede remover a cualquiera
    // Moderator solo puede remover a members
    if (isAdmin || (isModerator && member.role === 'member')) {
      Alert.alert(
        'Remover Miembro',
        `¿Estás seguro de que deseas remover a ${member.user?.full_name || member.user?.username} del grupo?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Remover',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeMemberFromGroup(group.id, member.user_id)
                Alert.alert('Éxito', 'Miembro removido del grupo')
                await loadMembers()
                await refreshGroups()
              } catch (error) {
                Alert.alert('Error', 'No se pudo remover al miembro')
              }
            }
          }
        ]
      )
    } else {
      Alert.alert('Sin permisos', 'No tienes permisos para remover a este miembro')
    }
  }

  const handleChangeRole = (member: any, newRole: 'admin' | 'moderator' | 'member') => {
    if (!isAdmin) {
      Alert.alert('Sin permisos', 'Solo los administradores pueden cambiar roles')
      return
    }

    Alert.alert(
      'Cambiar Rol',
      `¿Cambiar el rol de ${member.user?.full_name || member.user?.username} a ${newRole}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cambiar',
          onPress: async () => {
            try {
              await updateMemberRole(group.id, member.user_id, newRole)
              Alert.alert('Éxito', 'Rol actualizado')
              await loadMembers()
              await refreshGroups()
            } catch (error) {
              Alert.alert('Error', 'No se pudo actualizar el rol')
            }
          }
        }
      ]
    )
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#606C38'
      case 'moderator': return '#DDA15E'
      default: return '#6B7280'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador'
      case 'moderator': return 'Moderador'
      default: return 'Miembro'
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Configuración del Grupo</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#283618" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#606C38" />
              <Text style={styles.loadingText}>Cargando miembros...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView}>
              {/* Miembros */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Miembros ({members.length})
                </Text>

                {members.map((member) => (
                  <View key={member.id} style={styles.memberCard}>
                    <View style={styles.memberIcon}>
                      <Feather name="user" size={20} color="#606C38" />
                    </View>

                    <View style={styles.memberContent}>
                      <Text style={styles.memberName}>
                        {member.user?.full_name || member.user?.username}
                        {member.user_id === user?.id && ' (Tú)'}
                      </Text>
                      <Text style={[styles.memberRole, { color: getRoleColor(member.role) }]}>
                        {getRoleLabel(member.role)}
                      </Text>
                    </View>

                    {/* Solo mostrar acciones si no es el usuario actual */}
                    {member.user_id !== user?.id && (
                      <View style={styles.memberActions}>
                        {/* Cambiar rol (solo admin) */}
                        {isAdmin && member.role !== 'admin' && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                              const newRole = member.role === 'moderator' ? 'member' : 'moderator'
                              handleChangeRole(member, newRole)
                            }}
                          >
                            <Feather
                              name={member.role === 'moderator' ? 'arrow-down' : 'arrow-up'}
                              size={16}
                              color="#606C38"
                            />
                          </TouchableOpacity>
                        )}

                        {/* Remover miembro */}
                        {(isAdmin || (isModerator && member.role === 'member')) && (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.dangerButton]}
                            onPress={() => handleRemoveMember(member)}
                          >
                            <Feather name="user-minus" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  modalContainer: {
    backgroundColor: '#FEFAE0',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '85%',
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

  scrollView: {
    flex: 1,
  },

  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#283618',
    marginBottom: 12,
  },

  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },

  memberIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#606C3815',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  memberContent: {
    flex: 1,
  },

  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#283618',
    marginBottom: 2,
  },

  memberRole: {
    fontSize: 12,
    fontWeight: '500',
  },

  memberActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },

  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  dangerButton: {
    backgroundColor: '#FEE2E2',
  },
})
