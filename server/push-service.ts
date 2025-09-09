import webpush from 'web-push';
import { storage } from './storage';
import { NotificationType } from '@shared/schema';

// Configure web push with VAPID keys
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
  console.warn('VAPID keys not configured. Push notifications will not work.');
} else {
  try {
    // Ensure VAPID subject has mailto: prefix if it's just an email
    let vapidSubject = process.env.VAPID_SUBJECT!;
    if (!vapidSubject.startsWith('mailto:') && !vapidSubject.startsWith('http')) {
      vapidSubject = `mailto:${vapidSubject}`;
    }

    // Clean up the public key to ensure it's URL-safe base64 without padding
    let publicKey = process.env.VAPID_PUBLIC_KEY!.replace(/[=]+$/, '');
    
    console.log('Configuring VAPID with subject:', vapidSubject);
    console.log('Public key length:', publicKey.length);
    
    webpush.setVapidDetails(
      vapidSubject,
      publicKey,
      process.env.VAPID_PRIVATE_KEY!
    );
    
    console.log('VAPID configuration successful');
  } catch (error) {
    console.error('Failed to configure VAPID keys:', error);
    console.warn('Push notifications will not work due to VAPID configuration error');
  }
}

interface PushNotificationData {
  title: string;
  message: string;
  type: NotificationType;
  url?: string;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

export class PushNotificationService {
  static async sendNotificationToUser(userId: string, data: PushNotificationData) {
    try {
      // First, create an in-app notification
      await storage.createNotification({
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        isRead: false
      });

      const subscriptions = await storage.getUserPushSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        console.log(`No push subscriptions found for user ${userId}, but in-app notification created`);
        return;
      }

      const payload = JSON.stringify({
        title: data.title,
        body: data.message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: {
          type: data.type,
          url: data.url || '/',
          timestamp: Date.now()
        },
        actions: data.actions || [
          {
            action: 'view',
            title: 'View Details'
          },
          {
            action: 'close',
            title: 'Close'
          }
        ]
      });

      const pushPromises = subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth
              }
            },
            payload
          );
          console.log(`Push notification sent to user ${userId}`);
        } catch (error: any) {
          console.error(`Failed to send push notification:`, error);
          
          // If subscription is invalid, remove it
          if (error.statusCode === 410 || error.statusCode === 413) {
            console.log(`Removing invalid subscription for user ${userId}`);
            await storage.deletePushSubscription(subscription.id);
          }
        }
      });

      await Promise.all(pushPromises);
    } catch (error) {
      console.error('Error sending push notifications:', error);
    }
  }

  static async sendNotificationToAllUsers(data: PushNotificationData) {
    try {
      // First, create in-app notifications for all users
      const allUsers = await storage.getAllUsers();
      const notificationPromises = allUsers.map(user => 
        storage.createNotification({
          userId: user.id,
          type: data.type,
          title: data.title,
          message: data.message,
          isRead: false
        })
      );
      await Promise.all(notificationPromises);

      const subscriptions = await storage.getAllPushSubscriptions();
      
      const payload = JSON.stringify({
        title: data.title,
        body: data.message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: {
          type: data.type,
          url: data.url || '/',
          timestamp: Date.now()
        },
        actions: data.actions || [
          {
            action: 'view',
            title: 'View Details'
          },
          {
            action: 'close',
            title: 'Close'
          }
        ]
      });

      const pushPromises = subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth
              }
            },
            payload
          );
        } catch (error: any) {
          console.error(`Failed to send push notification:`, error);
          
          // If subscription is invalid, remove it
          if (error.statusCode === 410 || error.statusCode === 413) {
            await storage.deletePushSubscription(subscription.id);
          }
        }
      });

      await Promise.all(pushPromises);
      console.log(`Push notifications sent to ${subscriptions.length} subscriptions`);
    } catch (error) {
      console.error('Error sending push notifications to all users:', error);
    }
  }
}