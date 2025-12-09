import { useState, useEffect } from 'react';
import { Text, View, Button, StyleSheet, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// This tells the app how to handle notifications when they arrive
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function PushNotificationTest() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    // Register for push notifications when component mounts
    registerForPushNotifications();

    // Listen for incoming notifications (when app is open)
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        const title = notification.request.content.title || 'No title';
        const body = notification.request.content.body || 'No body';
        setMessage(`Received: ${title} - ${body}`);
      }
    );

    // Listen for when user taps on a notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('User tapped notification:', response);
      }
    );

    // Cleanup listeners on unmount
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  async function registerForPushNotifications() {
    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      setExpoPushToken('Permission denied!');
      return;
    }

    // Get the Expo push token
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId 
        ?? Constants?.easConfig?.projectId;
      
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      setExpoPushToken(token.data);
      console.log('Expo Push Token:', token.data);
    } catch (error) {
      setExpoPushToken(`Error: ${error}`);
    }
  }

  // Send a LOCAL notification (for testing without backend)
  async function sendLocalNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification 📬',
        body: 'This is a local test notification!',
        data: { test: 'data' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 }, // Send after 2 seconds
    });
    setMessage('Local notification scheduled!');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Push Notification Test</Text>
      
      <Text style={styles.label}>Your Expo Push Token:</Text>
      <Text style={styles.token} selectable>{expoPushToken || 'Loading...'}</Text>
      
      <Text style={styles.hint}>
        Copy this token and use it in your backend to send notifications
      </Text>

      <Button title="Send Local Test Notification" onPress={sendLocalNotification} />
      
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  token: {
    fontSize: 12,
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  message: {
    marginTop: 20,
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
  },
});
