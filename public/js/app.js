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

  async function register(email, password) {
    const res = await client.post("/auth/register", { email, password });
    return res.data;
  }

  async function login(email, password) {
    const res = await client.post("/auth/login", { email, password });

    if (!res.data?.token) throw new Error("Login failed");

    setToken(res.data.token);
    return res.data.user;
  }

  async function resendVerification(email) {
    const res = await client.post("/auth/resend-verification", { email });
    return res.data;
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

  /* ================= CRYPTO ================= */

  async function getCryptoBalance() {
    const res = await client.get("/api/crypto/balance");
    const data = res.data;
    if (data && data.cryptoBalances) {
      return data;
    } else {
      return { cryptoBalances: data || { BTC: 0, ETH: 0, USDT: 0 }, cryptoAddresses: {}, cryptoMemos: {} };
    }
  }

  async function cryptoTopup(currency, amount) {
    const res = await client.post("/api/crypto/topup", { cryptoType: currency, amount });
    return res.data;
  }

  async function getCryptoTransactions() {
    const res = await client.get("/api/crypto/transactions");
    return Array.isArray(res.data) ? res.data : [];
  }

  async function sendCrypto(toAddress, currency, amount, password, memo) {
    const res = await client.post("/api/crypto/send", { toAddress, cryptoType: currency, amount, password, memo });
    return res.data;
  }

  async function confirmCryptoSend(transactionId, otp) {
    const res = await client.post("/api/crypto/send/confirm", { transactionId, otp });
    return res.data;
  }

  /* ================= DASHBOARD ================= */

  async function refreshUI() {
    let profile = { username: "User" };
    let wallet = { balance: 0 };
    let txs = [];

    /* ===== PROFILE ===== */
    try {
      profile = await getProfile();
    } catch (err) {
      console.error("Failed to load profile:", err);
      if (err.status === 401 || err.status === 403) {
        alert("Session expired. Please login again.");
        logout();
        return;
      }
    }

    const navUser = document.getElementById("navbar-username");
    if (navUser) navUser.textContent = profile.username;

    /* ===== BALANCE ===== */
    try {
      wallet = await getBalance();
    } catch (err) {
      console.error("Failed to load balance:", err);
      if (err.status === 401 || err.status === 403) {
        alert("Session expired. Please login again.");
        logout();
        return;
      }
    }

    const balanceEl = document.getElementById("wallet-balance");
    if (balanceEl) {
      balanceEl.textContent = `₦${Number(wallet.balance || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }

    /* ===== TRANSACTIONS ===== */
    const txBody = document.getElementById("tx-table");
    const txCount = document.getElementById("tx-count");
    const totalSentEl = document.getElementById("total-sent");
    const totalReceivedEl = document.getElementById("total-received");

    if (txBody) {
      try {
        txs = await getTransactions();
        // HARD SAFETY
        txs = txs.filter(tx => tx && typeof tx === "object" && tx.amount !== undefined);
      } catch (err) {
        console.error("Failed to load transactions:", err);
        if (err.status === 401 || err.status === 403) {
          alert("Session expired. Please login again.");
          logout();
          return;
        }
        txs = [];
      }

      if (txCount) txCount.textContent = txs.length;

      // Calculate totals
      let totalSent = 0;
      let totalReceived = 0;
      txs.forEach(tx => {
        const amount = Number(tx.amount);
        if (tx.type === "transfer") {
          const from = tx.fromUser && typeof tx.fromUser === "object" ? tx.fromUser.username : tx.fromUser;
          const to = tx.toUser && typeof tx.toUser === "object" ? tx.toUser.username : tx.toUser;
          if (from === profile.username) {
            totalSent += amount;
          } else if (to === profile.username) {
            totalReceived += amount;
          }
        } else if (tx.type === "deposit") {
          totalReceived += amount;
        }
      });

      if (totalSentEl) totalSentEl.textContent = `₦${totalSent.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      if (totalReceivedEl) totalReceivedEl.textContent = `₦${totalReceived.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

      if (!txs.length) {
        txBody.innerHTML = `<tr><td colspan="5" class="text-muted">No transactions yet</td></tr>`;
      } else {
        txBody.innerHTML = txs.slice(0, 5).map(tx => {
          const id = tx._id ? tx._id.slice(-6) : "—";
          const amount = Number(tx.amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
          const date = tx.createdAt
            ? new Date(tx.createdAt).toLocaleDateString()
            : "—";

          let label = tx.type || "Transaction";

          if (tx.type === "transfer") {
            const from =
              tx.fromUser && typeof tx.fromUser === "object"
                ? tx.fromUser.username
                : tx.fromUser;

            const to =
              tx.toUser && typeof tx.toUser === "object"
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
      }
    }
  }

  /* ================= AXIOS ERRORS ================= */

  client.interceptors.response.use(
    res => res,
    err => {
      const error = new Error(err.response?.data?.message || "Network error");
      error.status = err.response?.status;
      return Promise.reject(error);
    }
  );

  /* ================= PUBLIC API ================= */

  return {
    init,
    register,
    login,
    resendVerification,
    refreshUI,
    getProfile,
    getBalance,
    getTransactions,
    topup,
    logout,
    getToken,
    initiateTransfer,
    confirmTransfer,
    getCryptoBalance,
    cryptoTopup,
    getCryptoTransactions,
    sendCrypto,
    confirmCryptoSend
  };
})();

window.UserPayClient = UserPayClient;
