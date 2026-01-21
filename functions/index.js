/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onValueCreated } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Triggers when a new message is added to the Realtime Database.
 * Sends a push notification to all users except the sender.
 */
exports.sendChatNotification = onValueCreated(
  "/messages/{messageId}",
  async (event) => {
    // 1. Get the new message data
    const message = event.data.val();
    if (!message) {
      console.log("No message data available.");
      return;
    }

    const senderUsername = message.username;
    console.log(`New message from ${senderUsername}. Preparing notifications...`);

    try {
      // 2. Fetch all user tokens from the database
      const usersSnapshot = await admin.database().ref("users").once("value");
      const users = usersSnapshot.val();

      if (!users) {
        console.log("No users found in database.");
        return;
      }

      // 3. Collect FCM tokens from all users except the sender
      const tokens = [];
      for (const [userId, userData] of Object.entries(users)) {
        // Assuming user structure: users/{username}/fcmToken/token
        // The senderUsername matches the key in 'users' based on ChatRoom.jsx logic
        if (userId !== senderUsername && userData.fcmToken && userData.fcmToken.token) {
          tokens.push(userData.fcmToken.token);
        }
      }

      if (tokens.length === 0) {
        console.log("No other users with tokens found. Skipping notifications.");
        return;
      }

      console.log(`Found ${tokens.length} target tokens.`);

      // 4. Construct the notification payload (Generic content)
      // using FCM HTTP v1 API structure (handled by Admin SDK)
      const notification = {
        title: "New Message",
        body: "You have received a new message",
      };

      // 5. Send multicast message
      // Note: sendEachForMulticast handles up to 500 tokens at once.
      // For larger apps, you would need to batch this.
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        notification: notification,
        webpush: {
          notification: {
            icon: "/vite.svg", // Ensure this path is valid in your deployed app
            tag: "new_message", // Collapses multiple notifications
            renotify: true,
          },
          fcmOptions: {
            link: "/", // Opens the app root when clicked
          },
        },
      });

      // 6. Log results
      if (response.failureCount > 0) {
        console.log(`Failed to send ${response.failureCount} notifications.`);
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });
        console.log("Failed tokens:", failedTokens);
        // Optional: Clean up invalid tokens from DB here
      } else {
        console.log("All notifications sent successfully.");
      }
    } catch (error) {
      console.error("Error sending notifications:", error);
    }
  }
);
