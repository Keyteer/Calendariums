import React, { useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useApp, Group } from '../context/AppContext'
import GroupInviteModal from './GroupInviteModal'
import GroupSettingsModal from './GroupSettingsModal'

interface GroupDetailProps {
  group: Group
  onBack: () => void
}

export default function GroupDetail({ group, onBack }: GroupDetailProps) {
  const { user } = useApp()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const isAdmin = group.user_role === 'admin'
  const isModerator = group.user_role === 'moderator' || isAdmin

  if (!user) return null

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#283618" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.title} numberOfLines={1}>
            {group.name}
          </Text>
          {group.description && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {group.description}
            </Text>
          )}
        </View>

        {/* Botón de settings solo para admin */}
        {isAdmin && (
          <TouchableOpacity
            onPress={() => setShowSettingsModal(true)}
            style={styles.settingsButton}
          >
            <Feather name="settings" size={22} color="#606C38" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Información del grupo */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Feather name="users" size={18} color="#606C38" />
              <Text style={styles.infoText}>
                {group.member_count || 0} {group.member_count === 1 ? 'miembro' : 'miembros'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Feather name="calendar" size={18} color="#606C38" />
              <Text style={styles.infoText}>
                Creado el {new Date(group.created_at).toLocaleDateString('es-ES')}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Feather name="shield" size={18} color="#606C38" />
              <Text style={styles.infoText}>
                Tu rol: {group.user_role === 'admin' ? 'Administrador' :
                         group.user_role === 'moderator' ? 'Moderador' : 'Miembro'}
              </Text>
            </View>
          </View>
        </View>

        {/* Acciones rápidas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones</Text>

          {/* Invitar miembros */}
          {isModerator && (
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => setShowInviteModal(true)}
            >
              <View style={styles.actionIcon}>
                <Feather name="user-plus" size={22} color="#606C38" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Invitar Miembros</Text>
                <Text style={styles.actionDescription}>
                  Comparte un link o código QR
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          {/* Ver calendario del grupo */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => Alert.alert('Próximamente', 'Calendario del grupo')}
          >
            <View style={styles.actionIcon}>
              <Feather name="calendar" size={22} color="#606C38" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Calendario del Grupo</Text>
              <Text style={styles.actionDescription}>
                Ver disponibilidad de miembros
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Crear evento de grupo */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => Alert.alert('Próximamente', 'Crear evento de grupo')}
          >
            <View style={styles.actionIcon}>
              <Feather name="plus-circle" size={22} color="#606C38" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Crear Evento de Grupo</Text>
              <Text style={styles.actionDescription}>
                Agenda una actividad grupal
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Ver miembros */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setShowSettingsModal(true)}
          >
            <View style={styles.actionIcon}>
              <Feather name="users" size={22} color="#606C38" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Ver Miembros</Text>
              <Text style={styles.actionDescription}>
                {group.member_count || 0} {group.member_count === 1 ? 'miembro' : 'miembros'}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Invitaciones pendientes */}
        {group.pending_invitations_count && group.pending_invitations_count > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invitaciones Pendientes</Text>
            <TouchableOpacity
              style={[styles.actionCard, styles.pendingCard]}
              onPress={() => Alert.alert('Próximamente', 'Ver invitaciones pendientes')}
            >
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingCount}>{group.pending_invitations_count}</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Eventos Pendientes</Text>
                <Text style={styles.actionDescription}>
                  Tienes invitaciones sin responder
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Zona de peligro (solo admin) */}
        {isAdmin && (
          <View style={[styles.section, styles.dangerSection]}>
            <Text style={[styles.sectionTitle, styles.dangerTitle]}>Zona de Peligro</Text>
            <TouchableOpacity
              style={[styles.actionCard, styles.dangerCard]}
              onPress={() => {
                Alert.alert(
                  'Eliminar Grupo',
                  `¿Estás seguro de que deseas eliminar "${group.name}"? Esta acción no se puede deshacer.`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Eliminar',
                      style: 'destructive',
                      onPress: () => Alert.alert('Próximamente', 'Funcionalidad de eliminación')
                    }
                  ]
                )
              }}
            >
              <View style={[styles.actionIcon, styles.dangerIcon]}>
                <Feather name="trash-2" size={22} color="#EF4444" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, styles.dangerText]}>Eliminar Grupo</Text>
                <Text style={styles.actionDescription}>
                  Acción permanente e irreversible
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal de invitación */}
      {showInviteModal && (
        <GroupInviteModal
          visible={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          groupId={group.id}
          groupName={group.name}
          userId={user.id}
        />
      )}

      {/* Modal de configuración */}
      {showSettingsModal && (
        <GroupSettingsModal
          visible={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          group={group}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFAE0',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FEFAE0',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },

  backButton: {
    marginRight: 12,
  },

  headerContent: {
    flex: 1,
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#283618',
  },

  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },

  settingsButton: {
    marginLeft: 12,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 100,
  },

  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#283618',
    marginBottom: 12,
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  infoText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 12,
  },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#606C3815',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  actionContent: {
    flex: 1,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#283618',
    marginBottom: 2,
  },

  actionDescription: {
    fontSize: 12,
    color: '#6B7280',
  },

  pendingCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },

  pendingBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  pendingCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
  },

  dangerSection: {
    marginTop: 20,
  },

  dangerTitle: {
    color: '#EF4444',
  },

  dangerCard: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },

  dangerIcon: {
    backgroundColor: '#FEE2E2',
  },

  dangerText: {
    color: '#EF4444',
  },
})
