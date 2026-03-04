import mongoose from 'mongoose';
const { Schema } = mongoose;

// Configuration from .env.local
const FIREBASE_API_KEY = "AIzaSyBg2vSPnyxTDuuh66KNnzVTyeKgwnzfnHk";
const MONGODB_URI = "mongodb+srv://zainhussaini9898_db_user:zartaq@cluster1.eu7brqg.mongodb.net/?appName=Cluster1";

const ADMIN_EMAIL = "zainhussaini9898@gmail.com";
const ADMIN_PASSWORD = "zartaq";

// Define User Schema inline
const UserSchema = new Schema({
  firebaseUid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function createAdmin() {
  console.log('Starting Admin Creation Process...');

  // 1. Create User in Firebase Auth via REST API
  let firebaseUid;
  try {
    console.log('Creating user in Firebase Auth...');
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        returnSecureToken: true
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.error && data.error.message === 'EMAIL_EXISTS') {
        console.log('User already exists in Firebase. Attempting to sign in to get UID...');
        // Sign in to get UID
        const signInResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            returnSecureToken: true
          })
        });
        const signInData = await signInResponse.json();
        if (!signInResponse.ok) {
            throw new Error(`Failed to sign in: ${signInData.error.message}`);
        }
        firebaseUid = signInData.localId;
        console.log(`User signed in. UID: ${firebaseUid}`);
      } else {
        throw new Error(`Firebase Auth Error: ${data.error.message}`);
      }
    } else {
      firebaseUid = data.localId;
      console.log(`User created in Firebase. UID: ${firebaseUid}`);
    }

  } catch (error) {
    console.error('Failed to handle Firebase Auth:', error.message);
    process.exit(1);
  }

  // 2. Create/Update User in MongoDB
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    console.log('Upserting admin user in MongoDB...');
    const result = await User.findOneAndUpdate(
      { email: ADMIN_EMAIL },
      { 
        firebaseUid: firebaseUid,
        email: ADMIN_EMAIL,
        role: 'admin'
      },
      { upsert: true, new: true }
    );

    console.log('Admin user successfully seeded in MongoDB:', result);

  } catch (error) {
    console.error('MongoDB Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed.');
  }
}

createAdmin();
