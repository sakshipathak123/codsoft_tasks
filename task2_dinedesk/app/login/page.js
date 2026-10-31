'use client';
import { useState } from 'react';

export default function Login() {
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState('');
  async function submit(ev) {
    ev.preventDefault();
    const body = JSON.stringify(Object.fromEntries(new FormData(ev.target)));
    const res = await fetch(`/api/auth/${signup ? 'register' : 'login'}`, { method: 'POST', body });
    if (res.ok) location.href = '/dashboard'; else setError((await res.json()).error);
  }
  const box = 'w-full rounded-md border border-stone-300 bg-white px-3 py-2';
  return (
    <main className="mx-auto mt-[12vh] max-w-sm px-4">
      <h1 className="text-3xl font-bold text-orange-700">DineDesk</h1>
      <p className="mb-6 text-stone-600">Order food, book a table and track your meal.</p>
      <form onSubmit={submit} className="grid gap-3">
        {signup && <input className={box} name="name" placeholder="Your name" required />}
        <input className={box} name="email" type="email" placeholder="Email" required />
        <input className={box} name="password" type="password" placeholder="Password" required />
        {error && <p className="text-red-700">{error}</p>}
        <button className="rounded-md bg-orange-700 py-2 font-medium text-white">{signup ? 'Create account' : 'Sign in'}</button>
      </form>
      <button className="mt-4 text-sm text-orange-800 underline" onClick={() => { setSignup(!signup); setError(''); }}>
        {signup ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </button>
    </main>
  );
}
