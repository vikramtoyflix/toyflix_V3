import messaging from '@react-native-firebase/messaging';
import { PERMISSIONS, request } from 'react-native-permissions';
import OneSignal from 'react-native-onesignal';

// Initialize OneSignal with your app ID (replace with your actual OneSignal App ID)
OneSignal.setAppId('cf0d0d0b-7c19-49bb-9e84-63b910a0fd45');

// Method to get FCM token
export const getFcmToken = async () => {
  let token = null;
  await checkApplicationNotificationPermission();
  await registerAppWithFCM();
  
  try {
    token = await messaging().getToken();
    console.log('getFcmToken-->', token);
  } catch (error) {
    console.log('getFcmToken Device Token error ', error);
  }
  
  return token;
};

// Register the app for FCM notifications
export async function registerAppWithFCM() {
  if (!messaging().isDeviceRegisteredForRemoteMessages) {
    try {
      await messaging().registerDeviceForRemoteMessages();
      console.log('Device successfully registered for FCM');
    } catch (error) {
      console.log('registerDeviceForRemoteMessages error ', error);
    }
  }
}

// Request permission for notifications
export const checkApplicationNotificationPermission = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED || authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
    if (enabled) {
      console.log('Authorization status:', authStatus);
    }
    
    await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
    console.log('POST_NOTIFICATIONS permission granted');
  } catch (error) {
    console.log('Error requesting notification permissions', error);
  }
};

// Register for notification listeners with FCM and OneSignal
export function registerListenerWithOneSignal() {
  // OneSignal notification handler for when the app is opened from the background or terminated
  const onNotificationOpened = OneSignal.setNotificationOpenedHandler(notification => {
    console.log('OneSignal Notification Opened: ', notification);
    if (notification.notification.additionalData) {
      // Handle any specific logic based on the notification data
    }
  });

  // OneSignal notification handler for foreground notifications
  const onNotificationReceived = OneSignal.setNotificationReceivedHandler(notification => {
    console.log('OneSignal Notification Received in Foreground: ', notification);
    if (notification.payload.body) {
      // Display or process the notification
      onDisplayNotification(notification.payload.title, notification.payload.body, notification.payload.additionalData);
    }
  });

  // Firebase messaging: Handle notifications when the app is in the background
  messaging().onNotificationOpenedApp(async remoteMessage => {
    console.log('onNotificationOpenedApp Received', JSON.stringify(remoteMessage));
    // Handle any specific logic when the app is opened from a notification
  });

  // Check whether an initial notification is available (for when the app is killed and opened)
  messaging().getInitialNotification().then(remoteMessage => {
    if (remoteMessage) {
      console.log('Notification caused app to open from quit state:', remoteMessage.notification);
    }
  });

  // Return a cleanup function to unsubscribe from listeners
  return () => {
    console.log('Cleaning up OneSignal and Firebase listeners...');
    OneSignal.removeEventListener('received', onNotificationReceived);
    OneSignal.removeEventListener('opened', onNotificationOpened);
  };
}

// Method to display the notification
async function onDisplayNotification(title, body, data) {
  console.log('onDisplayNotification: ', JSON.stringify(data));
  // You can customize this to show the notification, for example, using a library like Notifee
}
