import * as groupsService from "../services/groups.service.js";
import { createEvent, addParticipantToEvent, getEventsByUserId } from "../services/events.service.js";
import { buildUserCalendar } from "../utils/events.js";

export async function createNewGroup(req, res) {
  const { name, description, creator_id } = req.body;

  // Validaciones
  if (!name || !creator_id) {
    return res.status(400).json({
      error: "Missing required fields: name, creator_id"
    });
  }

  const { data, error } = await groupsService.createGroup({
    name,
    description,
    creator_id
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({
    message: "Group created successfully",
    group: data
  });
}

export async function getUserGroups(req, res) {
  const userId = req.params.userId;

  if (!userId) {
    return res.status(400).json({
      error: "User ID is required"
    });
  }

  const { data, error } = await groupsService.getGroupsByUserID(userId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    groups: data
  });
}

export async function updateGroupInfo(req, res) {
  const groupId = req.params.groupId;
  const updateData = req.body;

  const { data, error } = await groupsService.updateGroup(groupId, updateData);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    message: "Group updated successfully",
    group: data
  });
}

export async function addUserToGroup(req, res) {
  const { groupId, userId, role } = req.body;

  // Validaciones
  if (!groupId || !userId) {
    return res.status(400).json({
      error: "Missing required fields: groupId, userId"
    });
  }

  const { data, error } = await groupsService.addMemberToGroup(groupId, userId, role);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({
    message: "User added to group successfully"
  });
}

export async function removeUserFromGroup(req, res) {
  const { groupId, userId } = req.params;

  // Validaciones
  if (!groupId || !userId) {
    return res.status(400).json({
      error: "Missing required fields: groupId, userId"
    });
  }

  const { data, error } = await groupsService.removeMemberFromGroup(groupId, userId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    message: "User removed from group successfully",
    member: data
  });
}

export async function updateGroupMemberRole(req, res) {
  const { groupId, userId, newRole } = req.body;

  // Validaciones
  if (!groupId || !userId || !newRole) {
    return res.status(400).json({
      error: "Missing required fields: groupId, userId, newRole"
    });
  }

  const { data, error } = await groupsService.updateMemberRole(groupId, userId, newRole);
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    message: "Member role updated successfully",
    member: data
  });
}

export async function deleteGroup(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      error: "Group ID is required"
    });
  }

  const { data, error } = await groupsService.deleteGroup(id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    message: "Group deleted successfully",
    group: data
  });
}

export async function createGroupEvent(req, res) {
  const groupId = req.params.groupId;

  if (!groupId) {
    return res.status(400).json({
      error: "Group ID is required"
    });
  }

  const {
    title,
    description,
    event_type_id,
    creator_id,
    start_datetime,
    end_datetime,
    location,
    recurrence_rule
  } = req.body;

  // Validaciones (Misma que en events.controller.js, se podrían implementar validaciones comunes en un archivo utils/validators.js)
  if (!title || !event_type_id || !creator_id || !start_datetime || !end_datetime) {
    return res.status(400).json({
      error: "Missing required fields: title, event_type_id, creator_id, start_datetime, end_datetime"
    });
  }

  if (new Date(end_datetime) <= new Date(start_datetime)) {
    return res.status(400).json({
      error: "end_datetime must be after start_datetime"
    });
  }

  // Obtener miembros del grupo
  const { data: membersData, error: membersError } = await groupsService.getGroupMembers(groupId);

  if (membersError) {
    return res.status(500).json({ error: membersError.message });
  }

  // Crear evento
  const { data: event, error: eventError } = await createEvent({
    title,
    description,
    event_type_id,
    creator_id,
    start_datetime,
    end_datetime,
    location,
    recurrence_rule,
    group_id: groupId
  });

  if (eventError) {
    return res.status(500).json({ error: eventError.message });
  }

  // Agregar miembros del grupo como participantes del evento
  for (const member of membersData) {
    if (member.user_id === creator_id) continue; // evitar duplicar creador

    const { error: participantError } = await addParticipantToEvent(event.id, member.user_id, "pending");
    if (participantError && participantError.code !== "duplicate") {
      console.error(`Error adding member ${member.user_id} as participant:`, participantError);
    }
  }

  return res.status(201).json({
    message: "Group event created successfully",
    event
  });
}

export async function getGroupActivities(req, res) {
  const { groupId } = req.params;
  const { start, end } = req.query;

  if (!groupId) {
    return res.status(400).json({ error: "Group ID is required" });
  }

  if (!start || !end) {
    return res.status(400).json({
      error: "Missing ?start=YYYY-MM-DD&end=YYYY-MM-DD"
    });
  }

  // Obtener miembros del grupo
  const { data: membersData, error: membersError } = await groupsService.getGroupMembers(groupId);
  if (membersError) {
    return res.status(500).json({ error: membersError.message });
  }

  // Agregar eventos de cada miembro (solo status accepted)
  const activitiesByMember = [];

  for (const member of membersData) {
    const { data, error } = await getEventsByUserId(member.user_id);
    if (error) {
      console.error(`Error fetching events for user ${member.user_id}:`, error);
      continue;
    }

    const accepted = (data || []).filter(evnt => evnt.status === "accepted");

    const calendar = buildUserCalendar(accepted, start, end);
    const { all } = calendar;

    // Excluir título, descripción, etc.
    const sanitized = all.map(ev => ({
      event_id: ev.event_id ?? ev.id,
      start_datetime: ev.start_datetime,
      end_datetime: ev.end_datetime,
      created_by_ai: ev.created_by_ai,
      is_recurring_instance: ev.is_recurring_instance
    }));

    activitiesByMember.push({
      user_id: member.user_id,
      role: member.role,
      activities: sanitized
    });
  }

  return res.json({
    range: { start, end },
    members: activitiesByMember
  });
}

/**
 * Obtiene los miembros de un curso
 * GET /groups/members/:groupId
 */
export async function getGroupMembers(req, res) {
  const { groupId } = req.params;

  if (!groupId) {
    return res.status(400).json({
      error: "Group ID is required"
    });
  }

  const { data, error } = await groupsService.getGroupMembers(groupId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    members: data
  });
}

/**
 * Genera un código de invitación para un grupo
 * POST /groups/:groupId/invite
 */
export async function generateGroupInvite(req, res) {
  const { groupId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      error: "User ID is required"
    });
  }

  const { data, error } = await groupsService.generateInviteCode(groupId, userId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({
    message: "Invite code generated successfully",
    invite: data
  });
}

/**
 * Obtiene información de un grupo por código de invitación
 * GET /groups/invite/:code
 */
export async function getGroupByInviteCode(req, res) {
  const { code } = req.params;

  const { data, error } = await groupsService.getGroupByInviteCode(code);

  if (error) {
    return res.status(404).json({ error: error.message });
  }

  return res.json({
    invite: data
  });
}

/**
 * Une un usuario a un grupo usando un código de invitación
 * POST /groups/join/:code
 */
export async function joinGroupByInviteCode(req, res) {
  const { code } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      error: "User ID is required"
    });
  }

  const { data, error } = await groupsService.joinGroupByCode(code, userId);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({
    message: "Successfully joined group",
    group: data
  });
}