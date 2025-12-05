import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getScheduleSuggestion, ScheduleSuggestion } from '../services/ollama';
import { useApp } from '../context/AppContext';
import { createEvent, getEventTypes, EventType } from '../services/events';

interface AiSuggestionModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function AiSuggestionModal({ visible, onClose }: AiSuggestionModalProps) {
    const { user, refreshEvents } = useApp();
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState('60');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
    const [eventTypes, setEventTypes] = useState<EventType[]>([]);

    React.useEffect(() => {
        loadEventTypes();
    }, []);

    async function loadEventTypes() {
        const types = await getEventTypes();
        setEventTypes(types);
    }

    const handleGetSuggestions = async () => {
        Keyboard.dismiss();
        if (!description.trim()) {
            Alert.alert('Error', 'Por favor describe la actividad');
            return;
        }

        if (!user) return;

        setLoading(true);
        setSuggestions([]);

        try {
            const result = await getScheduleSuggestion(user.id, description, parseInt(duration));
            console.log("Frontend received:", result);

            if (result.error) {
                Alert.alert('Error', 'No se pudieron obtener sugerencias: ' + result.error);
            } else {
                let finalSuggestions = result;
                // Handle wrapped response
                if (!Array.isArray(result)) {
                    if (result.schedule && Array.isArray(result.schedule)) {
                        finalSuggestions = result.schedule;
                    } else if (result.suggestions && Array.isArray(result.suggestions)) {
                        finalSuggestions = result.suggestions;
                    } else if (result.data && Array.isArray(result.data)) {
                        finalSuggestions = result.data;
                    } else if (result.suggested_timeslots && Array.isArray(result.suggested_timeslots)) {
                        finalSuggestions = result.suggested_timeslots;
                    }
                }

                if (Array.isArray(finalSuggestions)) {
                    setSuggestions(finalSuggestions);
                } else {
                    console.error("Unexpected format:", result);
                    Alert.alert('Error', 'Formato de respuesta inválido');
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Ocurrió un error al conectar con el asistente');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptSuggestion = async (suggestion: ScheduleSuggestion) => {
        if (!user) return;

        const defaultEventType = eventTypes.length > 0 ? eventTypes[0].name : 'General';

        try {
            // Create event
            const eventData = {
                title: description, // Use description as title for now
                description: `Sugerido por AI: ${suggestion.reason}`,
                start_datetime: suggestion.start_datetime,
                end_datetime: suggestion.end_datetime,
                creator_id: user.id,
                event_type_id: defaultEventType,
                location: 'TBD'
            };

            const result = await createEvent(eventData);
            if (result.error) {
                Alert.alert('Error', 'No se pudo crear el evento');
            } else {
                Alert.alert('Éxito', 'Evento creado correctamente');
                refreshEvents();
                onClose();
                // Reset state
                setDescription('');
                setSuggestions([]);
            }

        } catch (error) {
            Alert.alert('Error', 'Falló la creación del evento');
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.centeredView}
            >
                <View style={styles.modalView}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.header}>
                            <Text style={styles.modalTitle}>Sugerencias AI</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Feather name="x" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>¿Qué quieres hacer?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: Estudiar matemáticas, Reunión de equipo..."
                            value={description}
                            onChangeText={setDescription}
                            multiline
                        />

                        <Text style={styles.label}>Duración (minutos)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="60"
                            value={duration}
                            onChangeText={setDuration}
                            keyboardType="numeric"
                        />

                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleGetSuggestions}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.buttonText}>Obtener Sugerencias</Text>
                            )}
                        </TouchableOpacity>

                        {suggestions.length > 0 && (
                            <View style={styles.suggestionsContainer}>
                                <Text style={styles.subTitle}>Horarios Sugeridos:</Text>
                                {suggestions.map((item, index) => {
                                    const start = new Date(item.start_datetime);
                                    const end = new Date(item.end_datetime);
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.suggestionCard}
                                            onPress={() => handleAcceptSuggestion(item)}
                                        >
                                            <Text style={styles.suggestionTime}>
                                                {start.toLocaleDateString()} {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                            <Text style={styles.suggestionReason}>{item.reason}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#283618',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#606C38',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#DDA15E',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
        color: '#283618',
        backgroundColor: '#FEFAE0',
    },
    button: {
        backgroundColor: '#BC6C25',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    suggestionsContainer: {
        flex: 1,
        marginTop: 10,
    },
    subTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#283618',
    },
    suggestionsList: {
        maxHeight: 200,
    },
    suggestionCard: {
        backgroundColor: '#FEFAE0',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#606C38',
    },
    suggestionTime: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#283618',
    },
    suggestionReason: {
        fontSize: 14,
        color: '#606C38',
        fontStyle: 'italic',
    },
});
