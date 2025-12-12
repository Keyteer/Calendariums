import { supabase } from "../config/supabaseClient.js";


///////// CRUD groups tables

/**
 * Crea un nuevo grupo
 */
export async function createGroup(groupData) {
  const { name, description, creator_id } = groupData;

  // Insertar el grupo
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({
      name,
      description,
      creator_id: creator_id
    })
    .select()
    .single();

  if (groupError) {
    return { data: null, error: groupError };
  }

  // Agregar al creador como miembro del grupo
  const { data: groupMember, error: memberError } = await addMemberToGroup(group.id, creator_id, "admin");

  if (memberError) {
    console.error("Error adding creator as group member:", memberError);
  }

  return { data: group, error: null };
}

/**
 * Obtiene todos los grupos a los que pertenece un usuario
 */
export async function getGroupsByUserID(userId) {
  return await supabase
    .from("group_members")
    .select(`
      groups (
        id,
        name,
        description,
        creator_id,
        created_at,
        updated_at,
        group_members ( user_id, role, joined_at )
      )
    `)
    .eq("user_id", userId);
}

/**
 * Actuliza nombre o descripción de un grupo
 */
export async function updateGroup(groupId, updateData) {
  const { data, error } = await supabase
    .from("groups")
    .update(updateData)
    .eq("id", groupId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Elimina un grupo por ID
 */
export async function deleteGroup(groupId) {
  const { data, error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

///////// CRUD group_members

/**
 * Agrega un miembro a un grupo 
 */
export async function addMemberToGroup(groupId, userId, role = "member") {
  const { data, error } = await supabase
    .from("group_members")
    .insert({
      group_id: groupId,
      user_id: userId,
      role: role
    });
  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Obtiene los miembros de un grupo
 */
export async function getGroupMembers(groupId) {
  return await supabase
    .from("group_members")
    .select()
    .eq("group_id", groupId);
}

/**
 * Actualiza el rol de un miembro en un grupo
 */
export async function updateMemberRole(groupId, userId, newRole) {
  const { data, error } = await supabase
    .from("group_members")
    .update({ role: newRole })
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .select()
    .single();
}

/**
 * Elimina un miembro de un grupo
 */
export async function removeMemberFromGroup(groupId, userId) {
  const { data, error} = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

///////// Group Invitations

/**
 * Genera un código de invitación único para un grupo
 */
export async function generateInviteCode(groupId, userId) {
  // Generar código aleatorio único (8 caracteres alfanuméricos)
  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  // Opcionalmente, establecer expiración (7 días desde ahora)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from("group_invites")
    .insert({
      group_id: groupId,
      invite_code: inviteCode,
      created_by: userId,
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Obtiene información de un grupo por código de invitación
 */
export async function getGroupByInviteCode(code) {
  const { data: invite, error: inviteError } = await supabase
    .from("group_invites")
    .select(`
      *,
      groups (
        id,
        name,
        description,
        creator_id,
        created_at,
        group_members ( user_id, role )
      )
    `)
    .eq("invite_code", code)
    .single();

  if (inviteError) {
    return { data: null, error: inviteError };
  }

  // Verificar si el código ha expirado
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { data: null, error: { message: "Invitation code has expired" } };
  }

  return { data: invite, error: null };
}

/**
 * Agrega un usuario a un grupo usando un código de invitación
 */
export async function joinGroupByCode(code, userId) {
  // Primero verificar que el código existe y es válido
  const { data: invite, error: inviteError } = await getGroupByInviteCode(code);

  if (inviteError) {
    return { data: null, error: inviteError };
  }

  // Verificar si el usuario ya es miembro
  const { data: existingMember } = await supabase
    .from("group_members")
    .select()
    .eq("group_id", invite.group_id)
    .eq("user_id", userId)
    .single();

  if (existingMember) {
    return { data: null, error: { message: "User is already a member of this group" } };
  }

  // Agregar usuario como miembro del grupo
  const { data, error } = await addMemberToGroup(invite.group_id, userId, "member");

  if (error) {
    return { data: null, error };
  }

  // Retornar información del grupo
  return { data: invite.groups, error: null };
}

/**
 * Obtiene todos los grupos de un usuario con conteo de invitaciones pendientes
 */
export async function getUserGroupsWithCounts(userId) {
  // Obtener grupos del usuario
  const { data: groupsData, error: groupsError } = await getGroupsByUserID(userId);

  if (groupsError) {
    return { data: null, error: groupsError };
  }

  // Para cada grupo, contar invitaciones pendientes
  const groupsWithCounts = await Promise.all(
    groupsData.map(async (item) => {
      const group = item.groups;

      // Encontrar el rol del usuario en este grupo
      const userMembership = group.group_members.find(m => m.user_id === userId);

      // Contar invitaciones pendientes de eventos de grupo para este usuario
      const { count, error: countError } = await supabase
        .from("event_participants")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "pending")
        .in("event_id",
          supabase
            .from("events")
            .select("id")
            .eq("group_id", group.id)
        );

      return {
        ...group,
        user_role: userMembership?.role,
        member_count: group.group_members.length,
        pending_invitations_count: countError ? 0 : (count || 0)
      };
    })
  );

  return { data: groupsWithCounts, error: null };
}