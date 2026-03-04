import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: Request) {
  console.log('API /api/auth/me called');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { uid, email } = body;

    console.log('Connecting to DB...');
    await dbConnect();
    console.log('DB Connected');

    if (!uid) {
      console.log('Missing UID');
      return NextResponse.json({ error: 'UID required' }, { status: 400 });
    }

    // Find user by Firebase UID
    let user = await User.findOne({ firebaseUid: uid });
    console.log('User found:', user);

    // If user doesn't exist but email is provided, create a new user entry
    // This handles the first-time login/signup sync
    if (!user && email) {
      console.log('Creating new user...');
      user = await User.create({
        firebaseUid: uid,
        email,
        role: 'user' // Default role
      });
      console.log('User created:', user);
    }

    if (!user) {
        console.log('User not found after check');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ role: user.role });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
