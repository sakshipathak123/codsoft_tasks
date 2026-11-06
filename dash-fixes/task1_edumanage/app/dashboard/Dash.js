'use client';
import { useState, useEffect, useCallback } from 'react';

const day = (d) => new Date(d).toLocaleDateString('en-IN');
const who = (r) => `${r.student.user.name} (#${r.studentId})`;
const TABS = {
  students: { label: 'Students', write: ['ADMIN'], cols: ['Name', 'Roll no.', 'Course', 'Email'],
    row: (r) => [r.user.name, r.rollNo, r.course, r.user.email],
    fields: [['name'], ['email', 'email'], ['password', 'password'], ['rollNo'], ['course']] },
  attendance: { label: 'Attendance', write: ['ADMIN', 'TEACHER'], cols: ['Student', 'Date', 'Status'],
    row: (r) => [who(r), day(r.date), r.present ? 'Present' : 'Absent'],
    fields: [['studentId', 'number'], ['date', 'date'], ['present', ['true', 'false']]] },
  marks: { label: 'Exams', write: ['ADMIN', 'TEACHER'], cols: ['Student', 'Subject', 'Exam', 'Score'],
    row: (r) => [who(r), r.subject, r.exam, `${r.score}/${r.max}`],
    fields: [['studentId', 'number'], ['subject'], ['exam'], ['score', 'number'], ['max', 'number']] },
  fees: { label: 'Fees', write: ['ADMIN'], cols: ['Student', 'Amount', 'Due', 'Status'],
    row: (r) => [who(r), `₹${r.amount}`, day(r.dueDate), r.paid ? 'Paid' : 'Pending'],
    fields: [['studentId', 'number'], ['amount', 'number'], ['dueDate', 'date'], ['paid', ['false', 'true']]] },
};

export default function Dash({ user }) {
  const [tab, setTab] = useState('students');
  const [box, setBox] = useState({ tab: '', data: [] }); // data is tagged with the tab it belongs to
  const [msg, setMsg] = useState('');
  const t = TABS[tab];
  const rows = box.tab === tab ? box.data : [];
  const canWrite = t.write.includes(user.role);

  const load = useCallback(async () => {
    const res = await fetch(`/api/${tab}`);
    setBox({ tab, data: res.ok ? await res.json() : [] });
  }, [tab]);
  useEffect(() => { setMsg(''); load(); }, [load]);

  async function add(ev) {
    ev.preventDefault();
    const res = await fetch(`/api/${tab}`, { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(ev.target))) });
    if (res.ok) { ev.target.reset(); setMsg(''); load(); } else setMsg((await res.json()).error);
  }
  async function del(id) {
    if (confirm('Delete this record?')) { await fetch(`/api/${tab}?id=${id}`, { method: 'DELETE' }); load(); }
  }
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/login'; }

  return (
    <main className="dash">
      <header>
        <h1>EduManage</h1>
        <span>{user.name} · {user.role.toLowerCase()}</span>
        <button className="ghost" onClick={logout}>Sign out</button>
      </header>
      <nav>{Object.entries(TABS).map(([k, v]) =>
        <button key={k} className={k === tab ? 'on' : ''} onClick={() => setTab(k)}>{v.label}</button>)}</nav>
      {canWrite && (
        <form className="add" onSubmit={add}>
          {t.fields.map(([name, type = 'text']) => Array.isArray(type)
            ? <select key={name} name={name}>{type.map((o) => <option key={o}>{o}</option>)}</select>
            : <input key={name} name={name} type={type} placeholder={name} required />)}
          <button>Add {t.label.toLowerCase()}</button>
        </form>
      )}
      {msg && <p className="err">{msg}</p>}
      <table>
        <thead><tr>{t.cols.map((c) => <th key={c}>{c}</th>)}{canWrite && <th />}</tr></thead>
        <tbody>
          {rows.map((r) => <tr key={r.id}>{t.row(r).map((c, i) => <td key={i}>{c}</td>)}
            {canWrite && <td><button className="ghost" onClick={() => del(r.id)}>Delete</button></td>}</tr>)}
          {!rows.length && <tr><td colSpan="6">Nothing here yet.</td></tr>}
        </tbody>
      </table>
    </main>
  );
}
