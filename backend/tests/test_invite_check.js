import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInviteFlow() {
    console.log("--- Starting Invite Flow Test ---");

    // 1. Create a dummy group
    console.log("Creating test group...");
    const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
            name: "Test Group Invite " + Date.now(),
            description: "Temporary group for testing invites",
            creator_id: "b31e57c1-bba4-4792-9923-115c0d794cde" // Using the user ID fro previou logs
        })
        .select()
        .single();

    if (groupError) {
        console.error("Failed to create group:", groupError);
        return;
    }
    console.log("Group created:", group.id, group.name);

    // 2. Generate Invite Code
    console.log("Generating invite code...");
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invite, error: inviteError } = await supabase
        .from("group_invites")
        .insert({
            group_id: group.id,
            invite_code: inviteCode,
            created_by: "b31e57c1-bba4-4792-9923-115c0d794cde",
            expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

    if (inviteError) {
        console.error("Failed to generate invite:", inviteError);
        return;
    }
    console.log("Invite generated:", invite.invite_code);

    // 3. Fetch by Code
    console.log("Fetching group by invite code...");
    const { data: fetchInvite, error: fetchError } = await supabase
        .from("group_invites")
        .select(`*, groups (*)`)
        .eq("invite_code", inviteCode)
        .single();

    if (fetchError) {
        console.error("Failed to fetch invite:", fetchError);
        return;
    }
    console.log("Invite fetched successfully. Group Name:", fetchInvite.groups.name);

    // 4. Clean up
    console.log("Cleaning up...");
    await supabase.from('groups').delete().eq('id', group.id);
    console.log("Test finished successfully.");
}

testInviteFlow();
