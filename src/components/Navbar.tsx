"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ShoppingCart, User, Menu, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const { totalItems } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md dark:bg-zinc-900/80 dark:border-zinc-800">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            E-Shop
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <ThemeToggle />
            <Link href="/products" className="text-sm font-medium hover:text-indigo-600 transition-colors">
              Products
            </Link>
            {role === 'admin' && (
              <Link href="/admin" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors font-bold">
                Admin Panel
              </Link>
            )}
            <Link href="/cart" className="relative group">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              )}
              <span className="sr-only">Cart</span>
            </Link>
            
            {user ? (
              <div className="flex items-center gap-4">
                <Link href="/profile" className="flex items-center gap-2 text-sm font-medium">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || "User"} className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="bg-zinc-100 p-1 rounded-full dark:bg-zinc-800">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                </Link>
                <button 
                  onClick={() => logout()}
                  className="text-sm font-medium text-red-500 hover:text-red-600"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2 text-sm font-medium hover:bg-zinc-100 transition-colors dark:hover:bg-zinc-800"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t p-4 space-y-4 bg-white dark:bg-zinc-900">
          <div className="flex justify-between items-center py-2">
             <span className="text-sm font-medium">Appearance</span>
             <ThemeToggle />
          </div>
          <Link 
            href="/products" 
            className="block text-sm font-medium hover:text-indigo-600"
            onClick={() => setIsMenuOpen(false)}
          >
            Products
          </Link>
          <Link 
            href="/cart" 
            className="flex items-center justify-between text-sm font-medium hover:text-indigo-600"
            onClick={() => setIsMenuOpen(false)}
          >
            <span>Cart</span>
            {totalItems > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>
          {role === 'admin' && (
             <Link 
               href="/admin" 
               className="block text-sm font-medium text-indigo-600 font-bold"
               onClick={() => setIsMenuOpen(false)}
             >
               Admin Panel
             </Link>
          )}

          {user ? (
            <div className="pt-4 border-t dark:border-zinc-800">
              <div className="flex items-center gap-3 mb-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="bg-zinc-100 p-1 rounded-full dark:bg-zinc-800">
                    <User className="h-5 w-5" />
                  </div>
                )}
                <span className="text-sm font-medium">{user.displayName || user.email}</span>
              </div>
              <Link 
                href="/profile"
                className="block text-sm font-medium mb-3 hover:text-indigo-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Profile
              </Link>
              <button 
                onClick={() => {
                  logout();
                  setIsMenuOpen(false);
                }}
                className="text-sm font-medium text-red-500 hover:text-red-600"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-4 border-t dark:border-zinc-800">
              <Link
                href="/login"
                className="text-sm font-medium hover:text-indigo-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium text-indigo-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
