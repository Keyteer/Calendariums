import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import QRCode from 'react-native-qrcode-svg'
import * as Clipboard from 'expo-clipboard'
import { generateGroupInvite } from '../services/groups'
import * as Linking from 'expo-linking'

interface GroupInviteModalProps {
  visible: boolean
  onClose: () => void
  groupId: string
  groupName: string
  userId: string
}

export default function GroupInviteModal({
  visible,
  onClose,
  groupId,
  groupName,
  userId,
}: GroupInviteModalProps) {
  const [loading, setLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  useEffect(() => {
    if (visible && !inviteCode) {
      generateInvite()
    }
  }, [visible])

  const generateInvite = async () => {
    setLoading(true)
    try {
      const response = await generateGroupInvite(groupId, userId)

      if (response.error) {
        Alert.alert('Error', 'No se pudo generar el código de invitación')
        onClose()
        return
      }

      const code = response.invite.invite_code
      setInviteCode(code)

      // Usar deep link scheme configurado en app.json
      const link = `calendariums://group/invite/${code}`

      console.log('QR Code Link:', link)
      setInviteLink(link)
    } catch (error) {
      console.error('Error generating invite:', error)
      Alert.alert('Error', 'Ocurrió un error inesperado')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (inviteLink) {
      await Clipboard.setStringAsync(inviteLink)
      Alert.alert('Copiado', 'Link de invitación copiado al portapapeles')
    }
  }

  const handleCopyCode = async () => {
    if (inviteCode) {
      await Clipboard.setStringAsync(inviteCode)
      Alert.alert('Copiado', 'Código copiado al portapapeles')
    }
  }

  const handleShare = async () => {
    if (!inviteLink || !inviteCode) return

    try {
      const message = `¡Únete a mi grupo "${groupName}" en Calendariums!\n\nCódigo: ${inviteCode}\nO usa este link: ${inviteLink}`

      await Share.share({
        message,
        title: `Invitación a ${groupName}`,
      })
    } catch (error) {
      console.error('Error sharing:', error)
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
            <Text style={styles.title}>Invitar al Grupo</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#283618" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#606C38" />
              <Text style={styles.loadingText}>Generando código...</Text>
            </View>
          ) : (
            <>
              {/* QR Code */}
              {inviteLink && (
                <View style={styles.qrContainer}>
                  <Text style={styles.sectionTitle}>Escanea el código QR</Text>
                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={inviteLink}
                      size={200}
                      color="#283618"
                      backgroundColor="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.hint}>
                    Los miembros pueden escanearlo desde la app
                  </Text>
                </View>
              )}

              {/* Código de invitación */}
              {inviteCode && (
                <View style={styles.codeContainer}>
                  <Text style={styles.sectionTitle}>Código de invitación</Text>
                  <View style={styles.codeBox}>
                    <Text style={styles.code}>{inviteCode}</Text>
                    <TouchableOpacity onPress={handleCopyCode} style={styles.copyButton}>
                      <Feather name="copy" size={18} color="#606C38" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.hint}>Válido por 7 días</Text>
                </View>
              )}

              {/* Botones de acción */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={handleCopyLink}
                >
                  <View style={styles.buttonIcon}>
                    <Feather name="link" size={18} color="#606C38" />
                  </View>
                  <Text style={styles.buttonSecondaryText}>Copiar Link</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleShare}
                >
                  <View style={styles.buttonIcon}>
                    <Feather name="share-2" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.buttonPrimaryText}>Compartir</Text>
                </TouchableOpacity>
              </View>
            </>
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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

  qrContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#283618',
    marginBottom: 16,
  },

  qrWrapper: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },

  codeContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#606C38',
    borderStyle: 'dashed',
  },

  code: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#606C38',
    letterSpacing: 2,
  },

  copyButton: {
    padding: 8,
  },

  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 6,
  },

  buttonIcon: {
    marginRight: 8,
  },

  buttonPrimary: {
    backgroundColor: '#606C38',
  },

  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#606C38',
  },

  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  buttonSecondaryText: {
    color: '#606C38',
    fontSize: 15,
    fontWeight: '600',
  },
})
