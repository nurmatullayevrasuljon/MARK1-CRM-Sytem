// ============================================================
// 🔐 YAGONA AUTH + API CLIENT
// Backend: https://mark1-crm-sytem.onrender.com
// Butun loyihada FAQAT shu window.crmApi ishlatiladi.
// ============================================================
(function (global) {
  "use strict";

  const BASE_URL = "https://mark1-crm-sytem.onrender.com";
  const ACCESS_KEY = "crm_access_token";
  const REFRESH_KEY = "crm_refresh_token";
  const USER_KEY = "crm_current_user";

  function store(remember) { return remember ? localStorage : sessionStorage; }
  function otherStore(remember) { return remember ? sessionStorage : localStorage; }

  function getAccessToken() {
    return localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY);
  }
  function getRefreshToken() {
    return localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY);
  }
  function isRemembered() {
    return !!localStorage.getItem(ACCESS_KEY);
  }
  function setTokens(access, refresh, remember) {
    store(remember).setItem(ACCESS_KEY, access || "");
    if (refresh) store(remember).setItem(REFRESH_KEY, refresh);
    otherStore(remember).removeItem(ACCESS_KEY);
    otherStore(remember).removeItem(REFRESH_KEY);
  }
  function clearTokens() {
    [localStorage, sessionStorage].forEach(s => {
      s.removeItem(ACCESS_KEY);
      s.removeItem(REFRESH_KEY);
      s.removeItem(USER_KEY);
    });
  }
  function getCurrentUserRaw() {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function setCurrentUser(user, remember) {
    store(remember).setItem(USER_KEY, JSON.stringify(user || null));
    otherStore(remember).removeItem(USER_KEY);
  }
  function getErrMsg(error, fallback) {
    const detail = error?.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map(d => d.msg || d.message || String(d)).join("\n");
    if (typeof detail === "string") return detail;
    return fallback || "Server bilan bog'lanishda xatolik yuz berdi.";
  }

  // ---------- YAGONA API CLIENT ----------
  const crmApi = axios.create({ baseURL: BASE_URL });

  crmApi.interceptors.request.use(config => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = "Bearer " + token;
    return config;
  });

  let isRefreshing = false;
  let queue = [];

  crmApi.interceptors.response.use(
    res => res,
    async error => {
      const original = error.config;
      const status = error.response && error.response.status;

      if (status !== 401 || original._retried || !original) {
        return Promise.reject(error);
      }

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        AuthSystem.logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }))
          .then(token => {
            original._retried = true;
            original.headers.Authorization = "Bearer " + token;
            return crmApi(original);
          });
      }

      isRefreshing = true;
      original._retried = true;

      try {
        // ⚠️ ANIQLASH KERAK: aniq refresh endpoint nomini backend jamoasidan tasdiqlang
        const resp = await axios.post(BASE_URL + "/api/v1/auth/refresh", {
          refresh_token: refreshToken
        });
        const newAccess = resp.data.access_token;
        const newRefresh = resp.data.refresh_token || refreshToken;

        setTokens(newAccess, newRefresh, isRemembered());
        queue.forEach(p => p.resolve(newAccess));
        queue = [];

        original.headers.Authorization = "Bearer " + newAccess;
        return crmApi(original);
      } catch (refreshErr) {
        queue.forEach(p => p.reject(refreshErr));
        queue = [];
        AuthSystem.logout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
  );

  global.crmApi = crmApi;

  // ---------- AUTH SYSTEM ----------
  const AuthSystem = {
    // ⚠️ /api/v1/auth/register, /verify, /login yo'llarini backend bilan tasdiqlang
    register: async function (data) {
      try {
        const res = await crmApi.post("/api/v1/auth/register", {
          full_name: data.fullName,
          phone: data.phone,
          company_name: data.storeName,
          password: data.password
        });
        return { success: true, code: "REGISTER_SUCCESS", data: res.data,
          message: "Tasdiqlash kodi telefon raqamingizga yuborildi." };
      } catch (error) {
        return { success: false, message: getErrMsg(error, "Ro'yxatdan o'tishda xatolik yuz berdi.") };
      }
    },

    verify: async function ({ phone, otp, remember }) {
      try {
        const res = await crmApi.post("/api/v1/auth/verify", { phone, code: otp });
        setTokens(res.data.access_token, res.data.refresh_token, remember);
        setCurrentUser(res.data.user, remember);
        return { success: true, user: res.data.user };
      } catch (error) {
        return { success: false, message: getErrMsg(error, "Kod noto'g'ri yoki muddati o'tgan.") };
      }
    },

    login: async function ({ login, password, remember }) {
      try {
        const res = await crmApi.post("/api/v1/auth/login", { phone: login, password });
        setTokens(res.data.access_token, res.data.refresh_token, remember);
        setCurrentUser(res.data.user, remember);
        return { success: true, user: res.data.user };
      } catch (error) {
        return { success: false, message: getErrMsg(error, "Telefon raqam yoki parol noto'g'ri!") };
      }
    },

    changePassword: async function (oldPassword, newPassword) {
      try {
        await crmApi.post("/api/v1/auth/change-password", {
          old_password: oldPassword, new_password: newPassword
        });
        return { success: true, message: "Parol muvaffaqiyatli o'zgartirildi!" };
      } catch (error) {
        return { success: false, message: getErrMsg(error, "Parolni o'zgartirishda xatolik.") };
      }
    },

    getCurrentUser: function () { return getCurrentUserRaw(); },
    getAccessToken: getAccessToken,

    // ✅ Endi bu FAQAT user profil keshini yangilaydi (ism/telefon/rasm).
    // products/sales/debtors kabi CRM data endi bu yerda umuman saqlanmaydi —
    // ular FAQAT backendda, script.js to'g'ridan-to'g'ri crmApi orqali oladi.
    updateCurrentUserData: function (partial) {
      const merged = Object.assign({}, getCurrentUserRaw() || {}, partial);
      setCurrentUser(merged, isRemembered());
      return true;
    },

    isSessionValid: function () {
      return !!getAccessToken() && !!getCurrentUserRaw();
    },

    logout: function () {
      clearTokens();
      const page = window.location.pathname.split("/").pop().toLowerCase();
      const publicPages = ["", "index.html", "signup.html", "login.html", "landing.html"];
      if (!publicPages.includes(page)) window.location.href = "login.html";
    },

    protectPage: function () {
      const page = window.location.pathname.split("/").pop().toLowerCase();
      const publicPages = ["", "index.html", "signup.html", "login.html", "landing.html"];
      if (!publicPages.includes(page) && !this.isSessionValid()) {
        window.location.href = "login.html";
        return false;
      }
      return true;
    },

    redirectIfLoggedIn: function (redirectUrl) {
      redirectUrl = redirectUrl || "dashboard.html";
      const current = window.location.pathname.split("/").pop().toLowerCase();
      const target = redirectUrl.split("/").pop().toLowerCase();
      if (current === target) return false;
      if (this.isSessionValid()) { window.location.href = redirectUrl; return true; }
      return false;
    }
  };

  global.AuthSystem = AuthSystem;
  console.log("🔥 AUTH SYSTEM (JWT, backend-only) tayyor");
})(window);