"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { IProduct } from "@/models/Product";

export interface CartItem {
  product: {
    _id: string;
    name: string;
    price: number;
    images: string[];
    description: string;
    category: string;
    stock: number;
  };
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: any) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isOpen: boolean;
  toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart from localStorage", e);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const addItem = (product: any) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      const currentQty = existing ? existing.quantity : 0;
      const maxStock = product.stock !== undefined ? product.stock : Infinity; // Fallback if stock not provided

      if (currentQty + 1 > maxStock) {
        alert(`Cannot add more. Only ${maxStock} in stock.`);
        return prev;
      }

      if (existing) {
        return prev.map((item) =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsOpen(true); // Open cart when adding item
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(productId);
      return;
    }
    
    setItems((prev) => {
      const item = prev.find(i => i.product._id === productId);
      if (item && item.product.stock !== undefined && quantity > item.product.stock) {
         alert(`Cannot add more. Only ${item.product.stock} in stock.`);
         return prev; // Don't update
      }
      
      return prev.map((item) =>
        item.product._id === productId ? { ...item, quantity } : item
      );
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  const toggleCart = () => setIsOpen((prev) => !prev);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        isOpen,
        toggleCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
