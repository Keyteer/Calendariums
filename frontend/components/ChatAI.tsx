import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { Session } from '@supabase/supabase-js'

export default function ChatAI({ session }: { session: Session }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat AI</Text>
      <Text style={styles.subtitle}>Próximamente: Agenda eventos con lenguaje natural</Text>
      <Text style={styles.hint}>Ejemplo: "Agregar reunión mañana a las 3pm"</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEFAE0',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#6A7441',
    textAlign: 'center',
    marginBottom: 20,
  },
  hint: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
})
