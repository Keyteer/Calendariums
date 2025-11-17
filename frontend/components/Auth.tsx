import React, { useState } from 'react'
import { Alert, StyleSheet, View, TouchableOpacity, Text } from 'react-native'
import { supabase } from '../services/supabase'
import { Input } from '@rneui/themed'

type AuthProps = {
  onBackPress: () => void;
}

export default function Auth({ onBackPress }: AuthProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
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
      email,
      password,
      options: {
        data: {
          username,
          full_name: fullName,
        }
      }
    })

    if (error) {
      Alert.alert('Error', error.message)
    } else if (session) {
      Alert.alert('¡Registro exitoso!', 'Bienvenido a Calendariums')
    } else {
      Alert.alert('Registro completado', 'Revisa tu correo para confirmar tu cuenta')
    }

    setLoading(false)
  }

  return (
    <View style={styles.container}>
      
      
      

      <Text style={styles.title}>
        {isSignUp ? "Crear Cuenta" : "Iniciar Sesión"}
      </Text>

      {isSignUp && (
        <>
          <Input
            label="Nombre Completo"
            onChangeText={setFullName}
            value={fullName}
            placeholder="Juan Pérez"
          />

          <Input
            label="Usuario"
            onChangeText={setUsername}
            value={username}
            autoCapitalize="none"
            placeholder="juanperez"
          />
        </>
      )}

      <Input
        label="Correo"
        onChangeText={setEmail}
        value={email}
        autoCapitalize="none"
        placeholder="email@calendariums.com"
      />

      <Input
        label="Contraseña"
        onChangeText={setPassword}
        value={password}
        secureTextEntry={true}
        placeholder="Contraseña"
        autoCapitalize="none"
      />
      

      {!isSignUp ? (
        <>
          {/* LOGIN BUTTON */}
          <TouchableOpacity
            style={styles.myButton}
            onPress={signInWithEmail}
            disabled={loading}
          >
            <Text style={styles.myButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.myButton} onPress={onBackPress}>
            <Text style={styles.myButtonText}>Volver</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsSignUp(true)}>
            <Text style={styles.linkText}>¿No tienes cuenta? Regístrate</Text>
          </TouchableOpacity>
          
        </>
      ) : (
        <>
          {/* REGISTER BUTTON */}
          <TouchableOpacity
            style={styles.myButton}
            onPress={signUpWithEmail}
            disabled={loading}
          >
            <Text style={styles.myButtonText}>Registrarse</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.myButton} onPress={onBackPress}>
            <Text style={styles.myButtonText}>Volver</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsSignUp(false)}>
            <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión</Text>
          </TouchableOpacity>
        </>
      )}
    
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFAE0',
    padding: 30,
    paddingTop: 100,
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    alignSelf: 'center',
    marginBottom: 20,
    color: '#333',
  },

  myButton: {
    backgroundColor: '#6A7441',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 10,
  },

  myButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },

  linkText: {
    color: '#6A7441',
    marginTop: 12,
    alignSelf: 'center',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
})
