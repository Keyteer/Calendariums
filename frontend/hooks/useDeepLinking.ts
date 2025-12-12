import { useEffect } from 'react'
import * as Linking from 'expo-linking'
import { Alert } from 'react-native'
import { useApp } from '../context/AppContext'
import { getGroupByInviteCode, joinGroupByInviteCode } from '../services/groups'

export function useDeepLinking() {
  const { user, refreshGroups } = useApp()

  useEffect(() => {
    // Manejar deep link al abrir la app
    const handleDeepLink = async (url: string) => {
      console.log('Deep link received:', url)

      // Parsear el deep link: calendariums://group/invite/{code}
      const match = url.match(/calendariums:\/\/group\/invite\/([A-Z0-9]+)/)

      if (match && match[1]) {
        const inviteCode = match[1]
        await handleGroupInvite(inviteCode)
      }
    }

    const handleGroupInvite = async (inviteCode: string) => {
      if (!user) {
        Alert.alert(
          'Iniciar sesión',
          'Debes iniciar sesión para unirte a un grupo',
          [{ text: 'OK' }]
        )
        return
      }

      try {
        // Obtener información del grupo
        const groupInfo = await getGroupByInviteCode(inviteCode)

        if (groupInfo.error) {
          Alert.alert('Error', 'Código de invitación inválido o expirado')
          return
        }

        // Mostrar confirmación
        Alert.alert(
          'Unirse al Grupo',
          `¿Deseas unirte al grupo "${groupInfo.group.name}"?`,
          [
            {
              text: 'Cancelar',
              style: 'cancel'
            },
            {
              text: 'Unirse',
              onPress: async () => {
                const result = await joinGroupByInviteCode(inviteCode, user.id)

                if (result.error) {
                  Alert.alert('Error', result.error)
                } else {
                  Alert.alert('¡Éxito!', `Te has unido al grupo "${groupInfo.group.name}"`)
                  await refreshGroups()
                }
              }
            }
          ]
        )
      } catch (error) {
        console.error('Error handling group invite:', error)
        Alert.alert('Error', 'Ocurrió un error al procesar la invitación')
      }
    }

    // Obtener URL inicial (cuando la app se abre desde un link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url)
      }
    })

    // Escuchar nuevos deep links (cuando la app ya está abierta)
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url)
    })

    return () => {
      subscription.remove()
    }
  }, [user])
}
