"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Package, Truck, CheckCircle, Clock, XCircle } from "lucide-react";

interface OrderProduct {
  productId: {
    name: string;
    images: string[];
  };
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  orderId: string;
  shippingAddress: {
    name: string;
    city: string;
  };
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  products: OrderProduct[];
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500",
  shipped: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-500",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500",
};

const statusIcons = {
  pending: Clock,
  processing: Loader2,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

export default function AdminOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/orders", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-uid": user.uid,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await res.json();
      if (data.success) {
        setOrders(orders.map(order => 
          order._id === orderId ? { ...order, status: newStatus as any } : order
        ));
      } else {
        alert("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status", error);
      alert("An error occurred");
    }
  };

  if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-6">
        Orders
      </h1>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Order ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-zinc-500">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const StatusIcon = statusIcons[order.status];
                return (
                  <tr key={order._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      #{order.orderId.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                      <div>{order.shippingAddress.name}</div>
                      <div className="text-xs text-zinc-400">{order.shippingAddress.city}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                      ${order.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order._id, e.target.value)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold border-0 cursor-pointer focus:ring-2 focus:ring-indigo-500 ${statusColors[order.status]}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
