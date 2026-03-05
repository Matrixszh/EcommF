import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import Product from '@/models/Product'; // Ensure Product model is registered
import crypto from 'crypto';

// Helper to check if user is admin
async function getUser(request: Request) {
  const uid = request.headers.get('x-user-uid');
  if (!uid) return null;
  
  await dbConnect();
  const user = await User.findOne({ firebaseUid: uid });
  return user;
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let orders;
    if (user.role === 'admin') {
      // Admin sees all orders
      orders = await Order.find({})
        .sort({ createdAt: -1 })
        .populate('products.productId');
    } else {
      // User sees only their orders
      orders = await Order.find({ userId: user.firebaseUid })
        .sort({ createdAt: -1 })
        .populate('products.productId');
    }
    
    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    // Basic validation
    if (!body.userId || !body.products || body.products.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid order data' }, { status: 400 });
    }

    // Verify Razorpay Payment if present
    if (body.razorpay_payment_id && body.razorpay_order_id && body.razorpay_signature) {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
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

    // 1. Check stock availability for all products
    for (const item of body.products) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return NextResponse.json({ 
          success: false, 
          error: `Product not found: ${item.productId}` 
        }, { status: 400 });
      }

      if (product.stock < item.quantity) {
        return NextResponse.json({ 
          success: false, 
          error: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}` 
        }, { status: 400 });
      }
    }

    // 2. Decrement stock
    const updatedProducts = [];
    try {
      for (const item of body.products) {
        await Product.findByIdAndUpdate(
          item.productId, 
          { $inc: { stock: -item.quantity } }
        );
        updatedProducts.push({ id: item.productId, quantity: item.quantity });
      }
    } catch (error) {
      // Rollback if any update fails
      console.error("Error updating stock, rolling back...", error);
      for (const p of updatedProducts) {
        await Product.findByIdAndUpdate(p.id, { $inc: { stock: p.quantity } });
      }
      throw new Error("Failed to update stock");
    }

    // 3. Create order
    try {
      const order = await Order.create(body);
      return NextResponse.json({ success: true, data: order }, { status: 201 });
    } catch (error: any) {
      // Rollback stock if order creation fails
      console.error("Error creating order, rolling back stock...", error);
      for (const p of updatedProducts) {
        await Product.findByIdAndUpdate(p.id, { $inc: { stock: p.quantity } });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
