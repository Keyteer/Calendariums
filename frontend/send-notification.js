// Simple script to send a push notification
// Run with: node send-notification.js

const EXPO_PUSH_TOKEN = 'ExponentPushToken[Hm4D8zDe0Y7g7AUGcljG5h]'; // <-- Paste your token here

async function sendNotification() {
  const message = {
    to: EXPO_PUSH_TOKEN,
    sound: 'default',
    title: 'Hello from Backend! 🎉',
    body: 'This notification was sent from your backend script',
    data: { someData: 'you can pass custom data here' },
  };

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  const result = await response.json();
  console.log('Response:', result);
}

sendNotification();
