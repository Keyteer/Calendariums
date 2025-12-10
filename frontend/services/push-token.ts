import { supabase } from './supabase'

// Función para subir el Expo Push Token la tabla users
export async function uploadPushToken(userId: string, expoPushToken: string) {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        expo_push_token: expoPushToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('Error uploading push token:', error)
    } else {
      console.log('Push token uploaded successfully!')
    }
  } catch (error) {
    console.error('Error uploading push token:', error)
  }
}

// Función para obtener el Expo Push Token de un usuario
export async function getPushToken(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('expo_push_token')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching push token:', error)
      return null
    }

    return data?.expo_push_token || null

  } catch (error) {
    console.error('Error fetching push token:', error)
    return null
  }
}