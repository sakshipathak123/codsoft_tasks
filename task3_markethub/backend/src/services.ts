import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

@Injectable()
export class Db extends PrismaClient implements OnModuleInit {
  onModuleInit() { return this.$connect(); }
}

// Redis is optional: without REDIS_URL every call just does nothing and the API hits the database.
@Injectable()
export class Cache {
  private r = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
  async get(k: string) { return this.r ? JSON.parse((await this.r.get(k)) || 'null') : null; }
  async set(k: string, v: unknown, seconds = 30) { await this.r?.set(k, JSON.stringify(v), 'EX', seconds); }
  async del(k: string) { await this.r?.del(k); }
}
