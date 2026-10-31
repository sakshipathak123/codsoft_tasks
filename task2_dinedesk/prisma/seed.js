const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const db = new PrismaClient();
(async () => {
  const password = await bcrypt.hash('password123', 10);
  for (const [name, email, role] of [['Admin', 'admin@dine.com', 'ADMIN'], ['Chef Ravi', 'kitchen@dine.com', 'KITCHEN'], ['Asha', 'customer@dine.com', 'CUSTOMER']])
    await db.user.upsert({ where: { email }, update: {}, create: { name, email, password, role } });
  if (!(await db.menuItem.count())) await db.menuItem.createMany({ data: [
    { name: 'Paneer Tikka', description: 'Charred cottage cheese, mint chutney', category: 'Starters', price: 260 },
    { name: 'Veg Spring Rolls', description: 'Crisp rolls with sweet chilli dip', category: 'Starters', price: 180 },
    { name: 'Butter Chicken', description: 'Creamy tomato gravy, served with naan', category: 'Mains', price: 380 },
    { name: 'Dal Makhani', description: 'Slow-cooked black lentils', category: 'Mains', price: 280 },
    { name: 'Gulab Jamun', description: 'Two warm dumplings in syrup', category: 'Desserts', price: 120 },
    { name: 'Masala Chai', description: 'Ginger and cardamom', category: 'Drinks', price: 60 } ] });
  if (!(await db.diningTable.count())) await db.diningTable.createMany({ data: [
    { number: 1, seats: 2 }, { number: 2, seats: 2 }, { number: 3, seats: 4 }, { number: 4, seats: 6 } ] });
  console.log('Seeded. Logins: admin@dine.com / kitchen@dine.com / customer@dine.com, password: password123');
})().finally(() => db.$disconnect());
