import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  console.log('API /api/auth/me called');
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    console.log('Connecting to DB...');
    await dbConnect();
    console.log('DB Connected');

    // Find user by Firebase UID
    let user = await User.findOne({ firebaseUid: uid });
    console.log('User found:', user);

    // If user doesn't exist, create a new user entry
    if (!user) {
      console.log('Creating new user...');
      // If email is not in token, try to get it from body (though token should have it)
      let userEmail = email;
      if (!userEmail) {
        try {
            const body = await request.json();
            userEmail = body.email;
        } catch (e) {
            // Body might be empty
        }
      }

      user = await User.create({
        firebaseUid: uid,
        email: userEmail,
        role: 'user' // Default role
      });
      console.log('User created:', user);
    }

    return NextResponse.json({ role: user.role });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
