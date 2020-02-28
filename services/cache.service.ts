// npm
import * as Redis from 'async-redis';

export interface IRedisConfig {
  host: string;
  port: number;
}

export class CacheService {
  public static getInstance(config): CacheService {
    return this.instance || (this.instance = new this(config));
  }

  private static instance: CacheService;
  private redis: Redis;

  private constructor(private config: IRedisConfig) {
  }

  public async initialize() {
    try {
      this.redis = Redis.createClient(this.config);
    } catch (e) {
      throw new Error('Redis service error.');
    }
  }

  public async close() {
    this.redis.quit();
  }

  public async getCache(id: string): Promise<any> {
    const data = await this.redis.get(id);
    return data ? JSON.parse(data) : data;
  }

  public async setCache(id: string, data: string): Promise<any> {
    await this.redis.setnx(id, data);
    return this.redis.get(id);
  }

   public async deleteCache(id: string): Promise<string> {
    return this.redis.del(id);
  }


}


