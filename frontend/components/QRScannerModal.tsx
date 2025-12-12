import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { joinGroupByInviteCode, getGroupByInviteCode } from '../services/groups'
import { useApp } from '../context/AppContext'

interface QRScannerModalProps {
  visible: boolean
  onClose: () => void
}

export default function QRScannerModal({ visible, onClose }: QRScannerModalProps) {
  const { user, refreshGroups } = useApp()
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible) {
      setScanned(false)
    }
  }, [visible])

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return

    setScanned(true)

    console.log('Scanned data:', data)

    // Regex para soportar ambos formatos:
    // 1. calendariums://group/invite/CODE
    // 2. exp://IP:PORT/--/group/invite/CODE
    const inviteCodeMatch = data.match(/(?:group\/invite\/)([A-Z0-9]+)/i)

    if (!inviteCodeMatch) {
      Alert.alert('Código inválido', 'El código QR no contiene una invitación válida')
      setScanned(false)
      return
    }

    const inviteCode = inviteCodeMatch[1].toUpperCase()

    try {
      setLoading(true)

      // Obtener información del grupo
      const groupInfo = await getGroupByInviteCode(inviteCode)

      if (groupInfo.error) {
        Alert.alert('Error', groupInfo.error)
        setScanned(false)
        setLoading(false)
        return
      }

      // Mostrar confirmación
      const groupName = groupInfo.invite?.groups?.name || 'Grupo'
      Alert.alert(
        'Unirse al Grupo',
        `¿Deseas unirte al grupo "${groupName}"?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => {
              setScanned(false)
              setLoading(false)
            }
          },
          {
            text: 'Unirse',
            onPress: async () => {
              if (!user) {
                Alert.alert('Error', 'Debes iniciar sesión para unirte')
                setScanned(false)
                setLoading(false)
                return
              }

              const result = await joinGroupByInviteCode(inviteCode, user.id)

              if (result.error) {
                Alert.alert('Error', result.error)
              } else {
                Alert.alert('¡Éxito!', `Te has unido al grupo "${groupName}"`)
                await refreshGroups()
                onClose()
              }

              setScanned(false)
              setLoading(false)
            }
          }
        ]
      )
    } catch (error) {
      console.error('Error processing QR code:', error)
      Alert.alert('Error', 'Ocurrió un error al procesar el código QR')
      setScanned(false)
      setLoading(false)
    }
  }

  if (!permission) {
    return null
  }

  if (!permission.granted) {
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
            <View style={styles.header}>
              <Text style={styles.title}>Escanear Código QR</Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={24} color="#283618" />
              </TouchableOpacity>
            </View>

            <View style={styles.permissionContainer}>
              <Feather name="camera-off" size={64} color="#DDA15E" />
              <Text style={styles.permissionTitle}>Permiso de Cámara Requerido</Text>
              <Text style={styles.permissionText}>
                Necesitamos acceso a tu cámara para escanear códigos QR de invitación
              </Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestPermission}
              >
                <Text style={styles.permissionButtonText}>Otorgar Permiso</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.fullScreen}>
        {/* Header */}
        <View style={styles.scannerHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.scannerTitle}>Escanear Código QR</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Camera */}
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
        </CameraView>

        {/* Overlay (moved outside CameraView) */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <View style={styles.cameraOverlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
          </View>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>Procesando...</Text>
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsText}>
            Apunta la cámara al código QR de invitación
          </Text>
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

  permissionContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },

  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#283618',
    marginTop: 20,
    marginBottom: 12,
  },

  permissionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  permissionButton: {
    backgroundColor: '#606C38',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  fullScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },

  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },

  closeButton: {
    padding: 4,
  },

  scannerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  camera: {
    flex: 1,
  },

  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },

  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
  },

  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },

  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },

  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },

  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },

  instructions: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  instructionsText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
})
