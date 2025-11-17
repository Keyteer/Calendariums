import React, { useState } from 'react'
import { Alert, StyleSheet, View, AppState } from 'react-native'
import { supabase } from '../services/supabase'
import { Button, Input } from '@rneui/themed'

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
    setLoading(false)
  }

  async function signUpWithEmail() {
    setLoading(true)
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: undefined,
        data: {
          username: username,
          full_name: fullName,
        }
      }
    })

    if (error) {
      Alert.alert('Error', error.message)
    } else if (session) {
      // Registro exitoso con sesión automática
      Alert.alert('¡Registro exitoso!', 'Bienvenido a Calendariums')
    } else {
      // Si no hay sesión, significa que está habilitada la confirmación por email
      Alert.alert('Registro completado', 'Revisa tu correo para confirmar tu cuenta')
    }
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      {isSignUp && (
        <>
          <View style={[styles.verticallySpaced, styles.mt20]}>
            <Input
              label="Nombre Completo"
              leftIcon={{ type: 'font-awesome', name: 'user' }}
              onChangeText={(text) => setFullName(text)}
              value={fullName}
              placeholder="Juan Pérez"
              autoCapitalize={'words'}
            />
          </View>
          <View style={styles.verticallySpaced}>
            <Input
              label="Usuario"
              leftIcon={{ type: 'font-awesome', name: 'at' }}
              onChangeText={(text) => setUsername(text)}
              value={username}
              placeholder="juanperez"
              autoCapitalize={'none'}
            />
          </View>
        </>
      )}
      <View style={[styles.verticallySpaced, isSignUp ? {} : styles.mt20]}>
        <Input
          label="Correo"
          leftIcon={{ type: 'font-awesome', name: 'envelope' }}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@calendariums.com"
          autoCapitalize={'none'}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Contraseña"
          leftIcon={{ type: 'font-awesome', name: 'lock' }}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Contraseña"
          autoCapitalize={'none'}
        />
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        {!isSignUp ? (
          <>
            <Button title="Iniciar Sesión" disabled={loading} onPress={() => signInWithEmail()} />
            <Button
              title="¿No tienes cuenta? Regístrate"
              type="clear"
              onPress={() => setIsSignUp(true)}
            />
          </>
        ) : (
          <>
            <Button title="Registrarse" disabled={loading} onPress={() => signUpWithEmail()} />
            <Button
              title="¿Ya tienes cuenta? Inicia sesión"
              type="clear"
              onPress={() => setIsSignUp(false)}
            />
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
})