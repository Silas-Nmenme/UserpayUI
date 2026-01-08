// app.js – UserPay Frontend Client (FINAL & COMPLETE)

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

    if (!res.data?.token) {
      throw new Error("Login failed");
    }

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
    /* ===== PROFILE ===== */
    const profile = await getProfile();

    // (Optional navbar username — your HTML doesn't have it yet)
    const navUser = document.getElementById("navbar-username");
    if (navUser && profile?.username) {
      navUser.textContent = profile.username;
    }

    /* ===== BALANCE ===== */
    const wallet = await getBalance();
    const balanceEl = document.getElementById("wallet-balance");
    if (balanceEl && wallet?.balance !== undefined) {
      balanceEl.textContent = `₦${Number(wallet.balance).toFixed(2)}`;
    }

    /* ===== TRANSACTIONS ===== */
    const txBody = document.getElementById("tx-table");
    const txCountEl = document.getElementById("tx-count");
    if (!txBody) return;

    let txs = await getTransactions();

    // ✅ SAFETY: ensure array + remove bad entries
    if (!Array.isArray(txs)) txs = [];
    txs = txs.filter(tx => tx && typeof tx === "object");

    if (txCountEl) txCountEl.textContent = txs.length;

    if (txs.length === 0) {
      txBody.innerHTML =
        `<tr><td colspan="5" class="text-muted">No transactions yet</td></tr>`;
      return;
    }

    txBody.innerHTML = txs.slice(0, 5).map(tx => {
      const id = tx._id ? tx._id.slice(-6) : "—";
      const amount = Number(tx.amount || 0).toFixed(2);
      const date = tx.createdAt
        ? new Date(tx.createdAt).toLocaleDateString()
        : "—";

      let label = tx.type || "transaction";

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

      if (tx.type === "deposit") {
        label = "Top-up";
      }

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
    console.error(err);
    alert(err.message || "Session expired");
    logout();
  }
}


  /* ================= ERROR HANDLING ================= */

  client.interceptors.response.use(
    res => res,
    err =>
      Promise.reject(
        new Error(err.response?.data?.message || "Network error")
      )
  );

  /* ================= PUBLIC API ================= */

  return {
    init,
    login,
    getProfile,
    refreshUI,
    topup,
    logout,
    getToken
  };
})();

window.UserPayClient = UserPayClient;
