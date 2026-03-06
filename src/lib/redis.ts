// Redis functionality has been removed as per user request.
// This file is kept to maintain import compatibility, but all functions are now no-ops.

const redis = null;
export default redis;

// Helper to invalidate cache patterns - No-op
export async function invalidateCache(pattern: string) {
  // No-op
  return;
}

// Pass-through wrapper that executes fetcher directly without caching
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 60
): Promise<T> {
  // Direct execution without caching
  return fetcher();
}
