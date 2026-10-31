const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const db = new PrismaClient();
(async () => {
  const password = await bcrypt.hash('password123', 10);
  await db.user.upsert({ where: { email: 'admin@edu.com' }, update: {}, create: { name: 'Admin', email: 'admin@edu.com', password, role: 'ADMIN' } });
  await db.user.upsert({ where: { email: 'teacher@edu.com' }, update: {}, create: { name: 'Ms. Rao', email: 'teacher@edu.com', password, role: 'TEACHER' } });
  for (const [i, n] of ['Aarav Singh', 'Diya Sharma'].entries()) {
    const email = `student${i + 1}@edu.com`;
    if (await db.user.findUnique({ where: { email } })) continue;
    const s = await db.student.create({ data: { rollNo: `R00${i + 1}`, course: 'B.Tech AI & DS', user: { create: { name: n, email, password, role: 'STUDENT' } } } });
    await db.attendance.create({ data: { studentId: s.id, date: new Date(), present: true } });
    await db.mark.create({ data: { studentId: s.id, subject: 'Maths', exam: 'Midterm', score: 78 + i * 6 } });
    await db.fee.create({ data: { studentId: s.id, amount: 45000, dueDate: new Date('2026-12-31'), paid: i === 0 } });
  }
  console.log('Seeded. Logins: admin@edu.com / teacher@edu.com / student1@edu.com, password: password123');
})().finally(() => db.$disconnect());
