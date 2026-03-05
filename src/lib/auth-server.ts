import "server-only";
import { adminAuth } from '@/lib/firebase-admin';
import User from '@/models/User';
import dbConnect from '@/lib/mongodb';

export async function verifyAuth(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    await dbConnect();
    const user = await User.findOne({ firebaseUid: uid });
    return user;
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}

export async function getAuthUser(request: Request) {
  return verifyAuth(request);
}
