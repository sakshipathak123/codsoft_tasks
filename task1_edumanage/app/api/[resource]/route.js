import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';

const MODEL = { students: 'student', attendance: 'attendance', marks: 'mark', fees: 'fee' };
const WRITE = { students: ['ADMIN'], fees: ['ADMIN'], attendance: ['ADMIN', 'TEACHER'], marks: ['ADMIN', 'TEACHER'] };
const INT = ['studentId', 'score', 'max', 'amount'];
const DATE = ['date', 'dueDate'];
const BOOL = ['present', 'paid'];
const err = (m, s) => NextResponse.json({ error: m }, { status: s });

async function ctx(params) {
  const u = getUser();
  const m = MODEL[params.resource];
  return !u ? { e: err('Please sign in.', 401) } : !m ? { e: err('Not found.', 404) } : { u, m, r: params.resource };
}

export async function GET(_, { params }) {
  const { e, u, m, r } = await ctx(params);
  if (e) return e;
  let where = {};
  if (u.role === 'STUDENT') {
    const s = await db.student.findUnique({ where: { userId: u.id } });
    where = r === 'students' ? { userId: u.id } : { studentId: s?.id ?? -1 };
  }
  const include = r === 'students' ? { user: { select: { name: true, email: true } } }
    : { student: { include: { user: { select: { name: true } } } } };
  return NextResponse.json(await db[m].findMany({ where, include, orderBy: { id: 'desc' } }));
}

export async function POST(req, { params }) {
  const { e, u, m, r } = await ctx(params);
  if (e) return e;
  if (!WRITE[r].includes(u.role)) return err('You do not have permission to add this.', 403);
  const b = await req.json();
  try {
    if (r === 'students') {
      const password = await bcrypt.hash(String(b.password || ''), 10);
      const row = await db.student.create({ data: { rollNo: b.rollNo, course: b.course,
        user: { create: { name: b.name, email: b.email, password, role: 'STUDENT' } } } });
      return NextResponse.json(row);
    }
    const data = {};
    for (const [k, v] of Object.entries(b))
      data[k] = INT.includes(k) ? Number(v) : DATE.includes(k) ? new Date(v) : BOOL.includes(k) ? v === 'true' : v;
    return NextResponse.json(await db[m].create({ data }));
  } catch {
    return err('Could not save. Check the values (email and roll number must be unique, student ID must exist).', 400);
  }
}

export async function DELETE(req, { params }) {
  const { e, u, m, r } = await ctx(params);
  if (e) return e;
  if (!WRITE[r].includes(u.role)) return err('You do not have permission to delete this.', 403);
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (r === 'students') {
    const s = await db.student.findUnique({ where: { id } });
    if (s) await db.user.delete({ where: { id: s.userId } });
  } else await db[m].delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
