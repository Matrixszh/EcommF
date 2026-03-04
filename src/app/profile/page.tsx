"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, Calendar, MapPin, User as UserIcon, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface OrderProduct {
  productId: {
    _id: string;
    name: string;
    images: string[];
    price: number;
  };
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  orderId: string;
  createdAt: string;
  totalAmount: number;
  status: string;
  products: OrderProduct[];
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders", {
        headers: {
          "x-user-uid": user!.uid,
        },
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setLoadingOrders(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 md:px-6">
      <h1 className="text-3xl font-bold mb-8 text-zinc-900 dark:text-zinc-50">My Profile</h1>

      <div className="grid gap-8 md:grid-cols-3">
        {/* User Info Card */}
        <div className="md:col-span-1">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-full border-4 border-indigo-100 dark:border-indigo-900/30">
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                    <UserIcon className="h-10 w-10" />
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {user.displayName || "User"}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{user.email}</p>

              <div className="w-full space-y-4 text-left">
                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="md:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order History
              </h2>
            </div>
            
            <div className="p-6">
              {loadingOrders ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="h-12 w-12 text-zinc-300 mx-auto mb-3 dark:text-zinc-700" />
                  <p className="text-zinc-500 dark:text-zinc-400">No orders found.</p>
                  <Link 
                    href="/products" 
                    className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map((order) => (
                    <div 
                      key={order._id} 
                      className="rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium text-zinc-500 dark:text-zinc-400">
                              #{order.orderId || order._id.slice(-6).toUpperCase()}
                            </span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize
                              ${order.status === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                                order.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                order.status === 'shipped' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                order.status === 'processing' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">
                            {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-zinc-900 dark:text-zinc-50">
                            ${order.totalAmount.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {order.products.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-4 py-3">
                            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                              {item.productId?.images?.[0] ? (
                                <Image
                                  src={item.productId.images[0]}
                                  alt={item.productId.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="h-4 w-4 text-zinc-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {item.productId?.name || "Unknown Product"}
                              </p>
                              <p className="text-xs text-zinc-500">
                                Qty: {item.quantity} × ${item.price}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex items-start gap-2 rounded-md bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
                        <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Shipping Address</p>
                          <p>{order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p>
                          <p className="mt-1">Phone: {order.shippingAddress.phone}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
