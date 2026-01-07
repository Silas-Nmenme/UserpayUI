// app.js – UserPay Frontend Client (Dashboard Compatible)

const UserPayClient = (function () {
  const API_BASE = "https://userpay.vercel.app";
  const TOKEN_KEY = "userpay_token";

  const client = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
    headers: { "Content-Type": "application/json" }
  });

  /* ================= TOKEN ================= */

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
    if (!token) {
      window.location.href = "index.html";
      return;
    }
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  /* ================= AUTH ================= */

  async function register(email, password) {
    const res = await client.post("/auth/register", { email, password });
    return res.data.message;
  }

  async function login(email, password) {
    const res = await client.post("/auth/login", { email, password });
    if (!res.data?.token) throw new Error("Login failed");
    setToken(res.data.token);
    return res.data.user;
  }

  async function getProfile() {
    const res = await client.get("/auth/profile");
    return res.data;
  }

  function logout() {
    setToken(null);
    window.location.href = "index.html";
  }

  /* ================= WALLET ================= */

  async function topup(amount) {
    // Safe call – backend route must exist
    const res = await client.post("/api/wallet/topup", { amount });
    return res.data;
  }

  async function getWallet() {
    const res = await client.get("/api/wallet");
    return res.data;
  }

  async function getTransactions() {
    const res = await client.get("/api/wallet/transactions?limit=5");
    return res.data;
  }

  /* ================= UI REFRESH ================= */

  async function refreshUI() {
    try {
      const profile = await getProfile();

      document.getElementById("wallet-balance").textContent =
        `$${Number(profile.balance || 0).toFixed(2)}`;

      // Load transactions (optional)
      const txBody = document.getElementById("tx-table");
      if (!txBody) return;

      let txs = [];
      try {
        txs = await getTransactions();
      } catch {
        txBody.innerHTML =
          `<tr><td colspan="5" class="text-muted">No transactions</td></tr>`;
        return;
      }

      if (!txs.length) {
        txBody.innerHTML =
          `<tr><td colspan="5" class="text-muted">No transactions</td></tr>`;
        return;
      }

      txBody.innerHTML = txs.map(tx => `
        <tr>
          <td>${tx._id.slice(-6)}</td>
          <td>${tx.type}</td>
          <td>$${tx.amount}</td>
          <td>${tx.status}</td>
          <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
        </tr>
      `).join("");

      document.getElementById("tx-count").textContent = txs.length;
    } catch (err) {
      alert(err.message || "Session expired");
      logout();
    }
  }

  /* ================= ERROR NORMALIZATION ================= */

  client.interceptors.response.use(
    res => res,
    err => Promise.reject(
      new Error(err.response?.data?.message || "Network error")
    )
  );

  return {
    init,
    register,
    login,
    logout,
    refreshUI,
    topup,
    getToken
  };
})();

window.UserPayClient = UserPayClient;
