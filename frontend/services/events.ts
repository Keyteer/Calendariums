import { apiGet, apiPost, apiPatch } from "./api";

export interface CreateEventData {
  title: string;
  description?: string;
  event_type_id: string;
  creator_id: string;
  start_datetime: string;
  end_datetime: string;
  location?: string;
  recurrence_rule?: {
    rrule: string;
    timezone?: string;
  };
}

export interface EventType {
  name: string;
  color: string;
  icon: string;
}

export function getEvents(userId: string, start?: string, end?: string) {
  // Si no se proporcionan fechas, usar hoy + 1 año
  const today = new Date();
  const future = new Date();
  future.setFullYear(future.getFullYear() + 1);

  const startDate = start || today.toISOString().split('T')[0];
  const endDate = end || future.toISOString().split('T')[0];

  return apiGet(`/events/user/${userId}?start=${startDate}&end=${endDate}`);
}

export function createEvent(eventData: CreateEventData) {
  return apiPost("/events", eventData);
}

// TODO: Implementar cuando el backend tenga PATCH /events/:id
export function updateEvent(id: string, data: any) {
  return apiPatch(`/events/${id}`, data);
}

export async function getEventTypes(): Promise<EventType[]> {
  try {
    const response = await apiGet('/event-types');

    if (response.error) {
      console.error('Error fetching event types:', response.error);
      return [];
    }

    return response.event_types || [];
  } catch (err) {
    console.error('Error fetching event types:', err);
    return [];
  }
}

export async function deleteEvent(eventId: string) {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6969'}/events/${eventId}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error deleting event ${eventId}:`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// Participantes de Eventos
// ============================================

export async function updateParticipantStatus(participantId: string, status: 'accepted' | 'declined' | 'maybe') {
  return apiPatch(`/events/participants/${participantId}`, { status })
}

export async function getPendingInvitations(userId: string) {
  return apiGet(`/events/pending/${userId}`)
}

export async function checkEventConflicts(userId: string, start: string, end: string) {
  // Obtener eventos del usuario en ese rango de fechas
  const response = await getEvents(userId, start, end)

  if (response.error || !response.events) {
    return []
  }

  // Filtrar solo eventos aceptados
  const acceptedEvents = response.events.filter((event: any) => {
    // Si no tiene participantes, es un evento creado por el usuario (auto-aceptado)
    if (!event.event_participants || event.event_participants.length === 0) {
      return true
    }
    // Si tiene participantes, verificar que el usuario lo haya aceptado
    return event.event_participants.some((p: any) =>
      p.user_id === userId && p.status === 'accepted'
    )
  })

  // Detectar conflictos
  const proposedStart = new Date(start)
  const proposedEnd = new Date(end)

  return acceptedEvents.filter((event: any) => {
    const eventStart = new Date(event.start_datetime)
    const eventEnd = new Date(event.end_datetime)

    // Verificar overlap: (StartA < EndB) AND (EndA > StartB)
    return proposedStart < eventEnd && proposedEnd > eventStart
  })
}
