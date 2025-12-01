import * as groupsService from "../services/groups.service.js";
import { createEvent, addParticipantToEvent } from "../services/events.service.js";

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
  const { groupId, userId } = req.body;

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

  // Crear evento
  const { data: event, error: eventError } = await createEvent({
    title,
    description,
    event_type_id,
    creator_id,
    start_datetime,
    end_datetime,
    location,
    recurrence_rule
  });

  if (eventError) {
    return res.status(500).json({ error: eventError.message });
  }

  // Obtener miembros del grupo
  const { data: membersData, error: membersError } = await groupsService.getGroupMembers(groupId);

  if (membersError) {
    return res.status(500).json({ error: membersError.message });
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