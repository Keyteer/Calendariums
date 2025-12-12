import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useApp } from '../context/AppContext'
import CreateGroupModal from './CreateGroupModal'
import QRScannerModal from './QRScannerModal'
import JoinGroupModal from './JoinGroupModal'

export default function GroupsList() {
  const { user, groups, groupsLoading, refreshGroups, setSelectedGroup } = useApp()
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [scannerModalVisible, setScannerModalVisible] = useState(false)
  const [joinModalVisible, setJoinModalVisible] = useState(false)

  useEffect(() => {
    // Refresh groups cuando se monta el componente
    if (user) {
      refreshGroups()
    }
  }, [])

  const handleGroupPress = (group: any) => {
    setSelectedGroup(group)
  }

  if (groupsLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mis Grupos</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={() => setJoinModalVisible(true)}
              style={styles.iconButton}
            >
              <Feather name="hash" size={24} color="#606C38" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setScannerModalVisible(true)}
              style={styles.iconButton}
            >
              <Feather name="camera" size={24} color="#606C38" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando grupos...</Text>
        </View>

        {/* Modal de escáner QR */}
        <QRScannerModal
          visible={scannerModalVisible}
          onClose={() => setScannerModalVisible(false)}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mis Grupos</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => setJoinModalVisible(true)}
            style={styles.iconButton}
          >
            <Feather name="hash" size={24} color="#606C38" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setScannerModalVisible(true)}
            style={styles.iconButton}
          >
            <Feather name="camera" size={24} color="#606C38" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {groups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="users" size={64} color="#DDA15E" />
            <Text style={styles.emptyTitle}>No tienes grupos</Text>
            <Text style={styles.emptySubtitle}>
              Crea un grupo para colaborar con otros usuarios
            </Text>
          </View>
        ) : (
          <View style={styles.groupsGrid}>
            {groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={styles.groupCard}
                onPress={() => handleGroupPress(group)}
                activeOpacity={0.7}
              >
                {/* Badge de notificaciones */}
                {(group.pending_invitations_count || 0) > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{group.pending_invitations_count}</Text>
                  </View>
                )}

                {/* Icono del grupo */}
                <View style={styles.groupIconContainer}>
                  <Feather name="users" size={24} color="#606C38" />
                </View>

                {/* Contenido del grupo */}
                <View style={styles.groupContent}>
                  <Text style={styles.groupName} numberOfLines={1}>
                    {group.name}
                  </Text>

                  {/* Descripción */}
                  {group.description && (
                    <Text style={styles.groupDescription} numberOfLines={1}>
                      {group.description}
                    </Text>
                  )}

                  {/* Info del grupo */}
                  <View style={styles.groupInfo}>
                    <View style={styles.infoRow}>
                      <Feather name="users" size={12} color="#6B7280" />
                      <Text style={styles.infoText}>
                        {group.member_count || 0} {group.member_count === 1 ? 'miembro' : 'miembros'}
                      </Text>
                    </View>

                    {/* Rol del usuario */}
                    {group.user_role && (
                      <View style={[
                        styles.roleBadge,
                        group.user_role === 'admin' && styles.roleBadgeAdmin,
                        group.user_role === 'moderator' && styles.roleBadgeModerator
                      ]}>
                        <Text style={[
                          styles.roleText,
                          group.user_role === 'admin' && styles.roleTextAdmin,
                          group.user_role === 'moderator' && styles.roleTextModerator
                        ]}>
                          {group.user_role === 'admin' ? 'Admin' :
                            group.user_role === 'moderator' ? 'Mod' : 'Miembro'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB para crear grupo */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modal de creación */}
      <CreateGroupModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />

      {/* Modal de escáner QR */}
      <QRScannerModal
        visible={scannerModalVisible}
        onClose={() => setScannerModalVisible(false)}
      />

      {/* Modal de unirse con código */}
      <JoinGroupModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FEFAE0',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#283618',
  },

  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconButton: {
    padding: 8,
    marginLeft: 8,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Espacio para el footer
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#283618',
    marginTop: 20,
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  groupsGrid: {
    paddingVertical: 6,
  },

  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    position: 'relative',
    marginBottom: 12,
  },

  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  groupIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#606C3815',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  groupContent: {
    flex: 1,
  },

  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#283618',
    marginBottom: 3,
  },

  groupDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 16,
  },

  groupInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  infoText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 6,
  },

  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
  },

  roleBadgeAdmin: {
    backgroundColor: '#606C3820',
  },

  roleBadgeModerator: {
    backgroundColor: '#DDA15E20',
  },

  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },

  roleTextAdmin: {
    color: '#606C38',
  },

  roleTextModerator: {
    color: '#DDA15E',
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
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
