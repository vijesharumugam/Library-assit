import webpush from 'web-push';
import { storage } from './storage';
import { NotificationType } from '@shared/schema';

// Configure web push with VAPID keys
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
  console.warn('VAPID keys not configured. Push notifications will not work.');
} else {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
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
      const subscriptions = await storage.getUserPushSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        console.log(`No push subscriptions found for user ${userId}`);
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