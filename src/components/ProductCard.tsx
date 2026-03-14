"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { isValidImageUrl } from "@/lib/utils";

interface ProductCardProps {
  product: {
    _id: string;
    name: string;
    description: string;
    price: number;
    images: string[];
    category: string;
    rating?: number;
    stock?: number;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  
  if (!product || !product._id) {
    console.error("[ProductCard] Product or _id missing:", product);
    return null;
  }

  const isOutOfStock = product.stock !== undefined && product.stock <= 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-all hover:shadow-md dark:bg-zinc-900 dark:border-zinc-800">
      <Link 
        href={`/products/${product._id}`} 
        className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800"
        onClick={() => {
          console.log(`[${new Date().toISOString()}] [ProductCard] Navigating to product: ${product._id} (${product.name})`);
        }}
      >
        <Image
          src={isValidImageUrl(product.images[0]) ? product.images[0] : "/placeholder.svg"}
          alt={product.name}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-lg px-4 py-2 bg-red-600 rounded-md transform -rotate-12">
              Out of Stock
            </span>
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <Link 
            href={`/products/${product._id}`} 
            className="text-lg font-semibold hover:underline line-clamp-1"
            onClick={() => {
              console.log(`[${new Date().toISOString()}] [ProductCard] Navigating to product: ${product._id} (${product.name})`);
            }}
          >
            {product.name}
          </Link>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 capitalize">
            {product.category}
          </span>
        </div>
        <p className="mb-4 text-sm text-zinc-500 line-clamp-2 dark:text-zinc-400">
          {product.description}
        </p>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            ${product.price.toFixed(2)}
          </span>
          <button
            disabled={isOutOfStock}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isOutOfStock 
                ? "bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600"
                : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 cursor-pointer"
            }`}
            onClick={(e) => {
              e.preventDefault();
              if (!isOutOfStock) {
                console.log(`[ProductCard] Adding to cart: ${product._id}`);
                addItem(product);
              }
            }}
          >
            <ShoppingCart className="h-4 w-4" />
            {isOutOfStock ? "Sold Out" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
