import { supabase } from "../config/supabaseClient.js";
import { Expo } from "expo-server-sdk";

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send a push notification to a specific user
 * @param {string} userId - The user's ID
 * @param {object} notification - { title, body, data, categoryId }
 */
export async function sendPushNotification(userId, notification) {
  try {
    // Get the user's push token from the database
    const { data: user, error } = await supabase
      .from("users")
      .select("expo_push_token")
      .eq("id", userId)
      .single();

    if (error || !user?.expo_push_token) {
      console.log(`No push token found for user ${userId}`);
      return { success: false, error: "No push token" };
    }

    const pushToken = user.expo_push_token;

    // Validate the push token
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Invalid Expo push token: ${pushToken}`);
      return { success: false, error: "Invalid push token" };
    }

    // Create the message
    const message = {
      to: pushToken,
      sound: "default",
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      categoryId: notification.categoryId || undefined, // For actionable notifications
    };

    // Send the notification
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    console.log(`Push notification sent to user ${userId}:`, tickets);
    return { success: true, tickets };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: error.message };
  }
}

export async function sendPushNotificationToMany(userIds, notification) {
  try {
    // Get all push tokens for the users
    const { data: users, error } = await supabase
      .from("users")
      .select("id, expo_push_token")
      .in("id", userIds)
      .not("expo_push_token", "is", null);

    if (error) {
      console.error("Error fetching push tokens:", error);
      return { success: false, error: error.message };
    }

    if (!users || users.length === 0) {
      console.log("No users with push tokens found");
      return { success: false, error: "No push tokens" };
    }

    // Create messages for all valid tokens
    const messages = users
      .filter((user) => Expo.isExpoPushToken(user.expo_push_token))
      .map((user) => ({
        to: user.expo_push_token,
        sound: "default",
        title: notification.title,
        body: notification.body,
        data: { ...notification.data, userId: user.id },
      }));

    if (messages.length === 0) {
      return { success: false, error: "No valid push tokens" };
    }

    // Send in chunks (Expo recommends max 100 per request)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    console.log(`Push notifications sent to ${messages.length} users`);
    return { success: true, tickets, count: messages.length };
  } catch (error) {
    console.error("Error sending push notifications:", error);
    return { success: false, error: error.message };
  }
}


/**
 * Check for upcoming events and send reminder notifications
 * This should be called by a cron job
 * @param {number} minutesBefore - How many minutes before the event to send notification
 */
export async function sendEventReminders(minutesBefore = 15) {
  try {
    const now = new Date();
    const targetTime = new Date(now.getTime() + minutesBefore * 60 * 1000);
    
    // Window: events starting in the next minute around targetTime
    const windowStart = new Date(targetTime.getTime() - 30 * 1000); // 30 seconds before
    const windowEnd = new Date(targetTime.getTime() + 30 * 1000); // 30 seconds after

    // console.log(`Checking for events starting between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);

    // Get events starting in the target window that haven't been notified yet
    const { data: events, error } = await supabase
      .from("events")
      .select(`
        id,
        title,
        description,
        start_datetime,
        location,
        creator_id,
        event_participants (
          user_id,
          status
        )
      `)
      .gte("start_datetime", windowStart.toISOString())
      .lte("start_datetime", windowEnd.toISOString());

    if (error) {
      console.error("Error fetching upcoming events:", error);
      return;
    }

    if (!events || events.length === 0) {
      // console.log("No upcoming events to notify about");
      return;
    }

    console.log(`Found ${events.length} events to send reminders for`);

    // Process each event
    for (const event of events) {
      // Check if we already sent a notification for this event
      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("event_id", event.id)
        .eq("title", `Reminder: ${event.title}`)
        .single();

      if (existingNotification) {
        console.log(`Notification already sent for event ${event.id}`);
        continue;
      }

      // Get all users to notify (creator + accepted participants)
      const usersToNotify = [event.creator_id];
      
      if (event.event_participants) {
        const acceptedParticipants = event.event_participants
          .filter((p) => p.status === "accepted")
          .map((p) => p.user_id);
        usersToNotify.push(...acceptedParticipants);
      }

      // Remove duplicates
      const uniqueUsers = [...new Set(usersToNotify)];

      const notification = {
        title: `Reminder: ${event.title}`,
        body: `${event.location ? `At ${event.location}\n` : ""}${event.description ? `${event.description}\n` : ""}`,
        data: { eventId: event.id, type: "event_reminder" },
      };

      // Send push notifications
      await sendPushNotificationToMany(uniqueUsers, notification);

      // Record the notification in the database for each user
      const notificationRecords = uniqueUsers.map((userId) => ({
        user_id: userId,
        event_id: event.id,
        title: notification.title,
        message: notification.body,
        read: false,
      }));

      await supabase.from("notifications").insert(notificationRecords);

      console.log(`Sent reminders for event "${event.title}" to ${uniqueUsers.length} users`);
    }
  } catch (error) {
    console.error("Error in sendEventReminders:", error);
  }
}

/**
 * Send a notification when a user is invited to an event
 */
export async function sendEventInviteNotification(eventId, invitedUserId) {
  try {
    // Get event details
    const { data: event, error } = await supabase
      .from("events")
      .select("id, title, start_datetime, creator_id, users!events_creator_id_fkey(full_name)")
      .eq("id", eventId)
      .single();

    if (error || !event) {
      console.error("Error fetching event for invite notification:", error);
      return;
    }

    const startTime = new Date(event.start_datetime);
    const dateString = startTime.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const notification = {
      title: "New Event Invitation",
      body: `${event.users?.full_name || "Someone"} invited you to "${event.title}" on ${dateString}`,
      data: { eventId: event.id, type: "event_invite" },
      categoryId: "event_invite", // This enables the Accept/Decline buttons
    };

    await sendPushNotification(invitedUserId, notification);

    // Record in database
    await supabase.from("notifications").insert({
      user_id: invitedUserId,
      event_id: eventId,
      title: notification.title,
      message: notification.body,
      read: false,
    });
  } catch (error) {
    console.error("Error sending event invite notification:", error);
  }
}

/**
 * Send a notification when someone responds to an event invite
 */
export async function sendEventResponseNotification(eventId, responderId, response) {
  try {
    // Get event and responder details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, creator_id")
      .eq("id", eventId)
      .single();

    const { data: responder, error: responderError } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", responderId)
      .single();

    if (eventError || responderError || !event) {
      console.error("Error fetching data for response notification");
      return;
    }

    const responseText = response === "accepted" ? "accepted" : 
               response === "declined" ? "declined" : "responded to";

    const notification = {
      title: `Event Response: ${event.title}`,
      body: `${responder?.full_name || "Someone"} ${responseText} your event`,
      data: { eventId: event.id, type: "event_response" },
    };

    await sendPushNotification(event.creator_id, notification);

    // Record in database
    await supabase.from("notifications").insert({
      user_id: event.creator_id,
      event_id: eventId,
      title: notification.title,
      message: notification.body,
      read: false,
    });
  } catch (error) {
    console.error("Error sending event response notification:", error);
  }
}