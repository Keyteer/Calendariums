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
  const { data, error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .select()
    .single();
}