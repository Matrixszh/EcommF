import "server-only";
import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : {
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        };

    // Fix private key format if needed (handle missing headers or padding)
    if (serviceAccount.private_key && !serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
        let key = serviceAccount.private_key.replace(/\s/g, '');
        // Add padding if needed
        while (key.length % 4 !== 0) {
            key += '=';
        }
        serviceAccount.private_key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----\n`;
    } else if (serviceAccount.private_key) {
        // Handle literal \n characters if they exist in the string
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Firebase Admin initialization error", error);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
