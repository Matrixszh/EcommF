import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import { checkAdmin } from '@/lib/auth-server';
import redis, { invalidateCache } from '@/lib/redis';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    console.log('[API] /api/products GET called');
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '0');

    console.log(`[API] Fetching products with params: category=${category}, search=${search}, limit=${limit}`);

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
    
    console.log(`[API] Found ${products.length} products`);
    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error('[API] Error fetching products:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log('[API] /api/products POST called');
    const { authorized, reason, user } = await checkAdmin(request);
    if (!authorized) {
      console.warn(`[API] Unauthorized product creation attempt: ${reason}`);
      return NextResponse.json({ success: false, error: reason }, { status: 401 });
    }
    console.log(`[API] Admin verified: ${(user as any)?.email}`);

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

    console.log('[API] Creating product:', payload.name);
    const product = await Product.create(payload);
    console.log('[API] Product created:', product._id);
    
    // Invalidate caches
    console.log('[API] Invalidating caches for new product');
    await Promise.all([
      invalidateCache('v2:products:*'),
      redis?.del('v2:featured_products').catch(err => console.error('Redis error:', err))
    ]);
    
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Error creating product:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
