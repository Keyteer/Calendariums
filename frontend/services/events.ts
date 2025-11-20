import { apiGet, apiPost } from "./api";

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
  // Si no se proporcionan fechas, usar hoy + 30 días
  const today = new Date();
  const future = new Date();
  future.setDate(future.getDate() + 30);

  const startDate = start || today.toISOString().split('T')[0];
  const endDate = end || future.toISOString().split('T')[0];

  return apiGet(`/events/user/${userId}?start=${startDate}&end=${endDate}`);
}

export function createEvent(eventData: CreateEventData) {
  return apiPost("/events", eventData);
}

export function updateEvent(id: string, data: any) {
  return apiPost(`/events/${id}`, data);
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
