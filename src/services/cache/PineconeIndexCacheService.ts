import { cacheService, ICacheService } from './CacheService';

export interface IPineconeIndexCacheService {
  isIndexCached(indexName: string): boolean;
  cacheIndex(indexName: string): void;
  invalidateIndex(indexName: string): void;
  clearAllIndexes(): void;
}

class PineconeIndexCacheService implements IPineconeIndexCacheService {
  private readonly cache: ICacheService;
  private readonly cachePrefix: string = 'pinecone_index_';
  private readonly cacheTTL: number = 7 * 24 * 60 * 60 * 1000;

  constructor(cache: ICacheService = cacheService) {
    this.cache = cache;
  }

  private getCacheKey(indexName: string): string {
    return `${this.cachePrefix}${indexName}`;
  }

  isIndexCached(indexName: string): boolean {
    const cacheKey = this.getCacheKey(indexName);
    return this.cache.has(cacheKey);
  }

  cacheIndex(indexName: string): void {
    const cacheKey = this.getCacheKey(indexName);
    this.cache.set(cacheKey, { indexName, cachedAt: Date.now() }, this.cacheTTL);
  }

  invalidateIndex(indexName: string): void {
    const cacheKey = this.getCacheKey(indexName);
    this.cache.remove(cacheKey);
  }

  clearAllIndexes(): void {
    const keysToRemove: string[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.cachePrefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => this.cache.remove(key));
    } catch (error) {
      console.error('Erro ao limpar cache de índices:', error);
    }
  }
}

export const pineconeIndexCacheService = new PineconeIndexCacheService();





