
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// Load environment variables FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Now import modules that use env vars
const { createGroup, getGroupMembers, addMemberToGroup } = await import('../src/services/groups.service.js');
const { supabase } = await import('../src/config/supabaseClient.js');

async function testMembersJoin() {
    console.log("--- Starting Members Join Test ---");

    // 1. Create a dummy user in 'users' table if possible, or use a random ID
    // We assume 'users' table exists based on AppContext.tsx.
    // We need valid UUIDs.
    const creatorId = 'b31e57c1-bba4-4792-9923-115c0d794cde'; // Use a known ID if possible, or generated.
    // Actually, we should check if this user exists in 'users' table first or create one.

    // Let's try to fetch any user first
    const { data: users, error: userError } = await supabase.from('users').select('*').limit(1);
    if (userError) {
        console.error("Error accessing 'users' table:", userError);
        return;
    }

    if (!users || users.length === 0) {
        console.log("No users found in public.users. Creating one...");
        // Try to insert one (might fail if foreign key to auth.users is enforced)
        // For service role, it might work if we just need a record.
    } else {
        console.log("Found users:", users.length);
    }

    const userId = users[0]?.id || creatorId;

    // 2. Create Group
    console.log("Creating test group...");
    const { data: group, error: groupError } = await createGroup({
        name: "Test Group Members " + Date.now(),
        description: "Testing members join",
        creator_id: userId
    });

    if (groupError) {
        console.error("Group creation failed:", groupError);
        return;
    }
    console.log("Group created:", group.id);

    // 3. Fetch Members
    console.log("Fetching members...");
    const { data: members, error: membersError } = await getGroupMembers(group.id);

    if (membersError) {
        console.error("Fetch members FAILED:", membersError);
    } else {
        console.log("Members fetched successfully:");
        console.log(JSON.stringify(members, null, 2));

        if (members.length > 0 && members[0].user) {
            console.log("SUCCESS: User data joined correctly.");
        } else {
            console.error("FAILURE: User data missing in join.");
        }
    }

    // Cleanup
    console.log("Cleaning up...");
    // await supabase.from('groups').delete().eq('id', group.id); // Optional
}

testMembersJoin();
