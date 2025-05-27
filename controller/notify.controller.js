import axios from "axios";
import admin from "firebase-admin";
import fs from "fs";
import { API_ENDPOINTS } from "../constant.js";

// Load service account JSON
const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("../service.json", import.meta.url))
);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIRBASE_DATABASE_URL,
});

// Fetch all FCM tokens from external API
const fetchAllFCMTokens = async () => {
  try {
    const { data } = await axios.get(
      process.env.ORACLE_DATABASE_URL
    );
    return data.data || [];
  } catch (error) {
    console.error("❌ Error fetching FCM tokens:", error.message);
    return [];
  }
};

// Send a single notification
export const sendNotification = async (token, title, body) => {
  if (!token) throw new Error("FCM token is required");

  const payload = {
    token,
    notification: {
      title,
      body,
    },
    data: {
      type: "notification",
      title,
      body,
    },
  };

  try {
    return await admin.messaging().send(payload);
  } catch (error) {
    console.error(`❌ Failed to send notification to token ${token}:`, error.message);
    throw error;
  }
};

// Broadcast notification to all devices
const handleBroadcastNotification = async (res, type, title, body) => {
    try {
      const tokens = (await fetchAllFCMTokens()).map(token => token.fcm_token);
      const results = { success: 0, failure: 0 };
  
      const batch = tokens.map(token =>
        sendNotification(token, title, body)
          .then(() => results.success++)
          .catch(() => results.failure++)
      );
  
      await Promise.allSettled(batch);
  
      console.log(`✅ ${type} notification sent to ${results.success} devices, failed for ${results.failure} devices`);
  
      return res.status(200).json({
        access: true,
        message: `${type} notifications processed`,
        successCount: results.success,
        failureCount: results.failure,
      });
    } catch (error) {
      console.error(`❌ Error in ${type} broadcast:`, error.message);
      return res.status(500).json({
        access: false,
        error: 'Failed to process broadcast notifications',
        details: error.message,
      });
    }
  };
  

const singleNotificationHandler = async (req, res, title, defaultMessage) => {
    console.log('📥 Single notification request received:', req.body);
  
    const { fcm_token, message, user_id } = req.body;
  
    if (!fcm_token) {
      return res.status(400).json({
        access: false,
        error: 'FCM token is required',
      });
    }
  
    const msg = String(message || defaultMessage);
    const ttl = String(title);
  
    try {
      const result = await sendNotification(fcm_token, ttl, msg);
      await HandleExternalNotification(ttl, msg, user_id);
  
      console.log(`✅ ${ttl} notification sent to token ${fcm_token}`);
      return res.status(200).json({
        access: true,
        message: 'Notification sent successfully',
        data: {
          messageId: result,
          title: ttl,
          body: msg,
        },
      });
    } catch (error) {
      console.error('❌ Error in single notification handler:', error.message);
      return res.status(500).json({
        access: false,
        error: 'Failed to send notification',
        details: error.message,
      });
    }
  };

  const HandleExternalNotification = async (title, message, user_id) => {
    try {
      console.log('External notification request:', {
        title,
        message,
        user_id,
      });
      const response = await axios.post(API_ENDPOINTS.NOTIFICATION, {
        title: title,
        message: message,
        user_id: user_id,
      });
  
      console.log('✅ External notification response:', response.data);
    } catch (error) {
      console.error('❌ Error sending external notification:', error.message);
    }
}; 
  

  export { handleBroadcastNotification, singleNotificationHandler };
