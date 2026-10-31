import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export const sign = (u) =>
  jwt.sign({ id: u.id, role: u.role, name: u.name }, process.env.JWT_SECRET, { expiresIn: '7d' });

export function getUser() {
  try { return jwt.verify(cookies().get('token')?.value, process.env.JWT_SECRET); }
  catch { return null; }
}
