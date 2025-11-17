import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { Session } from '@supabase/supabase-js'

export default function Groups({ session }: { session: Session }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grupos</Text>
      <Text style={styles.subtitle}>Próximamente: Gestiona tus grupos de estudio</Text>
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
  },
})
