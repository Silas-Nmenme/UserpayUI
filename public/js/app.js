// app.js – UserPay Frontend Client (Fully Backend-Aligned)

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

  async function getProfile() {
    const res = await client.get("/auth/profile");
    return res.data;
  }

  function logout() {
    setToken(null);
    window.location.href = "index.html";
  }

  /* ================= WALLET ================= */

  async function getBalance() {
    const res = await client.get("/api/wallet/balance");
    return res.data; // { balance, username }
  }

  async function topup(amount) {
    const res = await client.post("/api/wallet/topup", { amount });
    return res.data;
  }

  async function getTransactions() {
    const res = await client.get("/api/wallet/transactions");
    return Array.isArray(res.data) ? res.data : [];
  }

  /* ================= DASHBOARD UI ================= */

  async function refreshUI() {
    try {
      /* ---- PROFILE ---- */
      const profile = await getProfile();

      // Navbar username
      const navUser = document.getElementById("navbar-username");
      if (navUser) navUser.textContent = profile.username;

      /* ---- BALANCE ---- */
      const wallet = await getBalance();
      const balanceEl = document.getElementById("wallet-balance");
      if (balanceEl) {
        balanceEl.textContent = `$${Number(wallet.balance).toFixed(2)}`;
      }

      /* ---- TRANSACTIONS ---- */
      const txBody = document.getElementById("tx-table");
      const txCountEl = document.getElementById("tx-count");

      if (!txBody) return;

      const txs = await getTransactions();

      if (!txs.length) {
        txBody.innerHTML =
          `<tr><td colspan="5" class="text-muted">No transactions yet</td></tr>`;
        if (txCountEl) txCountEl.textContent = "0";
        return;
      }

      txBody.innerHTML = txs.slice(0, 5).map(tx => {
        const id = tx._id?.slice(-6) || "—";
        const amount = Number(tx.amount || 0).toFixed(2);
        const date = tx.createdAt
          ? new Date(tx.createdAt).toLocaleDateString()
          : "—";

        // Determine direction
        let direction = tx.type;
        if (tx.type === "transfer") {
          direction = tx.fromUser?.username === profile.username
            ? `Sent → ${tx.toUser?.username}`
            : `Received ← ${tx.fromUser?.username}`;
        } else if (tx.type === "deposit") {
          direction = "Top-up";
        }

        return `
          <tr>
            <td>${id}</td>
            <td>${direction}</td>
            <td>$${amount}</td>
            <td>${tx.status || "completed"}</td>
            <td>${date}</td>
          </tr>
        `;
      }).join("");

      if (txCountEl) txCountEl.textContent = txs.length;
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
    refreshUI,
    topup,
    logout,
    getToken
  };
})();

window.UserPayClient = UserPayClient;
