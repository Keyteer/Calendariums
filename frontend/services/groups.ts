import { apiGet, apiPost, apiPatch, apiDelete } from './api'

// ============================================
// CRUD Grupos
// ============================================

export interface CreateGroupData {
  name: string
  description?: string
  creator_id: string
}

export interface UpdateGroupData {
  name?: string
  description?: string
}

export async function createGroup(data: CreateGroupData) {
  return apiPost('/groups', data)
}

export async function getUserGroups(userId: string) {
  return apiGet(`/groups/user/${userId}`)
}

export async function updateGroup(groupId: string, data: UpdateGroupData) {
  return apiPatch(`/groups/${groupId}`, data)
}

export async function deleteGroup(groupId: string) {
  return apiDelete(`/groups/${groupId}`)
}

// ============================================
// Miembros del Grupo
// ============================================

export interface AddMemberData {
  groupId: string
  userId: string
  role?: 'admin' | 'moderator' | 'member'
}

export interface RemoveMemberData {
  groupId: string
  userId: string
}

export interface UpdateRoleData {
  groupId: string
  userId: string
  newRole: 'admin' | 'moderator' | 'member'
}

export async function addMemberToGroup(data: AddMemberData) {
  return apiPost('/groups/members', data)
}

export async function removeMemberFromGroup(data: RemoveMemberData) {
  return apiDelete('/groups/members', data)
}

export async function updateMemberRole(data: UpdateRoleData) {
  return apiPatch('/groups/members', data)
}

export async function getGroupMembers(groupId: string) {
  return apiGet(`/groups/members/${groupId}`)
}

// ============================================
// Eventos de Grupo
// ============================================

export interface CreateGroupEventData {
  title: string
  description?: string
  event_type_id: string
  creator_id: string
  start_datetime: string
  end_datetime: string
  location?: string
  recurrence_rule?: {
    rrule: string
    timezone: string
  }
}

export async function createGroupEvent(groupId: string, eventData: CreateGroupEventData) {
  return apiPost(`/groups/${groupId}/events`, eventData)
}

export async function getGroupActivities(groupId: string, start: string, end: string) {
  return apiGet(`/groups/${groupId}/events?start=${start}&end=${end}`)
}

// ============================================
// Sistema de Invitaciones
// ============================================

export async function generateGroupInvite(groupId: string, userId: string) {
  return apiPost(`/groups/${groupId}/invite`, { userId })
}

export async function getGroupByInviteCode(code: string) {
  return apiGet(`/groups/invite/${code}`)
}

export async function joinGroupByInviteCode(code: string, userId: string) {
  return apiPost(`/groups/join/${code}`, { userId })
}
