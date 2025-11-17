import { apiGet, apiPost } from "./api";

export function getEvents(userId: string, start?: string, end?: string) {
  // Si no se proporcionan fechas, usar hoy + 30 días
  const today = new Date();
  const future = new Date();
  future.setDate(future.getDate() + 30);

  const startDate = start || today.toISOString().split('T')[0];
  const endDate = end || future.toISOString().split('T')[0];

  return apiGet(`/events/user/${userId}?start=${startDate}&end=${endDate}`);
}

export function createEvent(eventData: any) {
  return apiPost("/events", eventData);
}

export function updateEvent(id: string, data: any) {
  return apiPost(`/events/${id}`, data);
}
