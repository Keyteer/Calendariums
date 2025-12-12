import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useApp } from '../context/AppContext'
import { createGroup } from '../services/groups'

interface CreateGroupModalProps {
  visible: boolean
  onClose: () => void
}

export default function CreateGroupModal({ visible, onClose }: CreateGroupModalProps) {
  const { user, refreshGroups } = useApp()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre del grupo es requerido')
      return
    }

    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para crear un grupo')
      return
    }

    setLoading(true)

    try {
      const response = await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        creator_id: user.id,
      })

      if (response.error) {
        Alert.alert('Error', 'No se pudo crear el grupo: ' + response.error)
        return
      }

      Alert.alert('Éxito', 'Grupo creado correctamente')

      // Limpiar formulario
      setName('')
      setDescription('')

      // Refresh grupos
      await refreshGroups()

      // Cerrar modal
      onClose()
    } catch (error) {
      console.error('Error creating group:', error)
      Alert.alert('Error', 'Ocurrió un error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setName('')
      setDescription('')
      onClose()
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Crear Grupo</Text>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <Feather name="x" size={24} color="#283618" />
            </TouchableOpacity>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            {/* Nombre del grupo */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre del grupo *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej: Grupo de estudio Cálculo"
                placeholderTextColor="#9CA3AF"
                maxLength={100}
                editable={!loading}
              />
            </View>

            {/* Descripción */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe el propósito del grupo..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
                editable={!loading}
              />
            </View>
          </View>

          {/* Botones */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.buttonSecondaryText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Crear</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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

  form: {
    padding: 20,
  },

  formGroup: {
    marginBottom: 20,
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
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },

  textArea: {
    height: 100,
    paddingTop: 12,
  },

  buttons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
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

  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#606C38',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  buttonSecondaryText: {
    color: '#606C38',
    fontSize: 16,
    fontWeight: '600',
  },
})
