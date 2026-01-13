import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:8080/api", // backend của bạn
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ===== OPTIONAL: interceptor ===== */

// Request interceptor (gắn token nếu có)
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API error:", error);
    return Promise.reject(error);
  }
);

export default instance;
