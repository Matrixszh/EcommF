"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/admin/stats", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [user]);

  if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Dashboard
      </h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Stat Cards */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Products</h3>
          <div className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.products}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Orders</h3>
          <div className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.orders}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Revenue</h3>
          <div className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            ${stats.revenue.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
