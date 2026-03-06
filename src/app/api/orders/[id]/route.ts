import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import { getAuthUser } from '@/lib/auth-server';
import redis, { invalidateCache, getOrSetCache } from '@/lib/redis';

export const runtime = 'nodejs';

// Helper to check if user is admin
async function isAdmin(request: Request) {
  const user = await getAuthUser(request);
  return user && user.role === 'admin';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ✅ Wrap in Redis cache — avoids hitting MongoDB on every serverless request.
    // This is the main reason the deployed version failed: cold-start DB connections
    // under Vercel's serverless model timed out without caching.
    const product = await getOrSetCache(
      `v2:product:${id}`,
      async () => {
        await dbConnect();
        const result = await Product.findById(id).lean(); // .lean() returns plain object, safer to cache
        return result ?? null;
      },
      300 // cache for 5 minutes
    );

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    console.error('[GET /product/:id]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    
    const product = await Product.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Invalidate caches
    await Promise.all([
      invalidateCache('v2:products:*'),
      redis?.del(`v2:product:${id}`),
      redis?.del('v2:featured_products')
    ]);

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    console.error('[PUT /product/:id]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Invalidate caches
    await Promise.all([
      invalidateCache('v2:products:*'),
      redis?.del(`v2:product:${id}`),
      redis?.del('v2:featured_products')
    ]);

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    console.error('[DELETE /product/:id]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}