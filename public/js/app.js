const UserPayClient = (function(){
  const API_BASE = 'https://userpay.vercel.app/';
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
    // Simplified: no wallet or transaction bindings
  }

  async function login(email, password){
    const res = await client.post('/auth/login', { email, password });
    const token = res?.data?.token || res?.data?.accessToken || null;
    if(!token) throw new Error('No token returned from server');
    setToken(token);
    return res.data;
  }

  async function register(email, password){
    const res = await client.post('/auth/register', { email, password });
    return res.data.message;
  }

  async function resendVerification(email){
    const res = await client.post('/auth/resend-verification', { email });
    return res.data.message;
  }

  async function getProfile(){
    const res = await client.get('/auth/profile');
    return res.data;
  }

  function logout(){
    setToken(null);
    window.location.href = 'index.html';
  }

  return {
    init, login, register, resendVerification, getProfile, logout, setToken, getToken
  };
})();

window.UserPayClient = UserPayClient;
