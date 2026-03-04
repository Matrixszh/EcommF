import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';

async function isAdmin(request: Request) {
  const uid = request.headers.get('x-user-uid');
  if (!uid) return false;
  
  await dbConnect();
  const user = await User.findOne({ firebaseUid: uid });
  return user && user.role === 'admin';
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const { status } = await request.json();
    
    const order = await Order.findByIdAndUpdate(
      id, 
      { status },
      { new: true }
    );

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
