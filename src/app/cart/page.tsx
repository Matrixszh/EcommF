"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, totalItems } = useCart();
  const { user } = useAuth();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 md:py-24 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-4">Your cart is empty</h1>
        <p className="text-zinc-500 mb-8 max-w-md mx-auto">
          Looks like you haven&apos;t added anything to your cart yet. Explore our products and find something you love!
        </p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-8 py-3 text-base font-medium text-white shadow-lg hover:bg-indigo-700 transition-all"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.product._id}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800"
            >
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border bg-zinc-100 dark:bg-zinc-800">
                <Image
                  src={item.product.images[0] || "/placeholder.svg"}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/product/${item.product._id}`}
                  className="text-base font-medium hover:underline line-clamp-1"
                >
                  {item.product.name}
                </Link>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 capitalize">
                  {item.product.category}
                </p>
                <p className="mt-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  ${item.product.price.toFixed(2)}
                </p>
              </div>

              <div className="flex items-center gap-4 mt-4 sm:mt-0">
                <div className="flex items-center rounded-md border dark:border-zinc-700">
                  <button
                    onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.product._id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-md dark:hover:bg-red-900/20 transition-colors"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Subtotal ({totalItems} items)</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Shipping</span>
                <span className="font-medium">Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Tax</span>
                <span className="font-medium">$0.00</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-base">
                <span>Total</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6">
              {user ? (
                <Link
                  href="/checkout"
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 transition-all"
                >
                  Proceed to Checkout
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <div className="space-y-3">
                  <Link
                    href="/login?redirect=/checkout"
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 transition-all"
                  >
                    Login to Checkout
                  </Link>
                  <p className="text-xs text-center text-zinc-500">
                    You need to be logged in to complete your purchase.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
