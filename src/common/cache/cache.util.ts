import type { Cache } from 'cache-manager';

export async function cacheDel(cache: Cache, key: string): Promise<void> {
  const c: any = cache as any;
  if (typeof c.del === 'function') {
    await c.del(key);
    return;
  }
  if (typeof c.delete === 'function') {
    await c.delete(key);
    return;
  }
  if (c.store && typeof c.store.del === 'function') {
    await c.store.del(key);
    return;
  }
}
