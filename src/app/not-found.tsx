"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [NotFound] 404 Page rendered. Path: ${pathname}`);
    console.error(`[${timestamp}] [NotFound] 404 Error Event for Path: ${pathname}`);
  }, [pathname]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4">
      <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
      <p className="text-zinc-500 mb-8 max-w-md">
        Could not find the requested resource. The product might have been removed or the link is invalid.
      </p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/products"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          View All Products
        </Link>
      </div>
      <div className="mt-12 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-left text-xs font-mono text-zinc-500 w-full max-w-lg overflow-auto">
        <p>Debug Info:</p>
        <p>Path: {pathname}</p>
        <p>Time: {new Date().toISOString()}</p>
      </div>
    </div>
  );
}
