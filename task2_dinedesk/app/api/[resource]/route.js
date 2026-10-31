import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';

const out = (b, s = 200) => NextResponse.json(b, { status: s });
const STATUS = ['PLACED', 'PREPARING', 'READY', 'COMPLETED'];
const STAFF = ['KITCHEN', 'ADMIN'];
const HOURS = 3600e3;

export async function GET(_, { params }) {
  const u = getUser();
  if (!u) return out({ error: 'Please sign in.' }, 401);
  const r = params.resource;
  const mine = u.role === 'CUSTOMER' ? { userId: u.id } : {};
  if (r === 'menu') return out(await db.menuItem.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] }));
  if (r === 'orders') return out(await db.order.findMany({ where: mine, orderBy: { id: 'desc' },
    include: { items: { include: { menuItem: true } }, user: { select: { name: true } } } }));
  if (r === 'reservations') return out(await db.reservation.findMany({ where: mine, orderBy: { time: 'asc' },
    include: { table: true, user: { select: { name: true } } } }));
  return out({ error: 'Not found.' }, 404);
}

export async function POST(req, { params }) {
  const u = getUser();
  if (!u) return out({ error: 'Please sign in.' }, 401);
  const b = await req.json();
  const r = params.resource;
  try {
    if (r === 'menu') {
      if (u.role !== 'ADMIN') return out({ error: 'Only admins can edit the menu.' }, 403);
      return out(await db.menuItem.create({ data: { name: b.name, category: b.category, description: b.description || '', price: Number(b.price) } }));
    }
    if (r === 'orders') {
      if (u.role !== 'CUSTOMER') return out({ error: 'Only customers can place orders.' }, 403);
      const ids = [...new Set(b.items.map((i) => i.menuItemId))];
      const menu = await db.menuItem.findMany({ where: { id: { in: ids }, available: true } });
      if (!ids.length || menu.length !== ids.length) return out({ error: 'Some items are unavailable.' }, 400);
      const price = Object.fromEntries(menu.map((m) => [m.id, m.price]));
      return out(await db.order.create({ data: { userId: u.id, paid: !!b.pay, items: { create:
        b.items.map((i) => ({ menuItemId: i.menuItemId, qty: Math.max(1, Number(i.qty)), price: price[i.menuItemId] })) } } }));
    }
    if (r === 'reservations') {
      if (u.role !== 'CUSTOMER') return out({ error: 'Only customers can reserve.' }, 403);
      const guests = Number(b.guests), time = new Date(b.time);
      if (!(guests > 0) || isNaN(time) || time < new Date()) return out({ error: 'Pick a future time and number of guests.' }, 400);
      const near = await db.reservation.findMany({ where: { time: { gt: new Date(time - 2 * HOURS), lt: new Date(+time + 2 * HOURS) } } });
      const table = await db.diningTable.findFirst({ where: { seats: { gte: guests }, id: { notIn: near.map((x) => x.tableId) } }, orderBy: { seats: 'asc' } });
      if (!table) return out({ error: 'No table is free at that time. Try another time.' }, 409);
      return out(await db.reservation.create({ data: { userId: u.id, tableId: table.id, guests, time } }));
    }
  } catch { return out({ error: 'Could not save. Please check the details.' }, 400); }
  return out({ error: 'Not found.' }, 404);
}

export async function PATCH(req, { params }) {
  const u = getUser();
  if (!u) return out({ error: 'Please sign in.' }, 401);
  const id = Number(new URL(req.url).searchParams.get('id'));
  const b = await req.json();
  if (params.resource === 'orders' && STAFF.includes(u.role) && STATUS.includes(b.status))
    return out(await db.order.update({ where: { id }, data: { status: b.status } }));
  if (params.resource === 'menu' && u.role === 'ADMIN')
    return out(await db.menuItem.update({ where: { id }, data: { available: !!b.available } }));
  return out({ error: 'You do not have permission to do that.' }, 403);
}
