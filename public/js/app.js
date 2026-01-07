// app.js – UserPay Frontend API Client

const UserPayClient = (function () {
  const API_BASE = "https://userpay.vercel.app";
  const TOKEN_KEY = "userpay_token";

  const client = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
    headers: {
      "Content-Type": "application/json"
    }
  });

  /* ===================== TOKEN HANDLING ===================== */

  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      client.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      localStorage.removeItem(TOKEN_KEY);
      delete client.defaults.headers.common.Authorization;
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function init() {
    const token = getToken();
    if (token) {
      client.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
  }

  /* ===================== AUTH ===================== */

  async function register(email, password) {
    const res = await client.post("/auth/register", {
      email,
      password
    });
    return res.data.message;
  }

  async function login(email, password) {
    const res = await client.post("/auth/login", {
      email,
      password
    });

    const token = res?.data?.token;
    if (!token) {
      throw new Error("No token returned from server");
    }

    setToken(token);
    return res.data.user;
  }

  async function resendVerification(email) {
    const res = await client.post("/auth/resend-verification", {
      email
    });
    return res.data.message;
  }

  async function getProfile() {
    const res = await client.get("/auth/profile");
    return res.data;
  }

  function logout() {
    setToken(null);
    window.location.href = "index.html";
  }

  /* ===================== AXIOS ERROR NORMALIZATION ===================== */

  client.interceptors.response.use(
    response => response,
    error => {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Something went wrong";
      return Promise.reject(new Error(message));
    }
  );

  return {
    init,
    register,
    login,
    resendVerification,
    getProfile,
    logout,
    getToken
  };
})();

/* ===================== AUTO INIT ===================== */
document.addEventListener("DOMContentLoaded", () => {
  UserPayClient.init();
});

window.UserPayClient = UserPayClient;
