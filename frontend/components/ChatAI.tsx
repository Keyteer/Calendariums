import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parseEventFromText } from '../services/ollama';
import { createEvent, getEventTypes } from '../services/events';
import { useApp } from '../context/AppContext';
import { DateTime } from 'luxon';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  type?: 'text' | 'event-proposal';
  eventData?: any;
}

export default function ChatAI() {
  const { user } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hola! Soy tu asistente de calendario. Dime qué quieres agendar (ej: "Reunión mañana a las 10am")', sender: 'ai' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [eventTypes, setEventTypes] = useState<any[]>([]);

  useEffect(() => {
    loadEventTypes();
  }, []);

  const loadEventTypes = async () => {
    const types = await getEventTypes();
    setEventTypes(types);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), text: inputText, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    if (!user) {
      Alert.alert("Error", "Debes iniciar sesión para usar el chat.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await parseEventFromText(user.id, userMsg.text);

      if (response.error) {
        setMessages(prev => [...prev, { id: Date.now().toString(), text: 'Lo siento, hubo un error al procesar tu mensaje.', sender: 'ai' }]);
      } else {
        const eventData = response;
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: `Entendido. ¿Quieres que agende este evento?`,
          sender: 'ai',
          type: 'event-proposal',
          eventData: eventData
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), text: 'Error de conexión.', sender: 'ai' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmEvent = async (eventData: any) => {
    if (!user) {
      Alert.alert("Error", "Debes iniciar sesión.");
      return;
    }
    setIsLoading(true);
    try {
      // Use AI-detected type or fallback to default
      const defaultType = eventTypes.length > 0 ? eventTypes[0].name : 'General';
      const typeToUse = eventData.event_type_id || defaultType;

      const newEvent = {
        title: eventData.title,
        description: eventData.description || "Creado desde Chat AI",
        start_datetime: eventData.start_datetime,
        end_datetime: eventData.end_datetime,
        location: eventData.location || "TBD",
        event_type_id: typeToUse,
        creator_id: user.id,
        recurrence_rules: eventData.recurrence_rules || undefined
      };

      const result = await createEvent(newEvent);

      if (result.error) {
        Alert.alert("Error", "No se pudo crear el evento: " + result.error);
      } else {
        Alert.alert("Éxito", "Evento creado correctamente");
        setMessages(prev => [...prev, { id: Date.now().toString(), text: '¡Listo! Evento agendado.', sender: 'ai' }]);
      }
    } catch (error) {
      Alert.alert("Error", "Ocurrió un error inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.aiMessage]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>{item.text}</Text>

        {item.type === 'event-proposal' && item.eventData && (
          <View style={styles.proposalCard}>
            <Text style={styles.proposalTitle}>{item.eventData.title}</Text>
            <Text style={styles.proposalDetail}>🏷️ {item.eventData.event_type_id || 'Evento'}</Text>
            <Text style={styles.proposalDetail}>📅 {DateTime.fromISO(item.eventData.start_datetime).setLocale('es').toFormat("cccc dd LLL")}</Text>
            <Text style={styles.proposalDetail}>⏰ {DateTime.fromISO(item.eventData.start_datetime).toFormat("HH:mm")} - {DateTime.fromISO(item.eventData.end_datetime).toFormat("HH:mm")}</Text>
            {item.eventData.location && <Text style={styles.proposalDetail}>📍 {item.eventData.location}</Text>}
            {item.eventData.recurrence_rules && item.eventData.recurrence_rules.length > 0 && (
              <Text style={styles.proposalDetail}>🔁 Evento recurrente</Text>
            )}

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => handleConfirmEvent(item.eventData)}
            >
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={1}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6A7441" />
          <Text style={styles.loadingText}>Pensando...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe aquí..."
          placeholderTextColor="#999"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFAE0',
  },
  listContent: {
    padding: 20,
    paddingTop: 75,
    paddingBottom: 10,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#6A7441',
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFF',
  },
  aiText: {
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#6A7441',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 20,
    marginBottom: 10,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  proposalCard: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  proposalTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
    color: '#333',
  },
  proposalDetail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  confirmButton: {
    marginTop: 10,
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
