import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import mongoose from 'mongoose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkId = searchParams.get('id');
  const flush = searchParams.get('flush');

  const status: any = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI_DEFINED: !!process.env.MONGODB_URI,
      CLOUDINARY_DEFINED: !!process.env.CLOUDINARY_CLOUD_NAME,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    },
    mongodb: {
      status: 'unknown',
      readyState: 0,
    },
    data: {
      productCount: 0,
      products: [],
    }
  };

  try {
    await dbConnect();
    status.mongodb.status = 'connected';
    status.mongodb.readyState = mongoose.connection.readyState;
    
    const count = await Product.countDocuments();
    status.data.productCount = count;
    
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

  return NextResponse.json(status);
}
