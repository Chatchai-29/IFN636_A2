import React, { useEffect, useMemo, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';

export default function AppointmentPage() {
  const [appointments, setAppointments] = useState([]);
  const [owners, setOwners] = useState([]);
  const [pets, setPets] = useState([]);
  const socketRef = useRef(null);
  
  const [formData, setFormData] = useState({ ownerId:'', petId:'', date:'', time:'', reason:'' });
  const [displayDate, setDisplayDate] = useState('');
  const nativeDateRef = useRef(null);

  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState([]);

  useEffect(() => { fetchAll(); }, []);
  
  const fetchAll = async () => {
    try {
      // ⚠️ Add timestamp to bypass cache
      const timestamp = Date.now();
      const [o, p, a] = await Promise.all([
        api.get(`/owners?_t=${timestamp}`),
        api.get(`/pets?_t=${timestamp}`),
        api.get(`/appointments?_t=${timestamp}`),
      ]);
      
      console.log('[fetchAll] Fetched data:', {
        owners: o.data?.length || 0,
        pets: p.data?.length || 0,
        appointments: a.data?.length || 0
      });
      
      setOwners(o.data || []);
      setPets(p.data || []);
      setAppointments(a.data || []);
    } catch (e) {
      console.error('[fetchAll] Error:', e);
      alert('Error fetching data: ' + (e.response?.data?.message || e.message));
    }
  };

  const refetchAppointments = async () => {
    try {
      const timestamp = Date.now();
      const a = await api.get(`/appointments?_t=${timestamp}`);
      console.log('[refetchAppointments] Got:', a.data?.length || 0, 'appointments');
      setAppointments(a.data || []);
    } catch (e) {
      console.error('[refetchAppointments] Error:', e);
    }
  };

  // Socket.IO for live notifications
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });

    const onNotification = (notification) => {
      const msg = notification?.message || 'Appointment updated';
      alert(`${msg}`);
      refetchAppointments().catch(() => {});
    };

    socketRef.current.on('notification', onNotification);

    return () => {
      socketRef.current?.off('notification', onNotification);
      socketRef.current?.disconnect();
    };
  }, []);

  // Date helpers
  const isoToDmy = (iso) => {
    if (!iso || typeof iso !== 'string') return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${y}`;
  };

  const dmyToIso = (dmy) => {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((dmy || '').trim());
    if (!m) return null;
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const yyyy = parseInt(m[3], 10);
    const dt = new Date(yyyy, mm - 1, dd);
    if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) return null;
    const mmStr = String(mm).padStart(2, '0');
    const ddStr = String(dd).padStart(2, '0');
    return `${yyyy}-${mmStr}-${ddStr}`;
  };

  const formatDmyMask = (val) => {
    const digits = (val || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  useEffect(() => {
    setDisplayDate(isoToDmy(formData.date));
  }, [formData.date]);

  const filteredPets = useMemo(() => {
    if (!formData.ownerId) return [];
    return pets.filter(pt => String(pt.ownerId?._id || pt.ownerId) === String(formData.ownerId));
  }, [pets, formData.ownerId]);

  const validate = () => {
    const errs = [];
    if (!formData.ownerId) errs.push('Owner is required.');
    if (!formData.petId) errs.push('Pet is required.');

    const isoFromDisplay = dmyToIso(displayDate);
    if (!isoFromDisplay) errs.push('Date is required in dd/mm/yyyy.');
    if (isoFromDisplay && !formData.date) formData.date = isoFromDisplay;

    if (!formData.time) errs.push('Time is required.');

    const pet = pets.find(p => String(p._id) === String(formData.petId));
    const ownerOfPet = pet?.ownerId?._id || pet?.ownerId;
    if (pet && String(ownerOfPet) !== String(formData.ownerId)) {
      errs.push('Selected pet does not belong to the owner.');
    }

    const dt = formData.date && formData.time ? new Date(`${formData.date}T${formData.time}:00`) : null;
    if (dt && dt < new Date()) errs.push('Appointment cannot be in the past.');

    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (editingId) {
        await api.patch(`/appointments/${editingId}`, formData);
      } else {
        await api.post('/appointments', formData);
      }
      clearForm();
      await refetchAppointments();
    } catch (err) {
      console.error('[handleSubmit] Error:', err);
      alert(err.response?.data?.message || 'Save failed');
    }
  };

  const handleEdit = (appt) => {
    setEditingId(appt._id);
    setFormData({
      ownerId: appt.ownerId?._id || appt.ownerId,
      petId: appt.petId?._id || appt.petId,
      date: appt.date,
      time: appt.time,
      reason: appt.reason || '',
    });
    setErrors([]);
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await api.patch(`/appointments/${id}/cancel`);
      await refetchAppointments();
    } catch (err) {
      console.error(err);
      alert('Cancel failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete permanently?')) return;
    try {
      await api.delete(`/appointments/${id}`);
      await refetchAppointments();
    } catch (err) {
      console.error(err);
      alert('Delete failed');
    }
  };

  const handleComplete = async (id) => {
    if (!window.confirm('Mark this appointment as completed?')) return;
    try {
      await api.patch(`/appointments/${id}/complete`);
      await refetchAppointments();
    } catch (err) {
      console.error('Complete API error:', err);
      alert(err?.response?.data?.message || 'Complete failed');
    }
  };

  const clearForm = () => {
    setEditingId(null);
    setFormData({ ownerId:'', petId:'', date:'', time:'', reason:'' });
    setDisplayDate('');
    setErrors([]);
  };

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundImage: "url('/paws2.png')",
        backgroundRepeat: 'repeat',
        backgroundSize: 'cover',
      }}
    >
      <div
        className="absolute inset-0 bg-white"
        style={{ opacity: 0.90 }}
        aria-hidden="true"
      />

      <div className="relative z-10">
        <div className="container-page">
          <style>{`
            .card.card-purple,
            .card.card-purple .card-body {
              background: #a5b4fc;
              border: 1px solid #8ea0ff;
              border-radius: 16px;
            }
            .card.card-purple .card-title,
            .card.card-purple label {
              color: #111827;
            }
            .table-soft-purple thead th {
              background: #a5b4fc;
              color: #111827;
              border-color: #c9d0ff;
            }
            .table-soft-purple tbody td,
            .table-soft-purple thead th {
              border-color: #c9d0ff;
            }
            .table-soft-purple tbody tr:nth-child(odd)  { background: #eef1ff; }
            .table-soft-purple tbody tr:nth-child(even) { background: #dde3ff; }
            .btn-yellow {
              background: #F3F58B;
              color: #111827;
            }
            .btn-yellow:hover { filter: brightness(0.95); }
            .btn-success {
              background: #22c55e;
              color: #fff;
            }
            .btn-success:hover { filter: brightness(0.95); }
          `}</style>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
            <p className="text-slate-600">Book, edit, cancel appointments.</p>
          </div>

          {/* Debug info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              📊 Data loaded: {owners.length} owners, {pets.length} pets, {appointments.length} appointments
            </p>
          </div>

          {errors.length > 0 && (
            <div className="card mb-4">
              <div className="card-body">
                <ul className="list-disc ml-5 text-rose-700">
                  {errors.map((er, i) => <li key={i}>{er}</li>)}
                </ul>
              </div>
            </div>
          )}

          <div className="card mb-6 card-purple">
            <div className="card-body">
              <div className="card-title">{editingId ? 'Edit appointment' : 'New appointment'}</div>

              <form onSubmit={handleSubmit} className="form-grid">
                <div>
                  <label className="text-sm text-slate-600">Owner</label>
                  <select
                    className="select mt-1"
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value, petId: '' })}
                  >
                    <option value="">Select owner</option>
                    {owners.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-600">Pet</label>
                  <select
                    className="select mt-1"
                    value={formData.petId}
                    onChange={(e) => setFormData({ ...formData, petId: e.target.value })}
                    disabled={!formData.ownerId}
                  >
                    <option value="">{formData.ownerId ? 'Select pet' : 'Select owner first'}</option>
                    {filteredPets.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.type})</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-600">Date</label>
                  <div className="relative mt-1">
                    <input
                      className="input w-full pr-10"
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={displayDate}
                      onChange={(e) => {
                        const masked = formatDmyMask(e.target.value);
                        setDisplayDate(masked);
                        const iso = dmyToIso(masked);
                        setFormData(prev => ({ ...prev, date: iso || '' }));
                      }}
                      onBlur={() => {
                        const iso = dmyToIso(displayDate);
                        if (iso) setFormData({ ...formData, date: iso });
                        else setFormData({ ...formData, date: '' });
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
                      aria-label="Open calendar"
                      onClick={() => {
                        const el = nativeDateRef.current;
                        if (!el) return;
                        if (el.showPicker) el.showPicker();
                        else el.click();
                      }}
                    >
                      📅
                    </button>
                    <input
                      ref={nativeDateRef}
                      type="date"
                      style={{
                        position: 'absolute',
                        width: 1, height: 1, padding: 0, margin: -1,
                        overflow: 'hidden', clip: 'rect(0,0,0,0)',
                        whiteSpace: 'nowrap', border: 0
                      }}
                      onChange={(e) => {
                        const iso = e.target.value;
                        setFormData((prev) => ({ ...prev, date: iso }));
                        if (iso) {
                          const [y, m, d] = iso.split('-');
                          setDisplayDate(`${d}/${m}/${y}`);
                        } else {
                          setDisplayDate('');
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-600">Time</label>
                  <input
                    className="input mt-1"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm text-slate-600">Reason</label>
                  <input
                    className="input mt-1"
                    placeholder="(optional)"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>

                <div className="form-actions sm:col-span-2">
                  <button type="submit" className="btn btn-yellow">
                    {editingId ? 'Update' : 'Book'} appointment
                  </button>
                  {editingId && (
                    <button type="button" onClick={clearForm} className="btn btn-secondary">
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table table-soft-purple">
              <thead>
                <tr>
                  <th>Date</th><th>Time</th><th>Pet</th><th>Owner</th><th>Reason</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-6 text-slate-500">No appointments</td></tr>
                ) : appointments.map(appt => (
                  <tr key={appt._id}>
                    <td>{isoToDmy(appt.date) || appt.date}</td>
                    <td>{appt.time}</td>
                    <td>{appt.petId?.name || '—'}</td>
                    <td>{appt.ownerId?.name || '—'}</td>
                    <td>{appt.reason || '—'}</td>
                    <td>
                      <span className={`badge ${
                        appt.status === 'scheduled' ? 'badge-yellow' :
                        appt.status === 'completed' ? 'badge-green' : 'badge-red'
                      }`}>{appt.status}</span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button className="btn btn-yellow" onClick={() => handleEdit(appt)}>Edit</button>
                        {appt.status === 'scheduled' && (
                          <>
                            <button className="btn btn-success" onClick={() => handleComplete(appt._id)}>
                              Complete
                            </button>
                            <button className="btn btn-secondary" onClick={() => handleCancel(appt._id)}>
                              Cancel
                            </button>
                          </>
                        )}
                        <button className="btn btn-danger" onClick={() => handleDelete(appt._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}