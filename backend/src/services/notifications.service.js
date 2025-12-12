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
 * Check for pending reminders and send push notifications
 * This should be called by a cron job every minute
 */
export async function sendEventReminders() {
  try {
    const now = new Date();

    // Get all unsent reminders where the reminder time has passed
    const { data: reminders, error } = await supabase
      .from("reminders")
      .select(`
        id,
        user_id,
        event_id,
        time_anticipation,
        events (
          id,
          title,
          description,
          start_datetime,
          location
        )
      `)
      .eq("sent", false);

    if (error) {
      console.error("Error fetching reminders:", error);
      return;
    }

    if (!reminders || reminders.length === 0) {
      return;
    }

    // Filter reminders that should be sent now
    const remindersToSend = reminders.filter((reminder) => {
      if (!reminder.events) return false;

      const eventStart = new Date(reminder.events.start_datetime);
      const reminderTime = new Date(eventStart.getTime() - reminder.time_anticipation * 60 * 1000);

      // Send if current time is past the reminder time
      return now >= reminderTime;
    });

    if (remindersToSend.length === 0) {
      return;
    }

    console.log(`Found ${remindersToSend.length} reminders to send`);

    // Process each reminder
    for (const reminder of remindersToSend) {
      const event = reminder.events;

      const notification = {
        title: `Reminder: ${event.title}`,
        body: `${event.location ? `At ${event.location}\n` : ""}${event.description ? `${event.description}\n` : ""}Starting in ${reminder.time_anticipation} minutes`,
        data: { eventId: event.id, type: "event_reminder" },
      };

      // Send push notification
      await sendPushNotification(reminder.user_id, notification);

      // Mark reminder as sent
      await supabase
        .from("reminders")
        .update({ sent: true })
        .eq("id", reminder.id);

      console.log(`Sent reminder for event "${event.title}" to user ${reminder.user_id}`);
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
  } catch (error) {
    console.error("Error sending event response notification:", error);
  }
}