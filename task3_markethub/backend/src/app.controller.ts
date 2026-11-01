import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as bcrypt from 'bcryptjs';
import { Roles } from './auth';
import { Cache, Db } from './services';

const COMMISSION = 0.1; // the platform keeps 10% of every sale
const finalPrice = (p: { price: number; promoPercent: number }) => Math.round((p.price * (100 - p.promoPercent)) / 100);

@Controller()
export class AppController {
  private s3 = new S3Client({ region: process.env.S3_REGION });
  constructor(private db: Db, private cache: Cache, private jwt: JwtService) {}

  // ---------- auth ----------
  @Post('auth/register')
  async register(@Body() b: any) {
    if (!b.name || !b.email || String(b.password).length < 6) throw new BadRequestException('Enter your name, email and a password of 6+ characters.');
    if (await this.db.user.findUnique({ where: { email: b.email } })) throw new BadRequestException('That email is already registered.');
    const role = b.role === 'VENDOR' ? 'VENDOR' : 'CUSTOMER';
    return this.token(await this.db.user.create({ data: { name: b.name, email: b.email, role, password: await bcrypt.hash(b.password, 10) } }));
  }
  @Post('auth/login')
  async login(@Body() b: any) {
    const u = await this.db.user.findUnique({ where: { email: String(b.email) } });
    if (!u || !(await bcrypt.compare(String(b.password), u.password))) throw new BadRequestException('Email or password is incorrect.');
    return this.token(u);
  }
  private token = (u: any) => ({ token: this.jwt.sign({ id: u.id, role: u.role, name: u.name }), role: u.role, name: u.name });

  // ---------- public catalogue ----------
  @Get('products')
  async products(@Query('q') q = '') {
    const key = `products:${q.toLowerCase()}`;
    const hit = await this.cache.get(key);
    if (hit) return hit;
    const rows = await this.db.product.findMany({
      where: { stock: { gt: 0 }, ...(q && { name: { contains: q, mode: 'insensitive' } }) },
      include: { vendor: { select: { name: true } } }, orderBy: { id: 'desc' } });
    const out = rows.map((p) => ({ ...p, finalPrice: finalPrice(p) }));
    await this.cache.set(key, out);
    return out;
  }

  // ---------- customer ----------
  @Post('orders') @Roles('CUSTOMER')
  async placeOrder(@Req() req: any, @Body() b: any) {
    const items: { productId: number; qty: number }[] = b.items || [];
    if (!items.length) throw new BadRequestException('Your cart is empty.');
    const order = await this.db.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
      let total = 0;
      const rows = [];
      for (const i of items) {
        const p = products.find((x) => x.id === i.productId);
        const qty = Math.max(1, Number(i.qty));
        // the stock >= qty condition makes two customers unable to buy the last unit at once
        const ok = p && (await tx.product.updateMany({ where: { id: p.id, stock: { gte: qty } }, data: { stock: { decrement: qty } } })).count;
        if (!ok) throw new BadRequestException(`${p?.name ?? 'An item'} is out of stock.`);
        const price = finalPrice(p);
        total += price * qty;
        rows.push({ productId: p.id, vendorId: p.vendorId, qty, price, commission: Math.round(price * qty * COMMISSION) });
      }
      return tx.order.create({ data: { customerId: req.user.id, total, paid: !!b.pay, items: { create: rows } } });
    });
    await this.clearCache();
    return order;
  }
  @Get('orders') @Roles('CUSTOMER')
  myOrders(@Req() req: any) {
    return this.db.order.findMany({ where: { customerId: req.user.id }, orderBy: { id: 'desc' },
      include: { items: { include: { product: true } } } });
  }

  // ---------- vendor ----------
  @Get('vendor/products') @Roles('VENDOR')
  vendorProducts(@Req() req: any) { return this.db.product.findMany({ where: { vendorId: req.user.id }, orderBy: { id: 'desc' } }); }

  @Post('vendor/products') @Roles('VENDOR')
  async addProduct(@Req() req: any, @Body() b: any) {
    const p = await this.db.product.create({ data: { vendorId: req.user.id, name: b.name, category: b.category, description: b.description || '',
      price: Number(b.price), stock: Number(b.stock), promoPercent: Number(b.promoPercent || 0), imageUrl: b.imageUrl || null } });
    await this.clearCache();
    return p;
  }
  @Patch('vendor/products/:id') @Roles('VENDOR')
  async editProduct(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() b: any) {
    const data: any = {};
    for (const k of ['price', 'stock', 'promoPercent']) if (b[k] !== undefined) data[k] = Number(b[k]);
    const r = await this.db.product.updateMany({ where: { id, vendorId: req.user.id }, data }); // only your own products
    await this.clearCache();
    return r;
  }
  @Get('vendor/orders') @Roles('VENDOR')
  async vendorOrders(@Req() req: any) {
    const items = await this.db.orderItem.findMany({ where: { vendorId: req.user.id }, orderBy: { id: 'desc' },
      include: { product: true, order: { include: { customer: { select: { name: true } } } } } });
    return { items, earnings: items.reduce((s, i) => s + i.price * i.qty - i.commission, 0) };
  }
  @Patch('vendor/items/:id/ship') @Roles('VENDOR')
  ship(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.db.orderItem.updateMany({ where: { id, vendorId: req.user.id, status: 'PLACED' }, data: { status: 'SHIPPED' } });
  }
  @Post('uploads/presign') @Roles('VENDOR')
  async presign(@Body() b: any) {
    if (!process.env.S3_BUCKET) throw new BadRequestException('Image upload is not set up. Add the S3 values to .env.');
    const key = `products/${Date.now()}-${String(b.filename).replace(/[^\w.-]/g, '')}`;
    const url = await getSignedUrl(this.s3, new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ContentType: b.type }), { expiresIn: 300 });
    return { url, publicUrl: `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}` };
  }

  // ---------- delivery partner ----------
  @Get('delivery/items') @Roles('DELIVERY')
  deliveryItems() {
    return this.db.orderItem.findMany({ where: { status: 'SHIPPED' }, include: { product: true, order: { include: { customer: { select: { name: true } } } } } });
  }
  @Patch('delivery/items/:id/deliver') @Roles('DELIVERY')
  deliver(@Param('id', ParseIntPipe) id: number) {
    return this.db.orderItem.updateMany({ where: { id, status: 'SHIPPED' }, data: { status: 'DELIVERED' } });
  }

  // ---------- admin ----------
  @Get('admin/stats') @Roles('ADMIN')
  async stats() {
    const items = await this.db.orderItem.findMany();
    const users = await this.db.user.groupBy({ by: ['role'], _count: true });
    return { sales: items.reduce((s, i) => s + i.price * i.qty, 0), commission: items.reduce((s, i) => s + i.commission, 0),
      orders: await this.db.order.count(), users: Object.fromEntries(users.map((u) => [u.role, u._count])) };
  }

  private async clearCache() { await this.cache.del('products:'); }
}
