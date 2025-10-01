// frontend/src/pages/OwnerAppointmentPage.jsx
import React, { useEffect, useState } from 'react';
import api from '../api/axios'; // มี interceptor ใส่ token อยู่แล้ว

export default function OwnerAppointmentPage() {
  const [pets, setPets] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ petId: '', date: '', time: '', reason: '' });
  const [error, setError] = useState('');

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function load() {
    setError('');
    try {
      const [p, a] = await Promise.all([
        api.get('/pets/mine'),
        api.get('/appointments/mine'),
      ]);
      setPets(p.data || []);
      setItems(a.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load data');
    }
  }

  async function book() {
    setError('');
    try {
      if (!form.petId || !form.date || !form.time) {
        setError('petId, date, time are required');
        return;
      }
      await api.post('/appointments/mine', {
        petId: form.petId,
        date: form.date,
        time: form.time,
        reason: form.reason || '',
      });
      setForm({ petId: '', date: '', time: '', reason: '' });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Booking failed');
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-2">My Appointments</h1>
      <p className="text-slate-600 mb-6">Owner: You</p>

      <section
        className="rounded-xl p-5 mb-8"
        style={{ backgroundColor: '#a5b4fc', border: '1px solid #8ea0ff' }}
      >
        <h3 className="font-semibold mb-3">Book appointment</h3>

        <div className="grid md:grid-cols-4 gap-4">
          <select className="border rounded px-3 py-2" value={form.petId} onChange={onChange('petId')}>
            <option value="">Select pet</option>
            {pets.map(p => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.type})
              </option>
            ))}
          </select>

          <input
            type="date"
            className="border rounded px-3 py-2"
            value={form.date}
            onChange={onChange('date')}
          />

          <input
            type="time"
            className="border rounded px-3 py-2"
            value={form.time}
            onChange={onChange('time')}
          />

          <input
            className="border rounded px-3 py-2"
            placeholder="Reason"
            value={form.reason}
            onChange={onChange('reason')}
          />
        </div>

        <div className="mt-4">
          <button
            onClick={book}
            className="px-5 py-2 rounded-full font-bold"
            style={{ backgroundColor: '#F3F58B' }}
          >
            Book
          </button>
        </div>

        {error && (
          <div className="mt-4 px-4 py-2 rounded" style={{ background: '#ffe4e4', color: '#7a0000' }}>
            {error}
          </div>
        )}
      </section>

      <section className="rounded-xl overflow-hidden border" style={{ borderColor: '#8ea0ff', background: '#eef1ff' }}>
        <div className="px-4 py-3 font-semibold" style={{ background: '#c7d0ff' }}>
          My appointments
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#a5b4fc] text-slate-900">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Pet</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, i) => (
                <tr key={r._id} className={i % 2 ? 'bg-[#e8ebff]' : 'bg-[#f5f6ff]'}>
                  <td className="px-4 py-3">{r.date}</td>
                  <td className="px-4 py-3">{r.time}</td>
                  <td className="px-4 py-3">{r.petId?.name || '-'}</td>
                  <td className="px-4 py-3">{r.petId?.type || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white">
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">—</td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                    No appointments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
