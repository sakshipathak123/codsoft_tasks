const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const db = new PrismaClient();
(async () => {
  const password = await bcrypt.hash('password123', 10);
  const make = (name, email, role) => db.user.upsert({ where: { email }, update: {}, create: { name, email, password, role } });
  await make('Admin', 'admin@market.com', 'ADMIN');
  await make('Deepak (delivery)', 'delivery@market.com', 'DELIVERY');
  await make('Asha', 'customer@market.com', 'CUSTOMER');
  const v1 = await make('Urban Threads', 'vendor1@market.com', 'VENDOR');
  const v2 = await make('Gadget Garage', 'vendor2@market.com', 'VENDOR');
  if (!(await db.product.count())) await db.product.createMany({ data: [
    { vendorId: v1.id, name: 'Cotton T-Shirt', category: 'Clothing', price: 499, stock: 50, promoPercent: 10, description: '100% cotton, regular fit' },
    { vendorId: v1.id, name: 'Denim Jacket', category: 'Clothing', price: 1999, stock: 15, description: 'Classic blue denim' },
    { vendorId: v2.id, name: 'Wireless Earbuds', category: 'Electronics', price: 1499, stock: 30, promoPercent: 20, description: '24h battery, Bluetooth 5.3' },
    { vendorId: v2.id, name: 'Power Bank 10000mAh', category: 'Electronics', price: 999, stock: 40, description: 'Fast charging, two ports' } ] });
  console.log('Seeded. Logins: admin@, delivery@, customer@, vendor1@, vendor2@market.com, password: password123');
})().finally(() => db.$disconnect());
