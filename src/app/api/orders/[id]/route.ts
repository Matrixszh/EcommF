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
    console.log('[API] /api/orders/[id] PUT called');
    const { authorized, reason, user } = await checkAdmin(request);
    if (!authorized) {
      console.warn(`[API] Unauthorized order update attempt: ${reason}`);
      return NextResponse.json({ success: false, error: reason || 'Unauthorized' }, { status: 401 });
    }
    console.log(`[API] Admin verified: ${(user as any)?.email}`);

    await dbConnect();
    const { id } = await params;
    const { status } = await request.json();
    
    console.log(`[API] Updating order ${id} status to ${status}`);

    const order = await Order.findByIdAndUpdate(
      id, 
      { status },
      { new: true }
    );

    if (!order) {
      console.warn(`[API] Order not found: ${id}`);
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    console.log(`[API] Order updated successfully`);
    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    console.error('[API] Error updating order:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}
