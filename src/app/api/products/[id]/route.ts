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
    
    console.log(`[API] Fetching product: ${id}`);
    
    // Validate ID format
    if (!id || id.length !== 24) {
      return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400 });
    }

    const product = await Product.findById(id).lean();
    
    if (!product) {
      console.warn(`[API] Product not found: ${id}`);
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    console.error('[API] Error fetching product:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[API] /api/products/[id] PUT called');
    const { authorized, reason, user } = await checkAdmin(request);
    if (!authorized) {
      console.warn(`[API] Unauthorized product update attempt: ${reason}`);
      return NextResponse.json({ success: false, error: reason }, { status: 401 });
    }
    console.log(`[API] Admin verified: ${(user as any)?.email}`);

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    if (!id || id.length !== 24) {
      return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400 });
    }
    
    console.log(`[API] Updating product: ${id}`);
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
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[API] /api/products/[id] DELETE called');
    const { authorized, reason, user } = await checkAdmin(request);
    if (!authorized) {
      console.warn(`[API] Unauthorized product deletion attempt: ${reason}`);
      return NextResponse.json({ success: false, error: reason }, { status: 401 });
    }
    console.log(`[API] Admin verified: ${(user as any)?.email}`);

    await dbConnect();
    const { id } = await params;

    if (!id || id.length !== 24) {
      return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400 });
    }
    
    console.log(`[API] Deleting product: ${id}`);
    const product = await Product.findByIdAndDelete(id);

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

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    console.error('[API] Error deleting product:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message, 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
