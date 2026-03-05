import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import { Search } from "lucide-react";
import { getOrSetCache } from "@/lib/redis";

// Enable ISR with 60-second revalidation (applies when no search params)
export const revalidate = 60;

async function getProducts(searchParams: { [key: string]: string | string[] | undefined }) {
  const category = searchParams.category as string;
  const search = searchParams.search as string;
  
  const cacheKey = `products:category=${category || 'all'}:search=${search || 'none'}`;

  return getOrSetCache(cacheKey, async () => {
    await dbConnect();
    
    const query: any = {};
    if (category) {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    try {
      const products = await Product.find(query).sort({ createdAt: -1 }).lean();
      return JSON.parse(JSON.stringify(products));
    } catch (error) {
      console.error("Error fetching products:", error);
      return [];
    }
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const products = await getProducts(resolvedSearchParams);
  const currentCategory = resolvedSearchParams.category as string;
  const currentSearch = resolvedSearchParams.search as string;

  return (
    <div className="container mx-auto px-4 md:px-6 py-10">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Search</h3>
            <form className="relative">
              <input
                type="text"
                name="search"
                defaultValue={currentSearch}
                placeholder="Search products..."
                className="w-full rounded-md border border-zinc-200 bg-white px-4 py-2 pl-10 text-sm outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            </form>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Categories</h3>
            <div className="space-y-2">
              <Link 
                href="/products"
                className={`block text-sm ${!currentCategory ? 'font-medium text-indigo-600' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'}`}
              >
                All Products
              </Link>
              {['Electronics', 'Clothing', 'Home', 'Sports', 'Furniture'].map((category) => (
                <Link
                  key={category}
                  href={`/products?category=${category.toLowerCase()}`}
                  className={`block text-sm ${currentCategory === category.toLowerCase() ? 'font-medium text-indigo-600' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'}`}
                >
                  {category}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">
              {currentCategory ? `${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)} Products` : 'All Products'}
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              Showing {products.length} results
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product: any) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg text-zinc-500 mb-4">No products found.</p>
              <Link 
                href="/products" 
                className="text-indigo-600 hover:underline"
              >
                Clear filters
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
