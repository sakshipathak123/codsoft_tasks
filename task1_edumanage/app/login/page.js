'use client';
import { useState } from 'react';

export default function Login() {
  const [error, setError] = useState('');
  async function submit(ev) {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(f)) });
    if (res.ok) location.href = '/dashboard'; else setError((await res.json()).error);
  }
  return (
    <main className="login">
      <h1>EduManage</h1>
      <p>Sign in to see your students, attendance, marks and fees.</p>
      <form onSubmit={submit}>
        <label>Email<input name="email" type="email" required /></label>
        <label>Password<input name="password" type="password" required /></label>
        {error && <p className="err">{error}</p>}
        <button>Sign in</button>
      </form>
    </main>
  );
}
