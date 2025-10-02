import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import jsPDF from "jspdf";

export default function AdminVaccination() {
  const [owners, setOwners] = useState([]);
  const [pets, setPets] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);

  const [formData, setFormData] = useState({
    ownerId: "",
    petId: "",
    vaccineName: "",
    vaccinationDate: "",
    nextDueDate: "",
  });
  const [errors, setErrors] = useState([]);
  const vaccinationDateRef = useRef(null);
  const nextDueDateRef = useRef(null);

  // helpers
  const isoToDmy = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };
  const calcStatus = (record) => {
    if (record.status === "Cancelled") return "Cancelled";
    if (record.status === "Pending") return "Pending";
    const today = new Date();
    const due = new Date(record.nextDueDate);
    if (!record.nextDueDate || isNaN(due)) return "Completed"; // no due date
    if (today > due) return "Overdue";
    const daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return daysLeft <= 30 ? "Due Soon" : "Completed";
  };

  // validation
  const validate = () => {
    const errs = [];
    if (!formData.ownerId) errs.push("Owner is required.");
    if (!formData.petId) errs.push("Pet is required.");
    if (!formData.vaccineName) errs.push("Vaccine name is required.");
    if (!formData.vaccinationDate) errs.push("Vaccination date is required.");
    setErrors(errs);
    return errs.length === 0;
  };

  const clearForm = () => {
    setFormData({
      ownerId: "",
      petId: "",
      vaccineName: "",
      vaccinationDate: "",
      nextDueDate: "",
    });
    setErrors([]);
  };

  // load lists + records
  const loadAll = async () => {
    const [o, p, v] = await Promise.all([
      api.get("/owners"),
      api.get("/pets"),
      api.get("/vaccinations"),
    ]);
    setOwners(o.data || []);
    setPets(p.data || []);
    setVaccinations(v.data || []);
  };

  useEffect(() => {
    loadAll().catch((e) => {
      console.error("Load error:", e?.response?.status, e?.response?.data || e.message);
      alert("Error loading data");
    });
  }, []);

  // submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const res = await api.post("/vaccinations", formData);
      setVaccinations((prev) => [res.data, ...prev]);
      clearForm();
    } catch (err) {
      console.error("Save error:", err?.response?.status, err?.response?.data || err.message);
      alert(err?.response?.data?.message || "Save failed");
    }
  };

  // update status
  const handleUpdateStatus = async (id, newStatus) => {
    if (newStatus === "Cancelled" && !window.confirm("Cancel this vaccination?")) return;
    try {
      const res = await api.patch(`/vaccinations/${id}`, { status: newStatus });
      setVaccinations((prev) => prev.map((v) => (v._id === id ? res.data : v)));
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update status");
    }
  };

  // delete (optional)
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await api.delete(`/vaccinations/${id}`);
      setVaccinations((prev) => prev.filter((v) => v._id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete");
    }
  };

  // download certificate
  const handleDownload = (row) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Vaccination Certificate", 14, 20);
    doc.setLineWidth(0.5);
    doc.line(14, 28, 200, 28);

    doc.setFontSize(12);
    let y = 40;
    doc.text(`Owner: ${row.ownerId?.name || row.ownerId}`, 14, y); y += 10;
    doc.text(`Pet: ${row.petId?.name || row.petId}`, 14, y); y += 10;
    doc.text(`Vaccine: ${row.vaccineName}`, 14, y); y += 10;
    doc.text(`Vaccination Date: ${isoToDmy(row.vaccinationDate) || row.vaccinationDate}`, 14, y); y += 10;
    if (row.nextDueDate) {
      doc.text(`Next Due Date: ${isoToDmy(row.nextDueDate) || row.nextDueDate}`, 14, y); y += 10;
    }
    doc.text(`Status: ${calcStatus(row)}`, 14, y);

    doc.save(`vaccination_${row._id}.pdf`);
  };

  const handleSend = (row) => {
    alert(`Pretend-send vaccination reminder for ${row.petId?.name || "pet"} (${row._id})`);
  };

  const filteredPets = useMemo(() => {
    if (!formData.ownerId) return [];
    return pets.filter((p) => String(p.ownerId?._id || p.ownerId) === String(formData.ownerId));
  }, [pets, formData.ownerId]);

  return (
    <div className="px-6 py-6">
      <style>{`
        .card { border-radius: 16px; border: 1px solid #e5e7eb; }
        .card-purple { background: #a5b4fc; border-color:#8ea0ff; }
        .card-body { padding: 24px; }
        .card-title { font-weight: 700; font-size: 20px; margin-bottom: 16px; color:#111827; }
        .input, .select { width:100%; border:1px solid #e5e7eb; border-radius:12px; padding:12px 14px; }
        .btn-yellow { background:#F3F58B; color:#111827; padding:12px 18px; border-radius:12px; font-weight:600; }
        .btn-action { padding:6px 12px; border-radius:8px; font-weight:600; margin-left:6px; }
        .btn-complete { background:#22c55e; color:#fff; }
        .btn-cancel { background:#ef4444; color:#fff; }
        .link-action { text-decoration: underline; font-weight: 600; color: #4338ca; margin-right: 16px; }
        .form-grid { display:grid; grid-template-columns: 1fr; gap:16px; }
        @media (min-width: 768px) { .form-grid { grid-template-columns: 1fr 1fr; } }
        .table { width:100%; border-collapse:collapse; }
        .table th, .table td { padding:14px; border:1px solid #c9d0ff; }
        .table thead th { background:#a5b4fc; color:#111827; }
        .badge { padding:6px 10px; border-radius:999px; font-size:12px; font-weight:700; }
        .badge-completed { background:#22c55e; color:#fff; }
        .badge-pending { background:#facc15; color:#111827; }
        .badge-cancelled { background:#ef4444; color:#fff; }
        .badge-overdue { background:#dc2626; color:#fff; }
        .badge-due-soon { background:#f97316; color:#fff; }
        .row-overdue { background: #fee2e2; }
        .row-due { background: #ffedd5; }
      `}</style>

      <h1 className="text-2xl font-bold text-slate-900 mb-1">Vaccination Records</h1>
      <p className="text-slate-600 mb-6">Track vaccinations and due dates.</p>

      {errors.length > 0 && (
        <div className="card mb-4">
          <div className="card-body">
            <ul className="list-disc ml-5 text-rose-700">
              {errors.map((er, i) => <li key={i}>{er}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="card card-purple mb-6">
        <div className="card-body">
          <div className="card-title">New vaccination</div>
          <form onSubmit={handleSubmit} className="form-grid">
            {/* Owner */}
            <div>
              <label className="text-sm text-slate-700">Owner</label>
              <select
                className="select mt-1"
                value={formData.ownerId}
                onChange={(e) => setFormData({ ...formData, ownerId: e.target.value, petId: "" })}
              >
                <option value="">Select owner</option>
                {owners.map((o) => (
                  <option key={o._id} value={o._id}>{o.name}</option>
                ))}
              </select>
            </div>

            {/* Pet */}
            <div>
              <label className="text-sm text-slate-700">Pet</label>
              <select
                className="select mt-1"
                disabled={!formData.ownerId}
                value={formData.petId}
                onChange={(e) => setFormData({ ...formData, petId: e.target.value })}
              >
                <option value="">{formData.ownerId ? "Select pet" : "Select owner first"}</option>
                {filteredPets.map((p) => (
                  <option key={p._id} value={p._id}>{p.name} ({p.type})</option>
                ))}
              </select>
            </div>

            {/* Vaccine */}
            <div>
              <label className="text-sm text-slate-700">Vaccine</label>
              <select
                className="select mt-1"
                value={formData.vaccineName}
                onChange={(e) => setFormData({ ...formData, vaccineName: e.target.value })}
              >
                <option value="">Select vaccine</option>
                <option value="Rabies">Rabies</option>
                <option value="Distemper">Distemper</option>
                <option value="Parvo">Parvo</option>
                <option value="Kennel Cough">Kennel Cough</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Vaccination Date */}
            <div>
              <label className="text-sm text-slate-700">Vaccination Date</label>
              <input
                type="date"
                className="input mt-1"
                value={formData.vaccinationDate}
                onChange={(e) => setFormData({ ...formData, vaccinationDate: e.target.value })}
                ref={vaccinationDateRef}
              />
            </div>

            {/* Next Due Date */}
            <div>
              <label className="text-sm text-slate-700">Next Due Date</label>
              <input
                type="date"
                className="input mt-1"
                value={formData.nextDueDate}
                onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                ref={nextDueDateRef}
              />
            </div>

            <div className="md:col-span-2">
              <button type="submit" className="btn-yellow">Create vaccination</button>
            </div>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Vaccine</th>
              <th>Pet</th>
              <th>Owner</th>
              <th>Date Given</th>
              <th>Next Due</th>
              <th>Status</th>
              <th style={{textAlign:"right"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vaccinations.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center text-slate-500 py-6">No vaccinations</td>
              </tr>
            ) : vaccinations.map((v) => {
              const st = calcStatus(v);
              const rowClass =
                st === "Overdue" ? "row-overdue" :
                st === "Due Soon" ? "row-due" : "";
              return (
                <tr key={v._id} className={rowClass}>
                  <td>{v.vaccineName}</td>
                  <td>{v.petId?.name || "—"}</td>
                  <td>{v.ownerId?.name || "—"}</td>
                  <td>{isoToDmy(v.vaccinationDate)}</td>
                  <td>{isoToDmy(v.nextDueDate)}</td>
                  <td>
                    {st === "Completed" && <span className="badge badge-completed">Completed</span>}
                    {st === "Pending"   && <span className="badge badge-pending">Pending</span>}
                    {st === "Due Soon"  && <span className="badge badge-due-soon">Due Soon</span>}
                    {st === "Overdue"   && <span className="badge badge-overdue">Overdue</span>}
                    {st === "Cancelled" && <span className="badge badge-cancelled">Cancelled</span>}
                  </td>
                  <td style={{textAlign:"right"}}>
                    <button className="link-action" onClick={() => handleDownload(v)}>Download</button>
                    <button className="link-action" onClick={() => handleSend(v)}>Send</button>

                    {v.status === "Pending" && (
                      <>
                        <button
                          className="btn-action btn-complete"
                          onClick={() => handleUpdateStatus(v._id, "Completed")}
                        >
                          Complete
                        </button>
                        <button
                          className="btn-action btn-cancel"
                          onClick={() => handleUpdateStatus(v._id, "Cancelled")}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {/* optional delete */}
                    {/* <button className="btn-action" onClick={() => handleDelete(v._id)}>Delete</button> */}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

