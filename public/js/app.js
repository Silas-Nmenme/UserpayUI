// app.js – UserPay Frontend Client (Backend-Aligned)

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

  async function login(email, password) {
    const res = await client.post("/auth/login", { email, password });
    if (!res.data?.token) throw new Error("Login failed");
    setToken(res.data.token);
    return res.data.user;
  }

  async function getProfile() {
    const res = await client.get("/auth/profile");
    return res.data; // { id, username, email, balance }
  }

  function logout() {
    setToken(null);
    window.location.href = "index.html";
  }

  /* ================= WALLET ================= */

  async function getBalance() {
    const res = await client.get("/api/wallet/balance");
    return res.data.balance;
  }

  async function topup(amount) {
    const res = await client.post("/api/wallet/topup", { amount });
    return res.data;
  }

  async function getTransactions() {
    const res = await client.get("/api/wallet/transactions");
    return res.data;
  }

  /* ================= DASHBOARD UI ================= */

  async function refreshUI() {
    try {
      /* ---- PROFILE ---- */
      const profile = await getProfile();

      // Optional: show username if element exists
      const nameEl = document.getElementById("username");
      if (nameEl) nameEl.textContent = profile.username;

      /* ---- BALANCE ---- */
      const balance = await getBalance();
      document.getElementById("wallet-balance").textContent =
        `$${Number(balance).toFixed(2)}`;

      /* ---- TRANSACTIONS ---- */
      const txBody = document.getElementById("tx-table");
      const txCountEl = document.getElementById("tx-count");

      if (!txBody) return;

      const txs = await getTransactions();

      if (!txs.length) {
        txBody.innerHTML =
          `<tr><td colspan="5" class="text-muted">No transactions yet</td></tr>`;
        txCountEl.textContent = "0";
        return;
      }

      txBody.innerHTML = txs.slice(0, 5).map(tx => `
        <tr>
          <td>${tx._id.slice(-6)}</td>
          <td>${tx.type}</td>
          <td>$${tx.amount.toFixed(2)}</td>
          <td>${tx.status}</td>
          <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
        </tr>
      `).join("");

      txCountEl.textContent = txs.length;
    } catch (err) {
      alert(err.message || "Session expired");
      logout();
    }
  }

  /* ================= ERROR HANDLING ================= */

  client.interceptors.response.use(
    res => res,
    err => Promise.reject(
      new Error(err.response?.data?.message || "Network error")
    )
  );

  return {
    init,
    login,
    logout,
    refreshUI,
    topup,
    getToken
  };
})();

window.UserPayClient = UserPayClient;
