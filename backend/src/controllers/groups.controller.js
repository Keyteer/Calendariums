import * as groupsService from "../services/groups.service.js";

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
