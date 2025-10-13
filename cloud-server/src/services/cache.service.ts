type TimestampMs = number

interface CacheEntry<V> {
  value: V
  expiresAt: TimestampMs | null
}

interface CacheOptions {
  maxItems?: number
  defaultTtlMs?: number
  sweepIntervalMs?: number
}

export class CacheService<K, V> {
  private static singleton: CacheService<any, any> | null = null

  private readonly store: Map<K, CacheEntry<V>>
  private readonly maxItems: number
  private readonly defaultTtlMs: number | null
  private readonly sweepIntervalMs: number
  private sweepTimer: NodeJS.Timeout | null

  private constructor(options?: CacheOptions) {
    this.store = new Map<K, CacheEntry<V>>()
    this.maxItems = Math.max(1, options?.maxItems ?? 1000)
    this.defaultTtlMs = options?.defaultTtlMs ?? null
    this.sweepIntervalMs = Math.max(1000, options?.sweepIntervalMs ?? 60_000)
    this.sweepTimer = null
    this.startSweeper()
  }

  public static getInstance<TK = string, TV = unknown>(options?: CacheOptions) {
    if (!CacheService.singleton) {
      CacheService.singleton = new CacheService<TK, TV>(options)
    }
    return CacheService.singleton as CacheService<TK, TV>
  }

  public get size(): number {
    return this.store.size
  }

  public has(key: K): boolean {
    const entry = this.store.get(key)
    if (!entry) return false
    if (this.isExpired(entry)) {
      this.store.delete(key)
      return false
    }
    return true
  }

  public get(key: K): V | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (this.isExpired(entry)) {
      this.store.delete(key)
      return undefined
    }
    this.store.delete(key)
    this.store.set(key, entry)
    return entry.value
  }

  public set(key: K, value: V, ttlMs?: number): void {
    const expiresAt = this.computeExpiry(ttlMs)
    const entry: CacheEntry<V> = { value, expiresAt }

    if (this.store.has(key)) {
      this.store.delete(key)
    }

    if (this.store.size >= this.maxItems) {
      this.evictOne()
    }

    this.store.set(key, entry)
  }

  public delete(key: K): boolean {
    return this.store.delete(key)
  }

  public clear(): void {
    this.store.clear()
  }

  public getOrSet(
    key: K,
    producer: () => V | Promise<V>,
    ttlMs?: number,
  ): Promise<V> | V {
    const existing = this.get(key)
    if (existing !== undefined) return existing
    const maybePromise = producer()
    if (maybePromise && typeof (maybePromise as any).then === 'function') {
      return (maybePromise as Promise<V>).then((val) => {
        this.set(key, val, ttlMs)
        return val
      })
    }
    const val = maybePromise as V
    this.set(key, val, ttlMs)
    return val
  }

  private computeExpiry(ttlMs?: number): TimestampMs | null {
    const effectiveTtl = ttlMs ?? this.defaultTtlMs
    if (effectiveTtl == null || effectiveTtl <= 0) return null
    return Date.now() + effectiveTtl
  }

  private isExpired(entry: CacheEntry<V>): boolean {
    return entry.expiresAt !== null && entry.expiresAt <= Date.now()
  }

  private evictOne(): void {
    for (const [key, entry] of this.store) {
      if (this.isExpired(entry)) {
        this.store.delete(key)
        return
      }
    }
    const firstKey = this.store.keys().next().value as K | undefined
    if (firstKey !== undefined) {
      this.store.delete(firstKey)
    }
  }

  private startSweeper(): void {
    if (this.sweepTimer) return
    this.sweepTimer = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.store) {
        if (entry.expiresAt !== null && entry.expiresAt <= now) {
          this.store.delete(key)
        }
      }
    }, this.sweepIntervalMs)
  }

  public stopSweeper(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer)
      this.sweepTimer = null
    }
  }
}

const DefaultCache = CacheService.getInstance<string, unknown>({
  maxItems: 2000,
  defaultTtlMs: 5 * 60_000,
  sweepIntervalMs: 60_000,
})

export default DefaultCache
