import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";

export default function OwnerHistoryPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // load history owner
         // trying /history/mine first if not fallback is /history?ownerId=...
        try {
          const mine = await api.get("/history/mine");
          setRows(mine.data || []);
        } catch {
          const me = await api.get("/auth/me");
          const list = await api.get("/history", { params: { ownerId: me.data._id } });
          setRows(list.data || []);
        }
      } catch (err) {
        setErrorMsg(err?.response?.data?.message || "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen relative"
      style={{
        backgroundImage: "url('/bg4')",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-white" style={{ opacity: 0.2 }} />
      <main className="relative z-10 container-page">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">My History</h1>
          <p className="text-slate-600">
            {user?.name ? `Owner: ${user.name}` : "Owner portal"}
          </p>
        </div>

        {!!errorMsg && (
          <div className="mb-4 rounded-md px-3 py-2" style={{ background: "#ffe9e9", color: "#a40000" }}>
            {errorMsg}
          </div>
        )}

        <section className="bg-white rounded-xl shadow border border-indigo-200 overflow-hidden">
          <div className="bg-indigo-200 px-5 py-3 font-semibold text-slate-800">
            My records
          </div>
          {loading ? (
            <div className="p-6 text-slate-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[900px]">
                <thead>
                  <tr className="bg-indigo-300 text-gray-800">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Pet</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Diagnosis</th>
                    <th className="px-4 py-3">Treatment</th>
                    <th className="px-4 py-3">Doctor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r._id || idx} className={idx % 2 === 0 ? "bg-indigo-100" : "bg-indigo-200"}>
                      <td className="px-4 py-3">
                        {r?.date ? format(new Date(r.date), "dd/MM/yy") : "-"}
                      </td>
                      <td className="px-4 py-3">{r?.pet?.name || r?.petName || "-"}</td>
                      <td className="px-4 py-3">{r?.pet?.type || r?.petType || "-"}</td>
                      <td className="px-4 py-3">{r?.diagnosis || "-"}</td>
                      <td className="px-4 py-3">{r?.treatment || "-"}</td>
                      <td className="px-4 py-3">{r?.doctorName || "-"}</td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
