import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { sign } from '@/lib/auth';

export async function POST(req) {
  const { email, password } = await req.json();
  const u = await db.user.findUnique({ where: { email: String(email) } });
  if (!u || !(await bcrypt.compare(String(password), u.password)))
    return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  const res = NextResponse.json({ role: u.role });
  res.cookies.set('token', sign(u), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 604800 });
  return res;
}
