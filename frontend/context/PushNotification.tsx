import { useState, useEffect } from 'react';
import { Text, View, Button, StyleSheet, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { uploadPushToken, getPushToken } from '../services/push-token';

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

}