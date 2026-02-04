import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:8080/api", // backend của bạn
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

/* ===== OPTIONAL: interceptor ===== */

// Request interceptor (gắn token nếu có)
instance.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token");
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

    if (error.response?.status === 401) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("account");
      // window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default instance;
