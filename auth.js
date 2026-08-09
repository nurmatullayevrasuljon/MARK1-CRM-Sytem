// ============================================================
// 🔐 AUTH SYSTEM + YAGONA API CLIENT — MARK1 CRM
// Backend: https://mark1-crm-sytem.onrender.com
// Swagger: https://mark1-crm-sytem.onrender.com/api-docs/
//
// TASDIQLANGAN endpointlar (skrinshot orqali, 2026-08-08):
//   POST /auth/store/signup
//   POST /auth/store/verify
//   POST /auth/store/signin
//   POST /auth/store/refresh
//   POST /auth/store/forgot-password
//   POST /auth/store/reset-password
//   POST /auth/user/signin
//   POST /auth/user/refresh
//
// TASDIQLANMAGAN (Swagger'da "Try it out" orqali request/response
// sxemasini ochib ko'rish va tasdiqlash SHART):
//   - Har bir endpointning body maydon nomlari (full_name/fullName va h.k.)
//   - GET /user/profile/get (yoki ekvivalenti) — hozircha placeholder
//
// Butun loyihada FAQAT shu window.crmApi ishlatiladi.
// Refresh token backendda httpOnly cookie sifatida saqlanadi deb
// FARAZ QILINMOQDA (withCredentials:true) — frontend uni HECH QACHON
// localStorage/sessionStorage'da saqlamaydi.
// ============================================================
(function (global) {
  "use strict";

  // ---------- 1) YAGONA MANBA: BASE URL ----------
  const API_ROOT = "https://mark1-crm-sytem.onrender.com";
  const API_URL = API_ROOT + "/api"; // ⚠️ TASDIQLASH KERAK: backend prefiksi haqiqatan "/api" ekanini
                                      // Swagger sahifasining "Servers" bo'limidan tekshiring.

  const ACCESS_KEY = "crm_access_token";
  const ROLE_KEY = "crm_role";        // "store" | "user" — refresh qaysi endpointga borishini aniqlaydi
  const USER_KEY = "crm_current_user";

  // ---------- 2) STORAGE HELPERLARI ----------
  function store(remember) { return remember ? localStorage : sessionStorage; }
  function otherStore(remember) { return remember ? sessionStorage : localStorage; }

  function getAccessToken() {
    return localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY) || null;
  }
  function getRole() {
    return localStorage.getItem(ROLE_KEY) || sessionStorage.getItem(ROLE_KEY) || null;
  }
  function isRemembered() {
    return !!localStorage.getItem(ACCESS_KEY);
  }
  function setSession(accessToken, role, user, remember) {
    const s = store(remember);
    const other = otherStore(remember);

    s.setItem(ACCESS_KEY, accessToken || "");
    s.setItem(ROLE_KEY, role || "");
    s.setItem(USER_KEY, JSON.stringify(user || null));

    other.removeItem(ACCESS_KEY);
    other.removeItem(ROLE_KEY);
    other.removeItem(USER_KEY);
  }
  function clearSession() {
    [localStorage, sessionStorage].forEach(s => {
      s.removeItem(ACCESS_KEY);
      s.removeItem(ROLE_KEY);
      s.removeItem(USER_KEY);
      // ❗ REFRESH TOKEN HECH QACHON BU YERDA SAQLANMAGAN — o'chirishga hojat yo'q,
      // u httpOnly cookie, faqat backend uni logout endpointida o'chira oladi.
    });
  }
  function getCurrentUserRaw() {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  // Telefon raqamni backend kutgan formatga keltiradi: "+998901234567" /
  // "998901234567" / "0901234567" / "901234567" -> "901234567".
  // register() ichida xuddi shu mantiq allaqachon inline yozilgan (u yerga
  // tegilmadi — signup ishlab turibdi). Bu funksiya faqat verify/signin
  // uchun ISHLATILADI, chunki ular oldin buni umuman qilmagan edi.
  function normalizePhone(value) {
    let p = String(value || "").replace(/\D/g, "");
    if (p.startsWith("998")) p = p.slice(3);
    if (p.startsWith("0")) p = p.slice(1);
    return p;
  }

  // Backend qaysi maydon nomida access token qaytarishi noma'lum bo'lgan
  // holatlar uchun himoyalangan (defensive) ekstraktor.
  function extractAccessToken(data) {
    if (!data) return null;
    const token =
      data.access_token || data.accessToken || data.token ||
      (data.data && (data.data.access_token || data.data.accessToken || data.data.token));

    if (!token) {
      console.warn(
        "⚠️ AUTH: javobda access token topilmadi. Backend response shaklini tekshiring:",
        data
      );
    }
    return token || null;
  }

  // Xatoni ANIQ diagnostika bilan qaytaruvchi helper — "register failed"
  // kabi umumiy xabar HECH QACHON qaytarilmaydi.
  function describeError(error, context) {
    const status = error?.response?.status ?? "NO_STATUS";
    const url = (error?.config?.baseURL || "") + (error?.config?.url || "");
    const data = error?.response?.data;
    const backendMessage =
      (data && (data.detail || data.message || data.error)) || null;

    console.error(`❌ [${context}] So'rov muvaffaqiyatsiz`, {
      status,
      url,
      responseData: data,
      backendMessage,
      rawError: error
    });

    let userMessage;
    if (Array.isArray(data?.detail)) {
      userMessage = data.detail.map(d => d.msg || d.message || String(d)).join("\n");
    } else {
      userMessage = backendMessage || `Server xatosi (status: ${status}). Konsolni tekshiring.`;
    }

    return {
      success: false,
      status,
      url,
      responseData: data,
      backendMessage,
      message: userMessage
    };
  }

  // ---------- 3) YAGONA API CLIENT ----------
  const crmApi = axios.create({
    baseURL: API_URL,
    withCredentials: true // refresh token cookie backendga avtomatik boradi
  });

  // Har bir requestga Access Token qo'shiladi (agar mavjud bo'lsa)
  crmApi.interceptors.request.use(config => {
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = "Bearer " + token;
    }
    return config;
  });

  // 401 -> refresh -> qayta urinish (faqat AUTH bo'lmagan requestlar uchun)
  let isRefreshing = false;
  let waitQueue = [];

  function isAuthEndpoint(url) {
    return typeof url === "string" && url.indexOf("/auth/") !== -1;
  }

  async function performRefresh() {
    const role = getRole();

    if (!role) {
      throw new Error("Refresh uchun rol (store/user) aniqlanmadi — foydalanuvchi tizimga kirmagan.");
    }

    const path = role === "user" ? "/auth/user/refresh" : "/auth/store/refresh";

    // ❗ Refresh so'rovi crmApi orqali yuboriladi, lekin url "/auth/" ni
    // o'z ichiga olgani uchun response interceptor uni qayta refresh
    // qilishga URINMAYDI (pastdagi shart tekshiruvi bilan himoyalangan) —
    // shu tarzda cheksiz tsikl (infinite loop) oldini olinadi.
    const res = await crmApi.post(path, {}, { withCredentials: true });
    const newAccess = extractAccessToken(res.data);

    if (!newAccess) {
      throw new Error("Refresh javobida access token topilmadi.");
    }

    setSession(newAccess, role, getCurrentUserRaw(), isRemembered());
    return newAccess;
  }

  crmApi.interceptors.response.use(
    res => res,
    async error => {
      const original = error.config;
      const status = error.response && error.response.status;
      const url = (original && original.url) || "";

      // Auth endpointlarning o'zidan kelgan 401/boshqa xatolarga
      // refresh interceptor ASLO aralashmaydi (login/signup sahifasida
      // token yo'qligi sababli loop bo'lmasligi shu yerda kafolatlanadi).
      if (!original || status !== 401 || original._retried || isAuthEndpoint(url)) {
        return Promise.reject(error);
      }

      // Umuman tizimga kirilmagan bo'lsa (token yo'q) — refresh urinishning
      // mantiqiy asosi yo'q, shunchaki xatoni qaytaramiz.
      if (!getAccessToken()) {
        return Promise.reject(error);
      }

      original._retried = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          waitQueue.push({ resolve, reject });
        }).then(newToken => {
          original.headers.Authorization = "Bearer " + newToken;
          return crmApi(original);
        });
      }

      isRefreshing = true;

      try {
        const newToken = await performRefresh();
        waitQueue.forEach(p => p.resolve(newToken));
        waitQueue = [];

        original.headers.Authorization = "Bearer " + newToken;
        return crmApi(original);
      } catch (refreshErr) {
        waitQueue.forEach(p => p.reject(refreshErr));
        waitQueue = [];
        AuthSystem.logout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
  );

  global.crmApi = crmApi;

  // ---------- 4) AUTH SYSTEM ----------
  const AuthSystem = {

    // POST /auth/store/signup
    // ⚠️ TASDIQLASH KERAK: body maydon nomlari. Hozir eng ehtimolli
    // FastAPI konvensiyasi (snake_case) bilan yozilgan.
    // POST /auth/store/signup
    register: async function (data) {
    try {
        // Frontenddan +998901234567 kabi format kelsa,
        // backendga +998 qismini olib tashlab yuboramiz.
        let ceoPhone = String(data.phone || "").replace(/\D/g, "");

        // 998901234567 -> 901234567
        if (ceoPhone.startsWith("998")) {
        ceoPhone = ceoPhone.slice(3);
        }

        // 0901234567 -> 901234567
        if (ceoPhone.startsWith("0")) {
        ceoPhone = ceoPhone.slice(1);
        }

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📤 SIGNUP REQUEST");
        console.log("🌐 POST /auth/store/signup");
        console.log("📱 Original phone:", data.phone);
        console.log("📱 Backend phone:", ceoPhone);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        const res = await crmApi.post("/auth/store/signup", {
        ceo_name: data.fullName,
        ceo_phone: ceoPhone,
        store_name: data.storeName,
        password: data.password
        });

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ SIGNUP SUCCESS");
        console.log("HTTP:", res.status);
        console.log("Response:", res.data);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        return {
        success: true,
        status: res.status,
        url: res.config.baseURL + res.config.url,
        data: res.data,
        message: res.data?.message || "Hisob yaratildi."
        };

    } catch (error) {
        return describeError(error, "register /auth/store/signup");
    }
    },

    // POST /auth/store/verify
    // ✅ TASDIQLANGAN (backend jamoasi tomonidan berilgan aniq shakl):
    //    { "ceo_phone": "901234567", "otp": "12345" }
    // ❌ ILGARI: { phone, code } yuborilardi — bu backend uchun ikkalasi
    //    ham noto'g'ri nom edi (backend faqat "ceo_phone" va "otp" ni
    //    o'qiydi). Shu sabab verify HAR DOIM "Kod mos emas" yoki
    //    "Telefon raqam bo'yicha do'kon topilmadi" bilan tugar edi —
    //    aslida foydalanuvchi kiritgan kod to'g'ri bo'lsa ham.
    verify: async function ({ phone, otp, remember }) {
      try {
        const ceoPhone = normalizePhone(phone);

        const res = await crmApi.post("/auth/store/verify", {
          ceo_phone: ceoPhone,
          otp: otp
        });

        const token = extractAccessToken(res.data);
        const user = res.data.user || res.data.data || null;

        if (token) setSession(token, "store", user, remember);

        return { success: true, status: res.status, data: res.data, user };
      } catch (error) {
        return describeError(error, "verify /auth/store/verify");
      }
    },

    // POST /auth/store/signin — do'kon egasi (CEO/admin) kirishi
    // ❌ ILGARI: { phone: login, password } yuborilardi. Backend
    //    controller aynan "ceo_phone" ni o'qiydi ("phone" emas). Mongoose
    //    "undefined" qiymatli kalitni so'rovdan olib tashlaydi, shu sabab
    //    Store.findOne({ ceo_phone: undefined }) aslida
    //    Store.findOne({}) ga aylanib, bazadagi BIRINCHI do'konni
    //    qaytarardi — noto'g'ri/nomuvofiq hisobga kirish yoki "Parol mos
    //    emas" xatosi shundan kelib chiqqan.
    loginStore: async function ({ login, password, remember }) {
      try {
        const ceoPhone = normalizePhone(login);

        const res = await crmApi.post("/auth/store/signin", {
          ceo_phone: ceoPhone,
          password
        });

        const token = extractAccessToken(res.data);
        const user = res.data.user || res.data.data || null;

        if (!token) {
          return describeError(
            { response: { status: res.status, data: res.data } },
            "loginStore /auth/store/signin (token topilmadi)"
          );
        }

        setSession(token, "store", user, remember);
        return { success: true, status: res.status, data: res.data, user };
      } catch (error) {
        return describeError(error, "loginStore /auth/store/signin");
      }
    },

    // POST /auth/user/signin — xodim (employee) kirishi
    // ❌ ILGARI: { phone: login, password } yuborilardi. Backend
    //    controller "user_phone" ni o'qiydi ("phone" emas) — xuddi
    //    loginStore'dagi bilan bir xil sabab bilan buzilgan edi.
    loginUser: async function ({ login, password, remember }) {
      try {
        const userPhone = normalizePhone(login);

        const res = await crmApi.post("/auth/user/signin", {
          user_phone: userPhone,
          password
        });

        const token = extractAccessToken(res.data);
        const user = res.data.user || res.data.data || null;

        if (!token) {
          return describeError(
            { response: { status: res.status, data: res.data } },
            "loginUser /auth/user/signin (token topilmadi)"
          );
        }

        setSession(token, "user", user, remember);
        return { success: true, status: res.status, data: res.data, user };
      } catch (error) {
        return describeError(error, "loginUser /auth/user/signin");
      }
    },

    // Eski kod bilan moslik uchun: role bo'yicha avtomatik tanlaydi.
    // Agar login sahifasida "store" yoki "user" ekanligi aniq bo'lsa,
    // to'g'ridan-to'g'ri loginStore/loginUser ishlatilishi tavsiya etiladi.
    login: async function (params) {
      return this.loginStore(params);
    },

    // POST /auth/store/forgot-password
    // ❗ TUZATISH: backend controller "ceo_phone" ni o'qiydi ("phone" emas)
    // — verify/signin'dagi bilan bir xil xato shu yerda ham bor edi.
    forgotPassword: async function (phone) {
      try {
        const res = await crmApi.post("/auth/store/forgot-password", {
          ceo_phone: normalizePhone(phone)
        });
        return { success: true, status: res.status, data: res.data };
      } catch (error) {
        return describeError(error, "forgotPassword /auth/store/forgot-password");
      }
    },

    // POST /auth/store/reset-password
    // ❗ TUZATISH: backend controller { otp, ceo_phone, new_password } ni
    // o'qiydi. Ilgari { phone, code, new_password } yuborilardi.
    resetPassword: async function ({ phone, code, newPassword }) {
      try {
        const res = await crmApi.post("/auth/store/reset-password", {
          ceo_phone: normalizePhone(phone),
          otp: code,
          new_password: newPassword
        });
        return { success: true, status: res.status, data: res.data };
      } catch (error) {
        return describeError(error, "resetPassword /auth/store/reset-password");
      }
    },

    // Parol o'zgartirish endpointi skrinshotda ko'rinmadi.
    // ⚠️ TASDIQLASH KERAK: Swagger'da "Settings"/"Security" bo'limini tekshiring.
    changePassword: async function (oldPassword, newPassword) {
      try {
        const res = await crmApi.post("/api/v1/settings/security/change-password", {
          old_password: oldPassword,
          new_password: newPassword
        });
        return { success: true, status: res.status, data: res.data };
      } catch (error) {
        return describeError(error, "changePassword (endpoint tasdiqlanmagan)");
      }
    },

    // GET /store/profile/get — TASDIQLANGAN (birinchi taskda siz berdingiz)
    getStoreProfile: async function () {
      try {
        const res = await crmApi.get("/store/profile/get");
        return { success: true, status: res.status, data: res.data };
      } catch (error) {
        return describeError(error, "getStoreProfile /store/profile/get");
      }
    },

    // ⚠️ TASDIQLANMAGAN — Swagger'da "User Profile" bo'limi ko'rinmadi.
    // Real yo'l aniqlangach shu funksiya ichidagi path'ni yangilang.
    getUserProfile: async function () {
      console.warn(
        "⚠️ getUserProfile(): endpoint hali Swagger orqali tasdiqlanmagan. " +
        "Joriy taxmin: GET /user/profile/get — buni backend jamoasi bilan tekshiring."
      );
      try {
        const res = await crmApi.get("/user/profile/get");
        return { success: true, status: res.status, data: res.data };
      } catch (error) {
        return describeError(error, "getUserProfile /user/profile/get (TASDIQLANMAGAN)");
      }
    },

    // Rolga qarab to'g'ri profilni tanlaydi
    getProfile: async function () {
      const role = getRole();
      return role === "user" ? this.getUserProfile() : this.getStoreProfile();
    },

    getCurrentUser: function () { return getCurrentUserRaw(); },
    getAccessToken: getAccessToken,
    getRole: getRole,

    // Faqat lokal keshni (ism/telefon/rasm) yangilaydi.
    // CRM datasi (products/sales/debtors) BU YERDA SAQLANMAYDI.
    updateCurrentUserData: function (partial) {
      const merged = Object.assign({}, getCurrentUserRaw() || {}, partial);
      const remember = isRemembered();
      const s = store(remember);
      s.setItem(USER_KEY, JSON.stringify(merged));
      return true;
    },

    isSessionValid: function () {
      return !!getAccessToken() && !!getRole();
    },

    // ❗ MUHIM TUZATISH: "index.html" ILGARI publicPages ro'yxatida edi.
    // Lekin bu loyihada index.html — LANDING EMAS, balki DASHBOARD'ning
    // o'zi (masalaning tavsifida ham shunday: "index.html/dashboard").
    // index.html'ni public deb belgilash 2 ta oqibatga olib kelgan edi:
    //   1) protectPage(): sessiyasiz foydalanuvchi ham index.html'ni
    //      ochib qola olardi (himoyalanmagan bo'lib qolgan) — data
    //      yuklanmagani uchun "bo'sh"/singan dashboard ko'rinardi.
    //   2) logout(): index.html sahifasida logout bosilganda login.html'ga
    //      REDIRECT QILINMAS edi — sessiya tozalangan, lekin foydalanuvchi
    //      hamon "dashboard"da qolib ketardi.
    // "" (bo'sh path, ya'ni sayt ildizi "/") ham index.html bilan bir xil
    // sahifa bo'lgani uchun endi PUBLIC emas, DASHBOARD deb hisoblanadi.
    logout: function () {
      clearSession();
      const page = window.location.pathname.split("/").pop().toLowerCase();
      const publicPages = ["signup.html", "login.html", "landing.html"];
      if (!publicPages.includes(page)) {
        window.location.href = "login.html";
      }
    },

    protectPage: function () {
      const page = window.location.pathname.split("/").pop().toLowerCase();
      const publicPages = ["signup.html", "login.html", "landing.html"];
      if (!publicPages.includes(page) && !this.isSessionValid()) {
        window.location.href = "login.html";
        return false;
      }
      return true;
    },

    // ❗ TUZATISH: standart qiymat "dashboard.html" edi — loyihada bunday
    // fayl UMUMAN MAVJUD EMAS (haqiqiy dashboard fayli — index.html).
    // index.js har doim aniq "index.html" ni argument sifatida uzatadi,
    // shu sabab bu standart qiymat amalda hozircha ishlatilmayapti, lekin
    // kelajakda argumentsiz chaqirilsa noto'g'ri (mavjud bo'lmagan) sahifaga
    // yo'naltirib qo'ymasligi uchun to'g'irlandi.
    redirectIfLoggedIn: function (redirectUrl) {
      redirectUrl = redirectUrl || "index.html";
      const current = window.location.pathname.split("/").pop().toLowerCase();
      const target = redirectUrl.split("/").pop().toLowerCase();
      if (current === target) return false;
      if (this.isSessionValid()) {
        window.location.href = redirectUrl;
        return true;
      }
      return false;
    }
  };

  global.AuthSystem = AuthSystem;
  console.log("🔥 AUTH SYSTEM tayyor. baseURL =", API_URL);
})(window);