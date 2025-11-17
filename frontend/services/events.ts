import { apiGet, apiPost } from "./api";

export function getEvents(userId?: string) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  return apiGet(`/events${query}`);
}

export function createEvent(eventData: any) {
  return apiPost("/events", eventData);
}

export function updateEvent(id: string, data: any) {
  return apiPost(`/events/${id}`, data);
}
