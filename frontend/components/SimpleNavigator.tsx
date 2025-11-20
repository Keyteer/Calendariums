import React, { useState } from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'

// Importar las pantallas
import MainPage from './MainPage'
import Groups from './Groups'
import ChatAI from './ChatAI'
import Account from './Account'

type Screen = 'home' | 'groups' | 'chat' | 'profile'

export default function SimpleNavigator() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <MainPage />
      case 'groups':
        return <Groups />
      case 'chat':
        return <ChatAI />
      case 'profile':
        return <Account />
      default:
        return <MainPage />
    }
  }

  return (
    <View style={styles.container}>
      {/* Contenido de la pantalla */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setCurrentScreen('home')}
        >
          <Feather
            name="home"
            size={24}
            color={currentScreen === 'home' ? '#6A7441' : '#999'}
          />
          <Text style={[
            styles.tabLabel,
            currentScreen === 'home' && styles.tabLabelActive
          ]}>
            Inicio
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setCurrentScreen('groups')}
        >
          <Feather
            name="users"
            size={24}
            color={currentScreen === 'groups' ? '#6A7441' : '#999'}
          />
          <Text style={[
            styles.tabLabel,
            currentScreen === 'groups' && styles.tabLabelActive
          ]}>
            Grupos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setCurrentScreen('chat')}
        >
          <Feather
            name="message-circle"
            size={24}
            color={currentScreen === 'chat' ? '#6A7441' : '#999'}
          />
          <Text style={[
            styles.tabLabel,
            currentScreen === 'chat' && styles.tabLabelActive
          ]}>
            Chat AI
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setCurrentScreen('profile')}
        >
          <Feather
            name="user"
            size={24}
            color={currentScreen === 'profile' ? '#6A7441' : '#999'}
          />
          <Text style={[
            styles.tabLabel,
            currentScreen === 'profile' && styles.tabLabelActive
          ]}>
            Perfil
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFAE0',
  },
  content: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#FEFAE0',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingBottom: 5,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    color: '#999',
  },
  tabLabelActive: {
    color: '#6A7441',
    fontWeight: 'bold',
  },
})
