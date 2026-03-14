import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import { checkAdmin } from '@/lib/auth-server';
import redis, { invalidateCache } from '@/lib/redis';

export const runtime = 'nodejs';

function getRequestId(request: Request) {
  return (
    request.headers.get('x-vercel-id') ||
    request.headers.get('x-request-id') ||
    request.headers.get('x-amzn-trace-id') ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function getLogPrefix(request: Request, requestId: string) {
  const url = new URL(request.url);
  return `[${new Date().toISOString()}] [API] [${requestId}] [${request.method}] ${url.pathname}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = getRequestId(request);
  const prefix = getLogPrefix(request, requestId);
  const url = new URL(request.url);

  try {
    const { id } = await params;
    console.log(
      `${prefix} start id=${id} query=${url.search || '(none)'} referer=${request.headers.get('referer') || '(none)'} ua=${request.headers.get('user-agent') || '(none)'}`
    );

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      console.warn(`${prefix} invalid_id id=${id}`);
      return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400 });
    }

    console.log(`${prefix} db_connect_start id=${id}`);
    await dbConnect();
    console.log(`${prefix} db_connect_ok id=${id}`);

    const product = await Product.findById(id).lean();
    
    if (!product) {
      console.warn(`${prefix} not_found id=${id} (${Date.now() - startTime}ms)`);
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    console.log(`${prefix} ok id=${id} (${Date.now() - startTime}ms)`);
    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    console.error(`${prefix} error_fetching_product (${Date.now() - startTime}ms)`, error);
    if (error?.stack) console.error(`${prefix} stack`, error.stack);
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
  const startTime = Date.now();
  const requestId = getRequestId(request);
  const prefix = getLogPrefix(request, requestId);

  try {
    console.log(`${prefix} start`);
    const { authorized, reason, user } = await checkAdmin(request);
    if (!authorized) {
      console.warn(`${prefix} unauthorized reason=${reason}`);
      return NextResponse.json({ success: false, error: reason }, { status: 401 });
    }
    console.log(`${prefix} admin_verified email=${(user as any)?.email || '(unknown)'}`);

    const { id } = await params;
    const body = await request.json();

    console.log(`${prefix} body_keys=${Object.keys(body || {}).join(',') || '(none)'}`);

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      console.warn(`${prefix} invalid_id id=${id}`);
      return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400 });
    }
    
    console.log(`${prefix} db_connect_start id=${id}`);
    await dbConnect();
    console.log(`${prefix} db_connect_ok id=${id}`);

    console.log(`${prefix} updating_product id=${id}`);
    const product = await Product.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      console.warn(`${prefix} not_found id=${id} (${Date.now() - startTime}ms)`);
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    console.log(`${prefix} invalidate_caches_start id=${id}`);
    await Promise.all([
      invalidateCache('v2:products:*'),
      redis?.del(`v2:product:${id}`).catch(err => console.error(`${prefix} redis_error_del v2:product:${id}`, err)),
      redis?.del('v2:featured_products').catch(err => console.error(`${prefix} redis_error_del v2:featured_products`, err))
    ]);

    console.log(`${prefix} ok id=${id} (${Date.now() - startTime}ms)`);
    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    console.error(`${prefix} error_updating_product (${Date.now() - startTime}ms)`, error);
    if (error?.stack) console.error(`${prefix} stack`, error.stack);
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
  const startTime = Date.now();
  const requestId = getRequestId(request);
  const prefix = getLogPrefix(request, requestId);

  try {
    console.log(`${prefix} start`);
    const { authorized, reason, user } = await checkAdmin(request);
    if (!authorized) {
      console.warn(`${prefix} unauthorized reason=${reason}`);
      return NextResponse.json({ success: false, error: reason }, { status: 401 });
    }
    console.log(`${prefix} admin_verified email=${(user as any)?.email || '(unknown)'}`);

    const { id } = await params;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      console.warn(`${prefix} invalid_id id=${id}`);
      return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400 });
    }
    
    console.log(`${prefix} db_connect_start id=${id}`);
    await dbConnect();
    console.log(`${prefix} db_connect_ok id=${id}`);

    console.log(`${prefix} deleting_product id=${id}`);
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      console.warn(`${prefix} not_found id=${id} (${Date.now() - startTime}ms)`);
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    console.log(`${prefix} invalidate_caches_start id=${id}`);
    await Promise.all([
      invalidateCache('v2:products:*'),
      redis?.del(`v2:product:${id}`).catch(err => console.error(`${prefix} redis_error_del v2:product:${id}`, err)),
      redis?.del('v2:featured_products').catch(err => console.error(`${prefix} redis_error_del v2:featured_products`, err))
    ]);

    console.log(`${prefix} ok id=${id} (${Date.now() - startTime}ms)`);
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    console.error(`${prefix} error_deleting_product (${Date.now() - startTime}ms)`, error);
    if (error?.stack) console.error(`${prefix} stack`, error.stack);
    return NextResponse.json({ 
      success: false, 
      error: error.message, 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
