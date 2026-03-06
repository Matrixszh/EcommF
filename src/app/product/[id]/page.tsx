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
  const cacheKey = `product:${id}`;
  
  return getOrSetCache(cacheKey, async () => {
    try {
      // Validate ObjectId format to prevent CastError
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        console.error(`Invalid product ID format: ${id}`);
        return null;
      }
      
      await dbConnect();
      const product = await Product.findById(id).lean();
      
      if (!product) {
        console.warn(`Product not found in DB: ${id}`);
        return null;
      }
      
      return JSON.parse(JSON.stringify(product));
    } catch (error) {
      console.error("Error fetching product:", error);
      // In case of DB error, return null to show 404 or let it bubble up
      // We choose to return null here to be safe and avoid 500
      return null;
    }
  });
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const product = await getProduct(resolvedParams.id);

  if (!product) {
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
