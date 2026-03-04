import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Order from '@/models/Order';
import User from '@/models/User';

async function isAdmin(request: Request) {
  const uid = request.headers.get('x-user-uid');
  if (!uid) return false;
  
  await dbConnect();
  const user = await User.findOne({ firebaseUid: uid });
  return user && user.role === 'admin';
}

export async function GET(request: Request) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
