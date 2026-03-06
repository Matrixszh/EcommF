import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import redis from '@/lib/redis';
import Product from '@/models/Product';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkId = searchParams.get('id');

  const status: any = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI_DEFINED: !!process.env.MONGODB_URI,
      REDIS_URL_DEFINED: !!process.env.REDIS_URL,
      CLOUDINARY_DEFINED: !!process.env.CLOUDINARY_CLOUD_NAME,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    },
    mongodb: {
      status: 'unknown',
      readyState: 0,
    },
    redis: {
      status: 'unknown',
    },
    data: {
      productCount: 0,
      products: [],
    }
  };

  try {
    // Check MongoDB
    await dbConnect();
    status.mongodb.status = 'connected';
    status.mongodb.readyState = mongoose.connection.readyState;
    
    // Check Data
    const count = await Product.countDocuments();
    status.data.productCount = count;
    
    // Get last 5 products
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id name images category price createdAt')
      .lean();
      
    status.data.products = products;

    if (checkId) {
      const specificProduct = await Product.findById(checkId).lean();
      status.data.checkedProduct = specificProduct || 'Not Found';
    }

  } catch (error: any) {
    status.mongodb.status = 'error';
    status.mongodb.error = error.message;
  }

  try {
    // Check Redis
    if (redis) {
      const redisPromise = (async () => {
        await redis.set('debug-test', 'ok', 'EX', 10);
        const val = await redis.get('debug-test');
        return val === 'ok' ? 'connected' : 'failed';
      })();

      const timeoutPromise = new Promise<string>((resolve) => 
        setTimeout(() => resolve('timeout'), 2000)
      );

      const statusResult = await Promise.race([redisPromise, timeoutPromise]);
      status.redis.status = statusResult;
    } else {
      status.redis.status = 'disabled (no client)';
    }
  } catch (error: any) {
    status.redis.status = 'error';
    status.redis.error = error.message;
  }

  return NextResponse.json(status);
}
