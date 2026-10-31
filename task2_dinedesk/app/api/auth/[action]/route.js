import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { sign } from '@/lib/auth';

const out = (b, s = 200) => NextResponse.json(b, { status: s });

export async function POST(req, { params }) {
  if (params.action === 'logout') {
    const r = out({ ok: true });
    r.cookies.set('token', '', { path: '/', maxAge: 0 });
    return r;
  }
  const { name, email, password } = await req.json();
  let u;
  if (params.action === 'register') {
    if (!name || !email || String(password).length < 6) return out({ error: 'Enter your name, email and a password of 6+ characters.' }, 400);
    if (await db.user.findUnique({ where: { email } })) return out({ error: 'That email is already registered.' }, 400);
    u = await db.user.create({ data: { name, email, password: await bcrypt.hash(password, 10), role: 'CUSTOMER' } });
  } else {
    u = await db.user.findUnique({ where: { email: String(email) } });
    if (!u || !(await bcrypt.compare(String(password), u.password))) return out({ error: 'Email or password is incorrect.' }, 401);
  }
  const r = out({ role: u.role });
  r.cookies.set('token', sign(u), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 604800 });
  return r;
}
