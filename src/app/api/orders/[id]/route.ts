import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { checkAdmin } from '@/lib/auth-server';

export const runtime = 'nodejs';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, reason } = await checkAdmin(request);
    if (!authorized) {
      return NextResponse.json({ success: false, error: reason || 'Unauthorized' }, { status: 401 });
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
