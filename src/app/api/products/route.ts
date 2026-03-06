import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import { checkAdmin } from '@/lib/auth-server';
import redis, { invalidateCache } from '@/lib/redis';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '0');

    const query: any = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(query)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
    
    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error('[API] Error fetching products:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { authorized, reason } = await checkAdmin(request);
    if (!authorized) {
      return NextResponse.json({ success: false, error: reason }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();

    // Basic Validation
    if (!body.name || !body.price || !body.description || !body.category) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const payload = {
      ...body,
      price: Number(body.price),
      stock: Number(body.stock || 0),
    };

    const product = await Product.create(payload);
    
    // Invalidate caches
    console.log('[API] Invalidating caches for new product');
    await Promise.all([
      invalidateCache('v2:products:*'),
      redis?.del('v2:featured_products').catch(err => console.error('Redis error:', err))
    ]);
    
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Error creating product:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
