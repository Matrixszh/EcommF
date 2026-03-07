import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import AddToCartButton from "@/components/AddToCartButton";
import { getOrSetCache } from "@/lib/redis";
import { isValidImageUrl } from "@/lib/utils";
import { notFound } from "next/navigation";

// Enable ISR with 60-second revalidation
export const revalidate = 60;

async function getProduct(id: string) {
  // Use v2 prefix to invalidate old cache and ensure clean state
  const cacheKey = `v2:product:${id}`;
  
  return getOrSetCache(cacheKey, async () => {
    try {
      console.log(`[ProductPage] Fetching product from DB: ${id}`);
      // Validate ObjectId format to prevent CastError
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        console.error(`[ProductPage] Invalid product ID format: ${id}`);
        return null;
      }

      // Check for mock data first if it's a known mock ID
      const mockProducts: any = [
        {
          _id: "000000000000000000000001",
          name: "Wireless Headphones",
          description: "Premium noise-canceling headphones for immersive audio.",
          price: 299.99,
          images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80"],
          category: "electronics",
          rating: 4.8,
          stock: 10
        },
        {
          _id: "000000000000000000000002",
          name: "Smart Watch Series 5",
          description: "Stay connected and track your health with style.",
          price: 399.00,
          images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"],
          category: "electronics",
          rating: 4.5,
          stock: 5
        },
        {
          _id: "000000000000000000000003",
          name: "Ergonomic Chair",
          description: "Designed for comfort during long work hours.",
          price: 199.50,
          images: ["https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800&q=80"],
          category: "furniture",
          rating: 4.7,
          stock: 0
        },
        {
          _id: "000000000000000000000004",
          name: "Running Shoes",
          description: "Lightweight and durable for your daily runs.",
          price: 129.99,
          images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"],
          category: "sports",
          rating: 4.6,
          stock: 15
        }
      ];

      const mockProduct = mockProducts.find((p: any) => p._id === id);

      try {
        await dbConnect();
        const product = await Product.findById(id).lean();

        if (product) {
          console.log(`[ProductPage] Product found in DB: ${id}`);
          return JSON.parse(JSON.stringify(product));
        }
      } catch (dbError) {
        console.error(`[ProductPage] Database error for ID: ${id}`, dbError);
        // Fall through to mock check
      }

      if (mockProduct) {
        console.log(`[ProductPage] Returning mock product for ID: ${id}`);
        return mockProduct;
      }

      console.warn(`[ProductPage] Product not found in DB or mock for ID: ${id}`);
      return null;
    } catch (error) {
      console.error(`[ProductPage] Error fetching product ${id}:`, error);
      // In case of DB error, return null to show 404 or let it bubble up
      // We choose to return null here to be safe and avoid 500
      return null;
    }
  });
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  console.log(`[ProductPage] Rendering page for ID: ${resolvedParams.id}`);
  const product = await getProduct(resolvedParams.id);

  if (!product) {
    console.warn(`[ProductPage] Product is null for ID: ${resolvedParams.id}, triggering notFound()`);
    notFound();
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-10">
      <Link 
        href="/products" 
        className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-900 mb-8"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to products
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={isValidImageUrl(product.images[0]) ? product.images[0] : "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-2">
            <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 capitalize">
              {product.category}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{product.name}</h1>
          
          <div className="flex items-center mb-6">
            <div className="flex text-yellow-400 mr-2">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`h-5 w-5 ${i < Math.floor(product.rating || 0) ? 'fill-current' : 'text-zinc-300 dark:text-zinc-600'}`} 
                />
              ))}
            </div>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              ({product.rating || 0} rating)
            </span>
          </div>

          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-6">
            ${product.price.toFixed(2)}
          </p>

          <div className="prose prose-zinc dark:prose-invert mb-8">
            <p>{product.description}</p>
          </div>

          <div className="mt-auto">
            <div className="flex items-center gap-4 mb-4">
              <span className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
            
            <AddToCartButton product={product} disabled={product.stock <= 0} />
          </div>
        </div>
      </div>
    </div>
  );
}
