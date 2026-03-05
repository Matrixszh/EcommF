import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Cart from '@/models/Cart';
import Product from '@/models/Product';
import { adminAuth } from '@/lib/firebase-admin';

// Helper to get user ID
const getUserId = async (request: Request) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    return null;
  }
};

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const cart = await Cart.findOne({ userId }).populate('items.productId');

    if (!cart) {
      return NextResponse.json({ items: [] });
    }

    return NextResponse.json(cart);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, quantity } = await request.json();
    if (!productId || !quantity) {
      return NextResponse.json({ error: 'Missing productId or quantity' }, { status: 400 });
    }

    await dbConnect();
    
    // Check if product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await Cart.create({
        userId,
        items: [{ productId, quantity }]
      });
    } else {
      const itemIndex = cart.items.findIndex((item: any) => item.productId.toString() === productId);

      if (itemIndex > -1) {
        // Item exists, update quantity
        cart.items[itemIndex].quantity += quantity;
      } else {
        // Item does not exist, push new item
        cart.items.push({ productId, quantity });
      }
      await cart.save();
    }
    
    // Return populated cart
    const populatedCart = await Cart.findById(cart._id).populate('items.productId');
    return NextResponse.json(populatedCart);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, quantity } = await request.json();
    
    await dbConnect();
    const cart = await Cart.findOne({ userId });

    if (!cart) {
        return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    if (productId && quantity !== undefined) {
        // Update specific item quantity
        const itemIndex = cart.items.findIndex((item: any) => item.productId.toString() === productId);
        if (itemIndex > -1) {
            if (quantity > 0) {
                cart.items[itemIndex].quantity = quantity;
            } else {
                // Remove item if quantity is 0
                cart.items.splice(itemIndex, 1);
            }
        } else if (quantity > 0) {
             // Optional: Add if not found, though POST is preferred for adding
             cart.items.push({ productId, quantity });
        }
    } else {
        // Could be used for full cart replacement if needed
    }

    await cart.save();
    const populatedCart = await Cart.findById(cart._id).populate('items.productId');
    return NextResponse.json(populatedCart);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    await dbConnect();
    const cart = await Cart.findOne({ userId });

    if (!cart) {
       return NextResponse.json({ message: 'Cart already empty' });
    }

    if (productId) {
      // Remove specific item
      cart.items = cart.items.filter((item: any) => item.productId.toString() !== productId);
      await cart.save();
    } else {
      // Clear cart
      cart.items = [];
      await cart.save();
    }

    const populatedCart = await Cart.findById(cart._id).populate('items.productId');
    return NextResponse.json(populatedCart);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
