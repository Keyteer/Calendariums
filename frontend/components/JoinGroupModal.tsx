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
import { joinGroupByInviteCode, getGroupByInviteCode } from '../services/groups'

interface JoinGroupModalProps {
    visible: boolean
    onClose: () => void
}

export default function JoinGroupModal({ visible, onClose }: JoinGroupModalProps) {
    const { user, refreshGroups } = useApp()
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)

    const handleJoin = async () => {
        const cleanCode = code.trim().toUpperCase()
        if (!cleanCode) {
            Alert.alert('Error', 'Por favor ingresa el código')
            return
        }

        if (cleanCode.length < 6) {
            Alert.alert('Error', 'El código es demasiado corto')
            return
        }

        if (!user) {
            Alert.alert('Error', 'User not authenticated')
            return
        }

        setLoading(true)
        try {
            // Primero verificamos el grupo (opcional, pero buena UX)
            const groupInfo = await getGroupByInviteCode(cleanCode)

            if (groupInfo.error) {
                Alert.alert('Error', 'Código inválido o grupo no encontrado')
                setLoading(false)
                return
            }

            const groupName = groupInfo.invite?.groups?.name || 'Grupo'

            // Confirmar
            Alert.alert(
                'Unirse al Grupo',
                `¿Deseas unirte a "${groupName}"?`,
                [
                    { text: 'Cancelar', style: 'cancel', onPress: () => setLoading(false) },
                    {
                        text: 'Unirse',
                        onPress: async () => {
                            const res = await joinGroupByInviteCode(cleanCode, user.id)

                            if (res.error) {
                                // Verificar si el error es porque ya es miembro
                                if (res.error.includes('duplicate') || res.error.includes('already a member')) {
                                    Alert.alert('Aviso', `Ya formas parte del grupo "${groupName}"`)
                                    onClose()
                                } else {
                                    Alert.alert('Error', res.error)
                                }
                            } else {
                                Alert.alert('Éxito', `Ahora eres miembro de ${groupName}`)
                                setCode('')
                                await refreshGroups()
                                onClose()
                            }
                            setLoading(false)
                        }
                    }
                ]
            )

        } catch (error) {
            console.error('Error joining group:', error)
            Alert.alert('Error', 'Ocurrió un error inesperado')
            setLoading(false)
        }
    }

    const handleClose = () => {
        if (!loading) {
            setCode('')
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
                    <View style={styles.header}>
                        <Text style={styles.title}>Unirse con Código</Text>
                        <TouchableOpacity onPress={handleClose} disabled={loading}>
                            <Feather name="x" size={24} color="#283618" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.description}>
                            Ingresa el código de 8 caracteres que te compartieron
                        </Text>

                        <View style={styles.inputContainer}>
                            <Feather name="hash" size={20} color="#6B7280" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={code}
                                onChangeText={text => setCode(text.toUpperCase())}
                                placeholder="EJ: AB12CD34"
                                placeholderTextColor="#9CA3AF"
                                maxLength={8}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                editable={!loading}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, (!code.trim() || loading) && styles.buttonDisabled]}
                            onPress={handleJoin}
                            disabled={!code.trim() || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.buttonText}>Buscar Grupo</Text>
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
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#283618',
    },
    content: {
        padding: 24,
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        marginBottom: 24,
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 18,
        color: '#333',
        fontWeight: '600',
        letterSpacing: 2,
    },
    button: {
        backgroundColor: '#606C38',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
})
