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
    const user = await User.findOne({ firebaseUid: uid }).lean();
    return user;
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}

export async function getAuthUser(request: Request) {
  return verifyAuth(request);
}

export async function checkAdmin(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      console.warn('[Admin Check] No user found from token');
      return { authorized: false, reason: 'Authentication failed' };
    }
    // Check if user has role property and it is 'admin'
    if ((user as any).role !== 'admin') {
      console.warn(`[Admin Check] User ${(user as any)._id} (role: ${(user as any).role}) is not admin`);
      return { authorized: false, reason: 'Insufficient permissions' };
    }
    return { authorized: true, user };
  } catch (error) {
    console.error('[Admin Check] Error verifying user:', error);
    return { authorized: false, reason: 'Internal auth error' };
  }
}
