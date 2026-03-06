import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ScrollReveal from "@/components/ScrollReveal";
import { ArrowRight } from "lucide-react";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getOrSetCache } from "@/lib/redis";

export const dynamic = 'force-dynamic';
// Enable ISR with 60-second revalidation
export const revalidate = 60;

async function getFeaturedProducts() {
  // Use v2 prefix
  const cacheKey = 'v2:featured_products';
  
  // Use Redis cache wrapper
  return getOrSetCache(cacheKey, async () => {
    try {
      await dbConnect();
      
      // Fetch 6 latest products
      const products = await Product.find({})
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();

      console.log(`[HomePage] Fetched ${products.length} featured products`);
      
      // Validate IDs
      const validProducts = products.filter(p => p._id);

      // Serialize to plain JSON (handles ObjectId and Date)
      return JSON.parse(JSON.stringify(validProducts));
    } catch (error) {
      console.error("Error fetching products from DB:", error);
      // Return mock data if DB connection fails
      return [
        {
          _id: "1",
          name: "Wireless Headphones",
          description: "Premium noise-canceling headphones for immersive audio.",
          price: 299.99,
          images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80"],
          category: "electronics",
          rating: 4.8
        },
        {
          _id: "2",
          name: "Smart Watch Series 5",
          description: "Stay connected and track your health with style.",
          price: 399.00,
          images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"],
          category: "electronics",
          rating: 4.5
        },
        {
          _id: "3",
          name: "Ergonomic Chair",
          description: "Designed for comfort during long work hours.",
          price: 199.50,
          images: ["https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800&q=80"],
          category: "furniture",
          rating: 4.7
        },
        {
          _id: "4",
          name: "Running Shoes",
          description: "Lightweight and durable for your daily runs.",
          price: 129.99,
          images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"],
          category: "sports",
          rating: 4.6
        }
      ];
    }
  });
}

export default async function Home() {
  const products = await getFeaturedProducts();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-zinc-900 text-white py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 " />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=1600&q=80')] bg-cover bg-center opacity-70" />
        
        <div className="container relative z-10 mx-auto px-4 md:px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Discover Premium Quality <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-cyan-200">
              For Your Lifestyle
            </span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-200 max-w-2xl mx-auto mb-10">
            Shop the latest trends in electronics, fashion, and home decor with our curated collection of high-quality products.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/products" 
              className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-indigo-600 bg-white rounded-full hover:bg-zinc-100 transition-colors shadow-lg"
            >
              Shop Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="/about" 
              className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white border border-white/30 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6 py-16 text-center">
        <ScrollReveal
          baseOpacity={0.1}
          enableBlur
          baseRotation={3}
          blurStrength={4}
          containerClassName="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight"
        >
          When does a man die? When he is hit by a bullet? No! When he suffers a disease? No! When he ate a soup made out of a poisonous mushroom? No! A man dies when he is forgotten!
        </ScrollReveal>
      </section>

      {/* Featured Products */}
      <section className="py-16 md:py-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">Featured Products</h2>
              <p className="text-zinc-500 dark:text-zinc-400">Handpicked selections just for you.</p>
            </div>
            <Link 
              href="/products" 
              className="hidden md:flex items-center text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View all products <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product: any) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>

          <div className="mt-10 text-center md:hidden">
            <Link 
              href="/products" 
              className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View all products <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-bold tracking-tight mb-10 text-center">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Electronics', 'Clothing', 'Home', 'Sports'].map((category) => (
              <Link 
                key={category}
                href={`/products?category=${category.toLowerCase()}`}
                className="group relative flex items-center justify-center h-40 bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-hidden hover:shadow-md transition-all"
              >
                <span className="relative z-10 text-xl font-bold group-hover:scale-110 transition-transform">
                  {category}
                </span>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
