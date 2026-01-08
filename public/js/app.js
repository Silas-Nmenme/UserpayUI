// app.js – UserPay Frontend Client (STABLE & SAFE)

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
    if (token) {
      client.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
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
    if (!res.data || !res.data.username) {
      throw new Error("Invalid profile response");
    }
    return res.data;
  }

  function logout() {
    setToken(null);
    window.location.href = "index.html";
  }

  /* ================= WALLET ================= */

  async function getBalance() {
    const res = await client.get("/api/wallet/balance");
    return res.data || { balance: 0 };
  }

  async function topup(amount) {
    const res = await client.post("/api/wallet/topup", { amount });
    return res.data;
  }

  async function getTransactions() {
    const res = await client.get("/api/wallet/transactions");
    return Array.isArray(res.data) ? res.data : [];
  }

  async function initiateTransfer(toUsername, password, amount) {
    const res = await client.post("/api/wallet/transfer", { toUsername, password, amount });
    return res.data;
  }

  async function confirmTransfer(transactionId, otp) {
    const res = await client.post("/api/wallet/transfer/confirm", { transactionId, otp });
    return res.data;
  }

  /* ================= DASHBOARD ================= */

  async function refreshUI() {
    try {
      /* ===== PROFILE ===== */
      const profile = await getProfile();

      const navUser = document.getElementById("navbar-username");
      if (navUser) navUser.textContent = profile.username;

      /* ===== BALANCE ===== */
      const wallet = await getBalance();
      const balanceEl = document.getElementById("wallet-balance");
      if (balanceEl) {
        balanceEl.textContent = `₦${Number(wallet.balance || 0).toFixed(2)}`;
      }

      /* ===== TRANSACTIONS ===== */
      const txBody = document.getElementById("tx-table");
      const txCount = document.getElementById("tx-count");

      if (!txBody) return;

      let txs = await getTransactions();

      // HARD SAFETY
      txs = txs.filter(tx => tx && typeof tx === "object" && tx.amount !== undefined);

      if (txCount) txCount.textContent = txs.length;

      if (!txs.length) {
        txBody.innerHTML =
          `<tr><td colspan="5" class="text-muted">No transactions yet</td></tr>`;
        return;
      }

      txBody.innerHTML = txs.slice(0, 5).map(tx => {
        const id = tx._id ? tx._id.slice(-6) : "—";
        const amount = Number(tx.amount).toFixed(2);
        const date = tx.createdAt
          ? new Date(tx.createdAt).toLocaleDateString()
          : "—";

        let label = tx.type || "Transaction";

        if (tx.type === "transfer") {
          const from =
            typeof tx.fromUser === "object"
              ? tx.fromUser.username
              : tx.fromUser;

          const to =
            typeof tx.toUser === "object"
              ? tx.toUser.username
              : tx.toUser;

          label =
            from === profile.username
              ? `Sent → ${to || "user"}`
              : `Received ← ${from || "user"}`;
        }

        if (tx.type === "deposit") label = "Top-up";

        return `
          <tr>
            <td>${id}</td>
            <td>${label}</td>
            <td>₦${amount}</td>
            <td>${tx.status || "completed"}</td>
            <td>${date}</td>
          </tr>
        `;
      }).join("");

    } catch (err) {
      console.error("Dashboard error:", err);
      alert("Session expired. Please login again.");
      logout();
    }
  }

  /* ================= AXIOS ERRORS ================= */

  client.interceptors.response.use(
    res => res,
    err => Promise.reject(
      new Error(err.response?.data?.message || "Network error")
    )
  );

  /* ================= PUBLIC API ================= */

  return {
    init,
    login,
    refreshUI,
    getProfile,
    topup,
    logout,
    getToken,
    initiateTransfer,
    confirmTransfer
  };
})();

window.UserPayClient = UserPayClient;
