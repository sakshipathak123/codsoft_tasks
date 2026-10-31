'use client';
import { useState, useEffect, useCallback } from 'react';

const TABS = { CUSTOMER: ['menu', 'orders', 'reservations'], KITCHEN: ['orders'], ADMIN: ['menu', 'orders', 'reservations'] };
const LABEL = { menu: 'Menu', orders: 'Orders', reservations: 'Tables' };
const STEPS = ['PLACED', 'PREPARING', 'READY', 'COMPLETED'];
const api = (p, method = 'GET', body) => fetch(`/api/${p}`, { method, body: body && JSON.stringify(body) });
const field = 'rounded-md border border-stone-300 bg-white px-3 py-2';
const btn = 'rounded-md bg-orange-700 px-3 py-2 text-sm font-medium text-white';
const ghost = 'rounded-md border border-stone-300 px-3 py-2 text-sm';

export default function Dash({ user }) {
  const tabs = TABS[user.role];
  const [tab, setTab] = useState(tabs[0]);
  const [data, setData] = useState([]);
  const [cart, setCart] = useState({});
  const [pay, setPay] = useState(true);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const r = await api(tab);
    setData(r.ok ? await r.json() : []);
  }, [tab]);
  useEffect(() => {
    setMsg(''); load();
    const t = tab === 'orders' ? setInterval(load, 5000) : null;
    return () => t && clearInterval(t);
  }, [load, tab]);

  async function act(path, method, body, ok = '') {
    const r = await api(path, method, body);
    if (r.ok) { setMsg(ok); load(); return true; }
    setMsg((await r.json()).error); return false;
  }
  const form = (path, ok) => async (ev) => {
    ev.preventDefault();
    if (await act(path, 'POST', Object.fromEntries(new FormData(ev.target)), ok)) ev.target.reset();
  };
  const items = Object.entries(cart).filter(([, q]) => q > 0);
  const total = items.reduce((s, [id, q]) => s + q * data.find((m) => m.id == id).price, 0);
  async function order() {
    if (await act('orders', 'POST', { items: items.map(([id, qty]) => ({ menuItemId: +id, qty })), pay }, 'Order placed. Track it under Orders.')) setCart({});
  }
  const time = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <main className="mx-auto max-w-4xl p-4">
      <header className="flex items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold text-orange-700">DineDesk</h1>
        <span className="text-sm text-stone-600">{user.name} · {user.role.toLowerCase()}</span>
        <button className={ghost} onClick={async () => { await api('auth/logout', 'POST'); location.href = '/login'; }}>Sign out</button>
      </header>
      <nav className="my-4 flex gap-2">
        {tabs.map((t) => <button key={t} onClick={() => setTab(t)}
          className={`${ghost} ${t === tab ? 'bg-stone-900 text-white' : ''}`}>{LABEL[t]}</button>)}
      </nav>
      {msg && <p className="mb-3 rounded-md bg-orange-100 px-3 py-2 text-orange-900">{msg}</p>}

      {tab === 'menu' && <>
        {user.role === 'ADMIN' && (
          <form onSubmit={form('menu', 'Item added.')} className="mb-4 flex flex-wrap gap-2">
            <input className={field} name="name" placeholder="Name" required />
            <input className={field} name="category" placeholder="Category" required />
            <input className={field} name="description" placeholder="Description" />
            <input className={`${field} w-24`} name="price" type="number" min="1" placeholder="Price" required />
            <button className={btn}>Add item</button>
          </form>)}
        <div className="grid gap-3 sm:grid-cols-2">
          {data.filter((m) => m.available || user.role === 'ADMIN').map((m) => (
            <div key={m.id} className={`rounded-lg border border-stone-200 bg-white p-4 ${m.available ? '' : 'opacity-50'}`}>
              <p className="text-xs uppercase tracking-wide text-stone-500">{m.category}</p>
              <p className="font-semibold">{m.name} <span className="float-right">₹{m.price}</span></p>
              <p className="mb-3 text-sm text-stone-600">{m.description}</p>
              {user.role === 'CUSTOMER' ? (
                <div className="flex items-center gap-3">
                  <button className={ghost} onClick={() => setCart({ ...cart, [m.id]: Math.max(0, (cart[m.id] || 0) - 1) })}>−</button>
                  <span>{cart[m.id] || 0}</span>
                  <button className={ghost} onClick={() => setCart({ ...cart, [m.id]: (cart[m.id] || 0) + 1 })}>+</button>
                </div>
              ) : <button className={ghost} onClick={() => act(`menu?id=${m.id}`, 'PATCH', { available: !m.available })}>{m.available ? 'Hide from menu' : 'Show on menu'}</button>}
            </div>))}
        </div>
        {user.role === 'CUSTOMER' && items.length > 0 && (
          <div className="sticky bottom-3 mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-stone-900 p-4 text-white">
            <span className="flex-1">{items.length} item(s) · ₹{total}</span>
            <label className="text-sm"><input type="checkbox" checked={pay} onChange={(e) => setPay(e.target.checked)} /> Pay now (demo)</label>
            <button className={btn} onClick={order}>Place order</button>
          </div>)}
      </>}

      {tab === 'orders' && (
        <div className="grid gap-3">
          {!data.length && <p className="text-stone-600">No orders yet.</p>}
          {data.map((o) => (
            <div key={o.id} className="rounded-lg border border-stone-200 bg-white p-4">
              <p className="font-semibold">Order #{o.id} {user.role !== 'CUSTOMER' && `· ${o.user.name}`}
                <span className="float-right text-sm font-normal">{o.paid ? 'Paid' : 'Pay at table'} · ₹{o.items.reduce((s, i) => s + i.qty * i.price, 0)}</span></p>
              <p className="my-2 text-sm text-stone-600">{o.items.map((i) => `${i.qty} × ${i.menuItem.name}`).join(', ')}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {STEPS.map((s) => <span key={s} className={`rounded-full px-2 py-1 ${s === o.status ? 'bg-orange-700 text-white' : 'bg-stone-100'}`}>{s.toLowerCase()}</span>)}
                {user.role !== 'CUSTOMER' && o.status !== 'COMPLETED' && (
                  <button className={`${btn} ml-auto`} onClick={() => act(`orders?id=${o.id}`, 'PATCH', { status: STEPS[STEPS.indexOf(o.status) + 1] })}>
                    Mark {STEPS[STEPS.indexOf(o.status) + 1].toLowerCase()}</button>)}
              </div>
            </div>))}
        </div>)}

      {tab === 'reservations' && <>
        {user.role === 'CUSTOMER' && (
          <form onSubmit={form('reservations', 'Table booked.')} className="mb-4 flex flex-wrap gap-2">
            <input className={`${field} w-28`} name="guests" type="number" min="1" placeholder="Guests" required />
            <input className={field} name="time" type="datetime-local" required />
            <button className={btn}>Book a table</button>
          </form>)}
        <div className="grid gap-2">
          {!data.length && <p className="text-stone-600">No reservations yet.</p>}
          {data.map((r) => <p key={r.id} className="rounded-lg border border-stone-200 bg-white p-3">
            Table {r.table.number} · {r.guests} guests · {time(r.time)} {user.role !== 'CUSTOMER' && `· ${r.user.name}`}</p>)}
        </div>
      </>}
    </main>
  );
}
