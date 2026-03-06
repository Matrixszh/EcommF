import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product'; // Ensure Product model is registered
import crypto from 'crypto';
import { getAuthUser } from '@/lib/auth-server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    console.log('[API] /api/orders GET called');
    await dbConnect();
    const user = await getAuthUser(request);

    if (!user) {
      console.warn('[API] Unauthorized orders fetch attempt');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let orders;
    // Cast user to any to avoid TypeScript errors with lean() return type
    if ((user as any).role === 'admin') {
      console.log(`[API] Admin fetching all orders: ${(user as any).email}`);
      // Admin sees all orders
      orders = await Order.find({})
        .sort({ createdAt: -1 })
        .populate('products.productId');
    } else {
      console.log(`[API] User fetching own orders: ${(user as any).email}`);
      // User sees only their orders
      orders = await Order.find({ userId: (user as any).firebaseUid })
        .sort({ createdAt: -1 })
        .populate('products.productId');
    }
    
    console.log(`[API] Found ${orders.length} orders`);
    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    console.error('[API] Error fetching orders:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log('[API] /api/orders POST called');
    await dbConnect();
    const user = await getAuthUser(request);
    if (!user) {
      console.warn('[API] Unauthorized order creation attempt');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Override userId with authenticated user's ID
    body.userId = (user as any).firebaseUid;

    // Basic validation
    if (!body.products || body.products.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid order data' }, { status: 400 });
    }

    // Verify Razorpay Payment if present
    if (body.razorpay_payment_id && body.razorpay_order_id && body.razorpay_signature) {
      console.log('[API] Verifying Razorpay payment');
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        console.error('[API] Razorpay key secret missing');
        return NextResponse.json(
          { success: false, error: "Razorpay key secret is not configured" },
          { status: 500 }
        );
      }

      const generated_signature = crypto
        .createHmac("sha256", keySecret)
        .update(body.razorpay_order_id + "|" + body.razorpay_payment_id)
        .digest("hex");

      if (generated_signature !== body.razorpay_signature) {
        console.warn('[API] Invalid payment signature');
        return NextResponse.json(
          { success: false, error: "Invalid payment signature" },
          { status: 400 }
        );
      }
      
      // Update payment details in order body
      body.paymentId = body.razorpay_payment_id;
      body.orderId = body.razorpay_order_id;
      body.status = "processing"; // Payment successful
    }

    // 1. Atomic Stock Update & Reservation
    console.log('[API] Updating stock for order items');
    const updatedProducts = [];
    try {
      for (const item of body.products) {
        // Try to find product with sufficient stock and decrement atomically
        const product = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true }
        );

        if (!product) {
          // If update returns null, it means either product doesn't exist or stock < quantity
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }
        updatedProducts.push({ productId: item.productId, quantity: item.quantity });
      }

      // 2. Create Order
      console.log('[API] Creating order document');
      const order = await Order.create(body);
      
      console.log('[API] Order created successfully:', order._id);
      return NextResponse.json({ success: true, data: order }, { status: 201 });

    } catch (stockError: any) {
      // Rollback: If any stock update failed or order creation failed
      // We need to increment back the stock for successfully updated products
      console.error('[API] Order creation failed, rolling back stock:', stockError);
      
      for (const item of updatedProducts) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: item.quantity } }
        );
      }

      return NextResponse.json({ 
        success: false, 
        error: stockError.message || 'Failed to create order due to stock issues' 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[API] Order API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}
