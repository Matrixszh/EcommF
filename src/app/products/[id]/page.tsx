import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import AddToCartButton from "@/components/AddToCartButton";
import { getOrSetCache } from "@/lib/redis";
import { isValidImageUrl } from "@/lib/utils";
import { notFound } from "next/navigation";

// Enable ISR with 60-second revalidation
export const revalidate = 60;

async function getProduct(id: string, requestId: string) {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] [ProductPage] [${requestId}] getProduct called for ID: ${id}`);

  const cacheKey = `v2:product:${id}`;

  return getOrSetCache(cacheKey, async () => {
    try {
      console.log(`[${new Date().toISOString()}] [ProductPage] [${requestId}] Cache miss for ${id}, fetching from DB...`);
      
      // Validate ObjectId format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        console.error(`[${new Date().toISOString()}] [ProductPage] [${requestId}] Invalid product ID format: ${id}`);
        console.error(`[${new Date().toISOString()}] [ProductPage] [${requestId}] invalid_id_stack`, new Error("invalid_product_id").stack);
        return null;
      }

      console.log(`[${new Date().toISOString()}] [ProductPage] [${requestId}] Connecting to DB...`);
      await dbConnect();
      console.log(`[${new Date().toISOString()}] [ProductPage] [${requestId}] DB Connected.`);

      const product = await Product.findById(id).lean();

      if (!product) {
        console.warn(`[${new Date().toISOString()}] [ProductPage] [${requestId}] Product not found in DB: ${id}`);
        return null;
      }

      console.log(`[${new Date().toISOString()}] [ProductPage] [${requestId}] Product found in DB: ${id} (${Date.now() - startTime}ms)`);
      
      // Ensure strict serialization
      return JSON.parse(JSON.stringify(product));
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] [ProductPage] [${requestId}] Error fetching product ${id}:`, error);
      if (error.stack) console.error(error.stack);
      const message = `[${new Date().toISOString()}] [ProductPage] [${requestId}] getProduct_failed id=${id} message=${error?.message ?? String(error)}`;
      const err = new Error(message);
      (err as any).cause = error;
      throw err;
    }
  });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    console.log(`[${new Date().toISOString()}] [ProductPage] [${requestId}] Rendering page started for ID: ${id}`);

    if (!id) {
      console.error(`[${new Date().toISOString()}] [ProductPage] [${requestId}] ID is missing in params`);
      console.error(`[${new Date().toISOString()}] [ProductPage] [${requestId}] missing_id_not_found_stack`, new Error("missing_product_id_param").stack);
      notFound();
    }

    const product = await getProduct(id, requestId);

    if (!product) {
      console.warn(`[${new Date().toISOString()}] [ProductPage] [${requestId}] Product is null for ID: ${id}, triggering notFound()`);
      console.error(`[${new Date().toISOString()}] [ProductPage] [${requestId}] 404 Error Triggered for ID: ${id}`);
      console.error(`[${new Date().toISOString()}] [ProductPage] [${requestId}] not_found_stack`, new Error(`product_not_found:${id}`).stack);
      notFound();
    }

    console.log(`[${new Date().toISOString()}] [ProductPage] [${requestId}] Product loaded successfully: ${product.name}`);

    const imageSrc =
      product.images?.[0] && isValidImageUrl(product.images[0])
        ? product.images[0]
        : "/placeholder.svg";

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
              src={imageSrc}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
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

            {/* Rating */}
            <div className="flex items-center mb-6">
              <div className="flex text-yellow-400 mr-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(product.rating || 0)
                        ? "fill-current"
                        : "text-zinc-300 dark:text-zinc-600"
                    }`}
                  />
                ))}
              </div>

              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                ({product.rating || 0} rating)
              </span>
            </div>

            {/* Price */}
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-6">
              ${product.price.toFixed(2)}
            </p>

            {/* Description */}
            <div className="prose prose-zinc dark:prose-invert mb-8">
              <p>{product.description}</p>
            </div>

            {/* Stock + Cart */}
            <div className="mt-auto">
              <div className="flex items-center gap-4 mb-4">
                <span
                  className={`text-sm font-medium ${
                    product.stock > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {product.stock > 0 ? "In Stock" : "Out of Stock"}
                </span>
              </div>

              <AddToCartButton product={product} disabled={product.stock <= 0} />
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] [ProductPage] Critical error rendering page:`, error);
    if (error.message === "NEXT_NOT_FOUND") {
        throw error; // Re-throw 404s
    }
    // Let the Error Boundary catch it
    throw error;
  }
}
