"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ErrorPage] Runtime error caught:`, error);
    if (error.stack) {
        console.error(`[${timestamp}] [ErrorPage] Stack:`, error.stack);
    }
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4">
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-6">
        <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Something went wrong!</h2>
      <p className="text-zinc-500 mb-8 max-w-md">
        We encountered an unexpected error while loading this page.
      </p>
      
      <div className="mb-8 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-left text-xs font-mono text-zinc-500 w-full max-w-lg overflow-auto max-h-48">
        <p className="font-bold mb-2">Error Details:</p>
        <p className="text-red-600 dark:text-red-400">{error.message}</p>
        {error.digest && <p className="mt-1">Digest: {error.digest}</p>}
        {process.env.NODE_ENV === 'development' && error.stack && (
            <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={
            // Attempt to recover by trying to re-render the segment
            () => reset()
          }
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
