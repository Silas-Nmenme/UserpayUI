const UserPayClient = (function(){
  const API_BASE = 'https://user-pay.vercel.app';
  const TOKEN_KEY = 'userpay_token';
  const client = axios.create({ baseURL: API_BASE, timeout: 15000 });

  function setToken(token){
    if(token){
      localStorage.setItem(TOKEN_KEY, token);
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem(TOKEN_KEY);
      delete client.defaults.headers.common['Authorization'];
    }
  }

  function getToken(){
    return localStorage.getItem(TOKEN_KEY) || null;
  }

  async function init(){
    const t = getToken();
    if(t) client.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    bindUI();
  }

  function bindUI(){
    document.getElementById('refresh-btn')?.addEventListener('click', ()=>{ refreshUI(); });
    const sendForm = document.getElementById('send-form');
    if(sendForm) sendForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const to = document.getElementById('send-username').value.trim();
      const amount = Number(document.getElementById('send-amount').value);
      const note = document.getElementById('send-note').value.trim();
      try{
        await sendMoney(to, amount, note);
        const modal = bootstrap.Modal.getInstance(document.getElementById('sendModal'));
        modal?.hide();
        await refreshUI();
        alert('Transfer successful');
      }catch(err){
        alert(err?.response?.data?.message || err?.message || 'Send failed');
      }
    });
  }

  async function login(email, password){
    const res = await client.post('/api/auth/login', { email, password });
    const token = res?.data?.token || res?.data?.accessToken || null;
    if(!token) throw new Error('No token returned from server');
    setToken(token);
    return token;
  }

  async function register(email, password){
    await client.post('/api/auth/register', { email, password });
    return true;
  }

  async function resendVerification(email){
    await client.post('/api/auth/resend-verification', { email });
    return true;
  }

  function logout(){
    setToken(null);
    window.location.href = 'index.html';
  }

  async function getProfile(){
    try{
      const res = await client.get('/api/auth/me');
      return res.data;
    }catch(e){
      try{ const r2 = await client.get('/api/users/me'); return r2.data; }catch(_){ return null; }
    }
  }

  async function getBalance(){
    try{
      const res = await client.get('/api/wallet');
      return res?.data?.balance ?? 0;
    }catch(e){
      try{ const r2 = await client.get('/api/balance'); return r2?.data?.balance ?? 0;}catch(_){ return 0; }
    }
  }

  async function getTransactions(){
    try{
      const res = await client.get('/api/transactions');
      return res.data || [];
    }catch(e){
      return [];
    }
  }

  async function sendMoney(username, amount, note){
    if(!username) throw new Error('Recipient is required');
    if(!amount || amount <= 0) throw new Error('Amount must be greater than zero');
    // Try multiple endpoint shapes
    try{
      return (await client.post('/api/wallet/send', { toUsername: username, amount, note })).data;
    }catch(err){
      try{ return (await client.post('/api/transfer', { to: username, amount, note })).data; }catch(e){ throw err; }
    }
  }

  async function topup(amount){
    if(!amount || amount <= 0) throw new Error('Amount must be greater than zero');
    try{
      return (await client.post('/api/wallet/topup', { amount })).data;
    }catch(err){
      try{ return (await client.post('/api/topup', { amount })).data; }catch(e){ throw err; }
    }
  }

  async function refreshUI(){
    const profile = await getProfile();
    const isLoggedIn = !!profile;
    // header buttons
    const nav = document.querySelector('.navbar-nav');
    if(nav){
      // show username & logout when logged in
      if(isLoggedIn){
        const existing = document.getElementById('userpay-user');
        if(!existing){
          const li = document.createElement('div');
          li.className = 'd-flex align-items-center gap-2';
          li.id = 'userpay-user';
          li.innerHTML = `<span class="text-muted me-2">${profile.username||profile.name||profile.email}</span><button class="btn btn-sm btn-outline-secondary" id="logout-btn">Logout</button>`;
          nav.appendChild(li);
          document.getElementById('logout-btn').addEventListener('click', ()=>logout());
          // enable send button to open modal
          document.querySelectorAll('.btn-sm.btn-primary').forEach(b=>{ b.addEventListener('click', ()=>{ const m = new bootstrap.Modal(document.getElementById('sendModal')); m.show(); }); });
        }
      }
    }

    const bal = await getBalance();
    // animate balance count up
    const balEl = document.getElementById('wallet-balance');
    const availEl = document.getElementById('available-amount');
    if(balEl){ animateCountUp(balEl, Number(bal)); }
    if(availEl){ animateCountUp(availEl, Number(bal)); }

    const tx = await getTransactions();
    const tbody = document.getElementById('tx-table');
    if(tbody){
      tbody.innerHTML = '';
      if(!tx.length) tbody.innerHTML = '<tr><td colspan="4" class="text-muted">No transactions yet</td></tr>';
      else{
        tx.forEach((t,i)=>{
          const tr = document.createElement('tr');
          tr.className = 'reveal-right';
          tr.innerHTML = `<td>${t.ref||t._id||'—'}</td><td>${t.type||t.kind||'—'}</td><td>$${Number(t.amount||0).toFixed(2)}</td><td>${t.status||'—'}</td>`;
          tbody.appendChild(tr);
          // stagger reveal
          setTimeout(()=> tr.classList.add('visible'), 80 * i);
        });
      }
    }
    // ensure scroll reveal observers are active
    revealAll();
  }

  // animate numeric count up for balance elements
  function animateCountUp(el, to){
    const start = 0;
    const duration = 700;
    const startTime = performance.now();
    function step(now){
      const t = Math.min(1, (now - startTime)/duration);
      const value = start + (to - start) * easeOutCubic(t);
      el.textContent = `$${value.toFixed(2)}`;
      if(t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function easeOutCubic(t){ return (--t)*t*t+1; }

  // Reveal on scroll using IntersectionObserver
  let _observer = null;
  function revealAll(){
    const els = document.querySelectorAll('.reveal, .reveal-right');
    if(!_observer){
      _observer = new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){ entry.target.classList.add('visible'); }
        });
      }, { threshold: 0.12 });
    }
    els.forEach(el=> _observer.observe(el));
  }

  return {
    init, login, register, resendVerification, logout, getProfile, getBalance, getTransactions, sendMoney, topup, refreshUI, setToken
  };
})();

window.UserPayClient = UserPayClient;
