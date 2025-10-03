import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5001/api",
  withCredentials: false,
});

api.interceptors.request.use((cfg) => {
  try {
    const auth = localStorage.getItem("auth");
    const tokenFromAuth = auth ? JSON.parse(auth)?.token : null;
    const token =
      tokenFromAuth ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");

    if (token) {
      cfg.headers = cfg.headers || {};
      cfg.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {
    // ignore
  }
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      console.warn("[api] 401 Unauthorized");
    }
    return Promise.reject(err);
  }
);

export default api;
