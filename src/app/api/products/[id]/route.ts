import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import { checkAdmin } from '@/lib/auth-server';
import redis, { invalidateCache } from '@/lib/redis';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    // Validate ID format
    if (!id || id.length !== 24) {
      return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400 });
    }

    const product = await Product.findById(id).lean();
    
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    console.error('[API] Error fetching product:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, reason } = await checkAdmin(request);
    if (!authorized) {
      return NextResponse.json({ success: false, error: reason }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    if (!id || id.length !== 24) {
      return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400 });
    }
    
    const product = await Product.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Invalidate caches
    console.log(`[API] Invalidating caches for product ${id}`);
    await Promise.all([
      invalidateCache('v2:products:*'),
      redis?.del(`v2:product:${id}`).catch(err => console.error('Redis error:', err)),
      redis?.del('v2:featured_products').catch(err => console.error('Redis error:', err))
    ]);

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    console.error('[API] Error updating product:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, reason } = await checkAdmin(request);
    if (!authorized) {
      return NextResponse.json({ success: false, error: reason }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    if (!id || id.length !== 24) {
      return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400 });
    }
    
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Invalidate caches
    console.log(`[API] Invalidating caches for deleted product ${id}`);
    await Promise.all([
      invalidateCache('v2:products:*'),
      redis?.del(`v2:product:${id}`).catch(err => console.error('Redis error:', err)),
      redis?.del('v2:featured_products').catch(err => console.error('Redis error:', err))
    ]);

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    console.error('[API] Error deleting product:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
