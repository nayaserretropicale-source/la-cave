type Entry<T> = { value: T; expiresAt: number };

// ponytail: cache mémoire borné (LRU naïf) — passer à Vercel KV / unstable_cache
// si le taux de hit en serverless devient un vrai sujet.
const MAX_ENTRIES = 500;
const store = new Map<string, Entry<unknown>>();

export async function cached<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    // rafraîchit la position LRU
    store.delete(key);
    store.set(key, hit);
    return hit.value as T;
  }
  const value = await compute();
  if (store.size >= MAX_ENTRIES) {
    store.delete(store.keys().next().value!); // évince la plus ancienne
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}
