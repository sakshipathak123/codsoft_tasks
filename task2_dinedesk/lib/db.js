import { PrismaClient } from '@prisma/client';
const g = globalThis;
export const db = g.prisma || (g.prisma = new PrismaClient());
