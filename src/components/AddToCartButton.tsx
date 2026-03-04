"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface AddToCartButtonProps {
  product: any;
  disabled?: boolean;
}

export default function AddToCartButton({ product, disabled }: AddToCartButtonProps) {
  const { addItem } = useCart();

  return (
    <button
      className="flex w-full md:w-auto items-center justify-center gap-2 rounded-full bg-indigo-600 px-8 py-3 text-base font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      disabled={disabled}
      onClick={() => addItem(product)}
    >
      <ShoppingCart className="h-5 w-5" />
      Add to Cart
    </button>
  );
}
