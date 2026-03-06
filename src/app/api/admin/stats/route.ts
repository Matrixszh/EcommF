import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Order from '@/models/Order';
import { checkAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { authorized, reason } = await checkAdmin(request);
    if (!authorized) {
      return NextResponse.json({ success: false, error: reason || 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const productCount = await Product.countDocuments();
    const orderCount = await Order.countDocuments();
    
    // Calculate revenue from non-cancelled orders
    const orders = await Order.find({ status: { $ne: 'cancelled' } });
    const totalRevenue = orders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        products: productCount,
        orders: orderCount,
        revenue: totalRevenue
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
