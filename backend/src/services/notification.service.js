import admin from 'firebase-admin';
import prisma from '../config/db.js';

// Initialize Firebase Admin SDK
// Make sure to set the FIREBASE_SERVICE_ACCOUNT environment variable with the JSON content
let firebaseApp = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT.trim().startsWith('{')
        ? process.env.FIREBASE_SERVICE_ACCOUNT
        : Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')
    );
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT env variable not found. Push notifications will be disabled.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK:", error);
}

/**
 * Send a push notification to all devices registered for a user
 * @param {string} userId - User ID to send the notification to
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional extra data payload
 */
export const sendOrderNotification = async (userId, title, body, data = {}) => {
  if (!firebaseApp) {
    console.log("Firebase Admin not initialized, skipping notification send.");
    return;
  }

  try {
    const fcmTokens = await prisma.fcmToken.findMany({
      where: { userId }
    });

    if (fcmTokens.length === 0) {
      console.log(`No FCM tokens found for user ${userId}.`);
      return;
    }

    const tokens = fcmTokens.map(t => t.token);
    
    const message = {
      notification: { title, body },
      data: {
        ...data,
        click_action: "FLUTTER_NOTIFICATION_CLICK" // optional, typical for handling clicks
      },
      tokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Clean up invalid tokens
    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        if (
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/registration-token-not-registered'
        ) {
          failedTokens.push(tokens[idx]);
        }
      }
    });

    if (failedTokens.length > 0) {
      await prisma.fcmToken.deleteMany({
        where: { token: { in: failedTokens } }
      });
      console.log(`Cleaned up ${failedTokens.length} invalid FCM tokens.`);
    }

  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};
