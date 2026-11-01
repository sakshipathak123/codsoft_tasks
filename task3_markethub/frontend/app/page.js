'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const TABS = { CUSTOMER: ['shop', 'orders'], VENDOR: ['vendor'], DELIVERY: ['delivery'], ADMIN: ['admin'] };
const rs = (n) => `₹${n}`;

export default function Home() {
  const [auth, setAuth] = useState(null);
  const [tab, setTab] = useState('shop');
  useEffect(() => { try { const a = JSON.parse(localStorage.getItem('auth')); if (a) { setAuth(a); setTab(TABS[a.role][0]); } } catch {} }, []);

  async function call(path, method = 'GET', body) {
    const r = await fetch(API + path, { method, body: body && JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...(auth && { Authorization: `Bearer ${auth.token}` }) } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error([].concat(j.message || 'Something went wrong.')[0]);
    return j;
  }
  function save(a) {
    setAuth(a); setTab(a ? TABS[a.role][0] : 'shop');
    try { a ? localStorage.setItem('auth', JSON.stringify(a)) : localStorage.removeItem('auth'); } catch {}
  }
  const tabs = auth ? TABS[auth.role] : [];
  return (
    <main>
      <header>
        <h1>MarketHub</h1>
        {auth && <><span className="muted">{auth.name} · {auth.role.toLowerCase()}</span><button className="ghost" onClick={() => save(null)}>Sign out</button></>}
      </header>
      {auth && tabs.length > 1 && <nav>{tabs.map((t) => <button key={t} className={t === tab ? 'on' : 'ghost'} onClick={() => setTab(t)}>{t}</button>)}</nav>}
      {!auth && <Login call={call} onAuth={save} />}
      {(!auth || tab === 'shop') && <Shop call={call} canBuy={auth?.role === 'CUSTOMER'} />}
      {auth && tab === 'orders' && <Orders call={call} />}
      {auth && tab === 'vendor' && <Vendor call={call} />}
      {auth && tab === 'delivery' && <Delivery call={call} />}
      {auth && tab === 'admin' && <Admin call={call} />}
    </main>
  );
}

function Login({ call, onAuth }) {
  const [mode, setMode] = useState('login');
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    try { onAuth(await call(`/auth/${mode === 'login' ? 'login' : 'register'}`, 'POST', Object.fromEntries(new FormData(e.target)))); }
    catch (x) { setErr(x.message); }
  }
  return (
    <form onSubmit={submit} className="card row" style={{ margin: '1rem 0' }}>
      {mode !== 'login' && <input name="name" placeholder="Name" required />}
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      {mode !== 'login' && <select name="role"><option value="CUSTOMER">I want to shop</option><option value="VENDOR">I want to sell</option></select>}
      <button>{mode === 'login' ? 'Sign in' : 'Create account'}</button>
      <button type="button" className="ghost" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErr(''); }}>{mode === 'login' ? 'New here?' : 'Have an account?'}</button>
      {err && <span className="err">{err}</span>}
    </form>
  );
}

function Shop({ call, canBuy }) {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState('');
  const [cart, setCart] = useState({});
  const [cmp, setCmp] = useState([]);
  const [msg, setMsg] = useState('');
  const load = () => call(`/products?q=${encodeURIComponent(q)}`).then(setProducts).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);
  const lines = products.filter((p) => cart[p.id] > 0);
  const total = lines.reduce((s, p) => s + p.finalPrice * cart[p.id], 0);
  async function checkout() {
    try { await call('/orders', 'POST', { items: lines.map((p) => ({ productId: p.id, qty: cart[p.id] })), pay: true }); setCart({}); setMsg('Order placed. Track it under ORDERS.'); load(); }
    catch (e) { setMsg(e.message); }
  }
  const toggle = (id) => setCmp(cmp.includes(id) ? cmp.filter((x) => x !== id) : [...cmp, id].slice(-3));
  return <>
    <form className="row" onSubmit={(e) => { e.preventDefault(); load(); }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" /><button>Search</button>
    </form>
    {msg && <p className="msg">{msg}</p>}
    <div className="grid">{products.map((p) => (
      <div key={p.id} className="card">
        {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: '100%', borderRadius: 6 }} />}
        <p className="muted">{p.category} · sold by {p.vendor.name}</p>
        <strong>{p.name}</strong>
        <p>{p.promoPercent > 0 && <s>{rs(p.price)} </s>}{rs(p.finalPrice)} {p.promoPercent > 0 && <span className="muted">({p.promoPercent}% off)</span>}</p>
        <p className="muted">{p.stock} left</p>
        <label className="muted"><input type="checkbox" checked={cmp.includes(p.id)} onChange={() => toggle(p.id)} /> Compare</label>
        {canBuy && <div className="row"><button className="ghost" onClick={() => setCart({ ...cart, [p.id]: Math.max(0, (cart[p.id] || 0) - 1) })}>−</button>
          {cart[p.id] || 0}<button className="ghost" onClick={() => setCart({ ...cart, [p.id]: Math.min(p.stock, (cart[p.id] || 0) + 1) })}>+</button></div>}
      </div>))}</div>
    {cmp.length > 1 && <table><tbody>
      {[['Product', 'name'], ['Seller', 'vendor'], ['Price', 'finalPrice'], ['In stock', 'stock'], ['Category', 'category']].map(([label, k]) => (
        <tr key={k}><th>{label}</th>{cmp.map((id) => { const p = products.find((x) => x.id === id); return <td key={id}>{k === 'vendor' ? p.vendor.name : k === 'finalPrice' ? rs(p[k]) : p[k]}</td>; })}</tr>))}
    </tbody></table>}
    {canBuy && lines.length > 0 && <div className="card row" style={{ position: 'sticky', bottom: 8 }}>
      <span style={{ flex: 1 }}>{lines.length} item(s) · {rs(total)}</span><button onClick={checkout}>Pay {rs(total)} (demo)</button></div>}
    {!canBuy && <p className="muted">Sign in as a customer to order. Payment is simulated; no real gateway is connected.</p>}
  </>;
}

function Orders({ call }) {
  const [orders, setOrders] = useState([]);
  useEffect(() => { const f = () => call('/orders').then(setOrders).catch(() => {}); f(); const t = setInterval(f, 5000); return () => clearInterval(t); }, []);
  return <>{!orders.length && <p className="muted">No orders yet.</p>}{orders.map((o) => (
    <div key={o.id} className="card" style={{ marginBottom: 8 }}>
      <strong>Order #{o.id}</strong> · {rs(o.total)} · {o.paid ? 'Paid' : 'Unpaid'}
      {o.items.map((i) => <p key={i.id} className="muted">{i.qty} × {i.product.name} — <b>{i.status.toLowerCase()}</b></p>)}
    </div>))}</>;
}

function Vendor({ call }) {
  const [products, setProducts] = useState([]);
  const [data, setData] = useState({ items: [], earnings: 0 });
  const [msg, setMsg] = useState('');
  const load = () => { call('/vendor/products').then(setProducts); call('/vendor/orders').then(setData); };
  useEffect(() => { load(); }, []);
  async function add(e) {
    e.preventDefault();
    const f = new FormData(e.target); const body = Object.fromEntries(f); const file = f.get('image'); delete body.image;
    try {
      if (file && file.size) { // images go straight from the browser to S3 with a short-lived signed URL
        const s = await call('/uploads/presign', 'POST', { filename: file.name, type: file.type });
        await fetch(s.url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        body.imageUrl = s.publicUrl;
      }
      await call('/vendor/products', 'POST', body); e.target.reset(); setMsg('Product added.'); load();
    } catch (x) { setMsg(x.message); }
  }
  async function edit(p, field) {
    const v = prompt(`New ${field} for ${p.name}`, p[field]);
    if (v !== null) { await call(`/vendor/products/${p.id}`, 'PATCH', { [field]: v }); load(); }
  }
  return <>
    <p className="card">Your earnings (after 10% commission): <strong>{rs(data.earnings)}</strong></p>
    <form onSubmit={add} className="row card">
      <input name="name" placeholder="Name" required /><input name="category" placeholder="Category" required />
      <input name="price" type="number" min="1" placeholder="Price" required style={{ width: 90 }} />
      <input name="stock" type="number" min="0" placeholder="Stock" required style={{ width: 90 }} />
      <input name="promoPercent" type="number" min="0" max="90" placeholder="Promo %" style={{ width: 90 }} />
      <input name="image" type="file" accept="image/*" /><button>Add product</button>
    </form>
    {msg && <p className="msg">{msg}</p>}
    <table><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Promo</th></tr></thead><tbody>
      {products.map((p) => <tr key={p.id}><td>{p.name}</td>
        {['price', 'stock', 'promoPercent'].map((f) => <td key={f}>{p[f]} <button className="ghost" onClick={() => edit(p, f)}>Edit</button></td>)}</tr>)}</tbody></table>
    <h3>Orders for your products</h3>
    <table><tbody>{data.items.map((i) => <tr key={i.id}>
      <td>#{i.orderId}</td><td>{i.qty} × {i.product.name}</td><td>{i.order.customer.name}</td><td>{i.status.toLowerCase()}</td>
      <td>{i.status === 'PLACED' && <button onClick={() => call(`/vendor/items/${i.id}/ship`, 'PATCH').then(load)}>Mark shipped</button>}</td></tr>)}</tbody></table>
  </>;
}

function Delivery({ call }) {
  const [items, setItems] = useState([]);
  const load = () => call('/delivery/items').then(setItems);
  useEffect(() => { load(); }, []);
  return <>{!items.length && <p className="muted">Nothing to deliver right now.</p>}{items.map((i) => (
    <div key={i.id} className="card row" style={{ marginBottom: 8 }}>
      <span style={{ flex: 1 }}>#{i.orderId} · {i.qty} × {i.product.name} → {i.order.customer.name}</span>
      <button onClick={() => call(`/delivery/items/${i.id}/deliver`, 'PATCH').then(load)}>Mark delivered</button></div>))}</>;
}

function Admin({ call }) {
  const [s, setS] = useState(null);
  useEffect(() => { call('/admin/stats').then(setS); }, []);
  if (!s) return null;
  return <div className="grid">
    <div className="card"><p className="muted">Total sales</p><strong>{rs(s.sales)}</strong></div>
    <div className="card"><p className="muted">Commission earned</p><strong>{rs(s.commission)}</strong></div>
    <div className="card"><p className="muted">Orders</p><strong>{s.orders}</strong></div>
    <div className="card"><p className="muted">Users</p>{Object.entries(s.users).map(([r, n]) => <div key={r}>{r.toLowerCase()}: {n}</div>)}</div>
  </div>;
}
