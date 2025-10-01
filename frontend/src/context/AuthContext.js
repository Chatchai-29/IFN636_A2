// frontend/src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Safe load from localStorage
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      if (!saved || saved === 'undefined' || saved === 'null') return null;
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  // Fetch profile when token exists
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    (async () => {
      try {
        // ⚠️ FIX: ใช้ /auth/me แทน /api/auth/me 
        // เพราะ api.js มี baseURL = '/api' อยู่แล้ว
        const me = await api.get('/auth/me');
        
        console.log('[AuthContext] Profile fetched:', me.data);
        
        setUser(me.data);
        localStorage.setItem('user', JSON.stringify(me.data));
      } catch (err) {
        console.warn('[AuthContext] Fetch profile failed:', err?.response?.data || err.message);
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    })();
  }, []);

  const login = (userData) => {
    console.log('[AuthContext] Login:', userData);
    setUser(userData || null);
    if (userData) localStorage.setItem('user', JSON.stringify(userData));
    else localStorage.removeItem('user');
  };

  const logout = () => {
    console.log('[AuthContext] Logout');
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);