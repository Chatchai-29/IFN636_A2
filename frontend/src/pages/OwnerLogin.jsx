// frontend/src/pages/OwnerLogin.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { setToken } from "../utils/auth";
import { useAuth } from "../context/AuthContext";

export default function OwnerLogin() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {

      const res = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      });

      if (res.data?.token) {
        setToken(res.data.token);

        let me;
        try {
          me = await api.get("/auth/me");
        } catch {
          me = await api.get("/auth/profile");
        }

        const userPayload = { ...me.data, role: me.data?.role || "owner" };
        login(userPayload);

        nav("/dashboard");
      } else {
        setErrorMsg("Login response missing token");
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) setErrorMsg("Invalid email or password");
      else setErrorMsg(err?.response?.data?.message || "Error during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        backgroundColor: "#ffffff",
        fontFamily: "Tuffy, sans-serif",
      }}
    >
      {/* 🐾 Background Pets */}
      <img
        src="/Pet1.png"
        alt="Pet1"
        className="absolute"
        style={{ left: "75%", bottom: "10%", width: "460px" }}
      />
      <img
        src="/Pet2.png"
        alt="Pet2"
        className="absolute"
        style={{ right: "70%", top: "-7%", width: "560px" }}
      />
      <img
        src="/Pet3.png"
        alt="Pet3"
        className="absolute"
        style={{ bottom: "60%", left: "70%", width: "400px" }}
      />
      <img
        src="/Pet4.png"
        alt="Pet4"
        className="absolute"
        style={{
          top: "40%",
          left: "15%",
          transform: "translateX(-50%)",
          width: "460px",
        }}
      />

      {/* Card */}
      <div
        className="rounded-2xl shadow-lg p-10 relative z-10"
        style={{
          backgroundColor: "#9DB4E5",
          width: "560px",
          height: "480px",
        }}
      >
        <h1
          className="text-center mb-6"
          style={{
            fontFamily: "Cherry Bomb One, cursive",
            fontSize: "28px",
            fontWeight: "bold",
          }}
        >
          Owner login
        </h1>

        {errorMsg && (
          <div
            style={{
              background: "#ffe9e9",
              color: "#a40000",
              padding: 10,
              borderRadius: 10,
              marginBottom: 10,
            }}
          >
            {errorMsg}
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div>
            <label>Email</label>
            <input
              className="w-full rounded-lg px-3 py-2 border"
              type="email"
              value={form.email}
              onChange={onChange("email")}
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div>
            <label>Password</label>
            <input
              className="w-full rounded-lg px-3 py-2 border"
              type="password"
              value={form.password}
              onChange={onChange("password")}
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="rounded-full px-6 py-2 mt-2"
            style={{
              backgroundColor: "#F3F58B",
              fontFamily: "Cherry Bomb One, cursive",
              fontWeight: "bold",
            }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login 🐾"}
          </button>
        </form>
      </div>

      <p className="mt-4 text-sm relative z-10">
        Use your registered email and password.
      </p>
    </div>
  );
}
