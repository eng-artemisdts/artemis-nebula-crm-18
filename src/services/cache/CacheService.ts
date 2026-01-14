export interface ICacheService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  remove(key: string): void;
  clear(): void;
  has(key: string): boolean;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheService implements ICacheService {
  private readonly storage: Storage;
  private readonly defaultTTL: number;

  constructor(storage: Storage = localStorage, defaultTTL: number = 24 * 60 * 60 * 1000) {
    this.storage = storage;
    this.defaultTTL = defaultTTL;
  }

  get<T>(key: string): T | null {
    try {
      const item = this.storage.getItem(key);
      if (!item) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(item);
      const now = Date.now();

      if (now > entry.expiresAt) {
        this.remove(key);
        return null;
      }

      return entry.value;
    } catch (error) {
      console.error(`Erro ao ler cache para chave ${key}:`, error);
      this.remove(key);
      return null;
    }
  }

  set<T>(key: string, value: T, ttl?: number): void {
    try {
      const expiresAt = Date.now() + (ttl || this.defaultTTL);
      const entry: CacheEntry<T> = {
        value,
        expiresAt,
      };

      this.storage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error(`Erro ao salvar cache para chave ${key}:`, error);
    }
  }

  remove(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      console.error(`Erro ao remover cache para chave ${key}:`, error);
    }
  }

  clear(): void {
    try {
      this.storage.clear();
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }

  has(key: string): boolean {
    const item = this.storage.getItem(key);
    if (!item) {
      return false;
    }

    try {
      const entry: CacheEntry<unknown> = JSON.parse(item);
      const now = Date.now();

      if (now > entry.expiresAt) {
        this.remove(key);
        return false;
      }

      return true;
    } catch {
      this.remove(key);
      return false;
    }
  }
}

export const cacheService = new CacheService();





