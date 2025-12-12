import cron from "node-cron";
import { sendEventReminders } from "./services/notifications.service.js";

/**
 * Initialize scheduled jobs
 */
export function initScheduler() {
  // Run every minute to check for upcoming events (minimum granularity)
  cron.schedule("* * * * *", async () => {
    // console.log(`[${new Date().toISOString()}] Running event reminder check...`);
    await sendEventReminders();
  });

  console.log("Notification scheduler initialized");
}
