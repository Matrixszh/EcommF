import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Order from '@/models/Order';
import { checkAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Ensure Node.js runtime for MongoDB connection

export async function GET(request: Request) {
  try {
    console.log('[API] /api/admin/stats called');
    
    // Auth Check
    const { authorized, reason, user } = await checkAdmin(request);
    if (!authorized) {
      console.warn(`[API] Admin stats unauthorized: ${reason}`);
      return NextResponse.json({ success: false, error: reason || 'Unauthorized' }, { status: 401 });
    }
    console.log(`[API] Admin verified: ${(user as any)?.email}`);

    // DB Connection
    await dbConnect();
    console.log('[API] DB connected, fetching stats...');

    // Parallel execution for better performance
    const [productCount, orderCount, orders] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      Order.find({ status: { $ne: 'cancelled' } }).select('totalAmount status').lean()
    ]);

    // Calculate revenue from non-cancelled orders
    const totalRevenue = orders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);

    const stats = {
      products: productCount,
      orders: orderCount,
      revenue: totalRevenue
    };

    console.log('[API] Stats fetched successfully:', stats);

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('[API] Error fetching admin stats:', error);
    // Return detailed error in development, generic in production? User asked for detailed logging.
    // For debugging deployment issues, returning the message is helpful.
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}
