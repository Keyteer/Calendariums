
import { createNewGroup, addUserToGroup, createGroupEvent, generateGroupInvite, joinGroupByInviteCode, getUserGroups } from "../src/controllers/groups.controller.js";
import { parseEventWithToolCalling } from "../src/services/ollama.service.js";

// Mock Express Request/Response
const mockReq = (body, params = {}, query = {}) => ({ body, params, query });
const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; return res; };
    return res;
};

async function testGroupsFlow() {
    console.log("--- Starting Groups Integration Test ---");
    const creatorId = "45e2d13e-b0a6-4bf3-80ff-09195ae3aed0"; // Existing user
    const memberId = "test-user-2-uuid"; // We might need a real second user, but for now we'll see if FK constraint fails. 
    // If FK fails, we need to insert a temporary user or assume one exists. 
    // For now, let's try with creatorId as member of another group or just creating a group.

    // 1. Create Group
    console.log("\n1. Creating Group...");
    const reqCreate = mockReq({ name: "Grupo de Estudio AI", description: "Testing Groups", creator_id: creatorId });
    const resCreate = mockRes();
    await createNewGroup(reqCreate, resCreate);
    console.log("Create Status:", resCreate.statusCode);
    console.log("Create Data:", resCreate.data);

    if (!resCreate.data || !resCreate.data.group) {
        console.error("Failed to create group. Aborting.");
        return;
    }
    const groupId = resCreate.data.group.id;

    // 2. Generate Invite
    console.log(`\n2. Generating Invite for Group ${groupId}...`);
    const reqInvite = mockReq({ userId: creatorId }, { groupId });
    const resInvite = mockRes();
    await generateGroupInvite(reqInvite, resInvite);
    console.log("Invite Data:", resInvite.data);
    const inviteCode = resInvite.data?.invite?.invite_code;

    // 3. Join Group (Simulate another user if possible, or same user fail)
    if (inviteCode) {
        console.log(`\n3. Joining Group with code ${inviteCode}...`);
        const reqJoin = mockReq({ userId: creatorId }, { code: inviteCode }); // Should fail as already member
        const resJoin = mockRes();
        await joinGroupByInviteCode(reqJoin, resJoin);
        console.log("Join Result (expect already member error):", resJoin.data || resJoin.error);
    }

    // 4. Create Group Event
    console.log("\n4. Creating Group Event...");
    const reqEvent = mockReq({
        title: "Reunión Grupal",
        description: "Discussing AI",
        event_type_id: "Reunión",
        creator_id: creatorId,
        start_datetime: "2025-12-20T10:00:00-03:00",
        end_datetime: "2025-12-20T11:00:00-03:00"
    }, { groupId });
    const resEvent = mockRes();
    await createGroupEvent(reqEvent, resEvent);
    console.log("Group Event Result:", resEvent.data || resEvent.error);

}

testGroupsFlow();
