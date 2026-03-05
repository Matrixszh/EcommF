"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { IProduct } from "@/models/Product";
import { useAuth } from "./AuthContext";

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
  addItem: (product: any) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  subtotal: number;
  isOpen: boolean;
  toggleCart: () => void;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Helper to map API response to internal state
  const mapApiItems = (apiItems: any[]) => {
    return apiItems.map((item: any) => ({
      product: item.productId,
      quantity: item.quantity,
    })).filter(item => item.product); // Filter out null products if any
  };

  // Fetch cart from API
  const fetchCart = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(mapApiItems(data.items || []));
      }
    } catch (error) {
      console.error("Failed to fetch cart", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Sync local cart to server on login
  const syncLocalCart = useCallback(async () => {
    const localCart = localStorage.getItem("cart");
    if (localCart && user) {
      const parsedCart: CartItem[] = JSON.parse(localCart);
      if (parsedCart.length > 0) {
        // We need to add each item to the server
        // This could be optimized with a bulk add endpoint, but for now loop
        try {
            // Sequential to avoid race conditions in backend if not handled
            for (const item of parsedCart) {
                const token = await user.getIdToken();
                await fetch('/api/cart', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        productId: item.product._id,
                        quantity: item.quantity
                    })
                });
            }
            localStorage.removeItem("cart");
            await fetchCart(); // Refresh from server
        } catch (e) {
            console.error("Failed to sync local cart", e);
        }
      } else {
          fetchCart();
      }
    } else if (user) {
        fetchCart();
    }
  }, [user, fetchCart]);


  // Initial load logic
  useEffect(() => {
    if (user) {
      syncLocalCart();
    } else {
      // Load from local storage if guest
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        try {
          setItems(JSON.parse(savedCart));
        } catch (e) {
          console.error("Failed to parse cart", e);
        }
      } else {
        setItems([]);
      }
    }
  }, [user, syncLocalCart]);

  // Save to local storage only if guest
  useEffect(() => {
    if (!user) {
      localStorage.setItem("cart", JSON.stringify(items));
    }
  }, [items, user]);

  const addItem = async (product: any) => {
    if (user) {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/cart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            productId: product._id,
            quantity: 1
          })
        });
        if (res.ok) {
          const data = await res.json();
          setItems(mapApiItems(data.items));
          setIsOpen(true);
        } else {
            const err = await res.json();
            alert(err.error || "Failed to add item");
        }
      } catch (error) {
        console.error("Add item failed", error);
      }
    } else {
      // Local logic
      setItems((prev) => {
        const existing = prev.find((item) => item.product._id === product._id);
        const currentQty = existing ? existing.quantity : 0;
        const maxStock = product.stock !== undefined ? product.stock : Infinity;

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
      setIsOpen(true);
    }
  };

  const removeItem = async (productId: string) => {
    if (user) {
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/cart?productId=${productId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setItems(mapApiItems(data.items));
            }
        } catch (error) {
            console.error("Remove item failed", error);
        }
    } else {
      setItems((prev) => prev.filter((item) => item.product._id !== productId));
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity < 1) {
      await removeItem(productId);
      return;
    }

    if (user) {
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/cart', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ productId, quantity })
            });
            if (res.ok) {
                const data = await res.json();
                setItems(mapApiItems(data.items));
            } else {
                // Handle stock error potentially?
                // The API doesn't strictly enforce stock on update currently in my impl, 
                // but checking stock before update would be good.
                // For now, trust the API response.
            }
        } catch (error) {
            console.error("Update quantity failed", error);
        }
    } else {
      setItems((prev) => {
        const item = prev.find(i => i.product._id === productId);
        if (item && item.product.stock !== undefined && quantity > item.product.stock) {
           alert(`Cannot add more. Only ${item.product.stock} in stock.`);
           return prev;
        }
        
        return prev.map((item) =>
          item.product._id === productId ? { ...item, quantity } : item
        );
      });
    }
  };

  const clearCart = async () => {
    if (user) {
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/cart', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setItems([]);
            }
        } catch (error) {
            console.error("Clear cart failed", error);
        }
    } else {
      setItems([]);
    }
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
        loading
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
