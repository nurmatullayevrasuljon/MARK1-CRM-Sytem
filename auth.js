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
        const res = await crmApi.post("/auth/store/verify", {
          ceo_phone: phone.replace(/^\+998/, ""),
          otp: otp
        });

        const token = extractAccessToken(res.data);

        if (!token) {
          return describeError(
            {
              response: {
                status: res.status,
                data: res.data
              }
            },
            "verify /auth/store/verify (token topilmadi)"
          );
        }

        setSession(token, "store", null, remember);

        return {
          success: true,
          status: res.status,
          data: res.data,
          message: res.data?.message || "Hisob tasdiqlandi"
        };

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
    getCategories: async function () {
      try {
        const res = await crmApi.get("/category");

        return {
          success: true,
          status: res.status,
          data: res.data
        };
      } catch (error) {
        return describeError(error, "getCategories /category");
      }
    },
    createCategory: async function (data) {
      try {
        const res = await crmApi.post("/category/create", data);

        return {
          success: true,
          status: res.status,
          data: res.data
        };
      } catch (error) {
        return describeError(error, "createCategory /category/create");
      }
    },
    updateCategory: async function (categoryId, data) {
      try {
        const res = await crmApi.put(
          "/category/update",
          data,
          {
            params: {
              category_id: categoryId
            }
          }
        );

        return {
          success: true,
          status: res.status,
          data: res.data
        };
      } catch (error) {
        return describeError(
          error,
          "updateCategory /category/update"
        );
      }
    },
    deleteCategory: async function (categoryId) {
      try {
        const res = await crmApi.delete("/category/delete", {
          params: {
            category_id: categoryId
          }
        });

        return {
          success: true,
          status: res.status,
          data: res.data
        };
      } catch (error) {
        return describeError(
          error,
          "deleteCategory /category/delete"
        );
      }
    },
    getCategories: async function () {
      console.log("========== GET CATEGORIES ==========");

      try {
        const res = await crmApi.get("/category");

        console.log("SUCCESS:", true);
        console.log("STATUS:", res.status);
        console.log("CATEGORIES:", res.data);
        console.table(res.data);

        return {
          success: true,
          status: res.status,
          data: res.data
        };
      } catch (error) {
        const result = describeError(error, "getCategories /category");

        console.log("SUCCESS:", false);
        console.log("STATUS:", result.status);
        console.error("❌ GET CATEGORIES — XATO:", result.backendMessage || result.responseData);

        return result;
      }
    },
    createUser: async function (data) {
      try {
        const res = await crmApi.post("/user/create", data);

        return {
          success: true,
          status: res.status,
          data: res.data
        };
      } catch (error) {
        return describeError(error, "createUser /user/create");
      }
    },
    createSale: async function (data) {
      console.log("========== CREATE SALE ==========");

      try {
        const res = await crmApi.post("/sale/create", data);

        console.log("SUCCESS:", true);
        console.log("STATUS:", res.status);
        console.log("MESSAGE:", res.data?.message);
        console.log("SALE:", res.data?.sale);
        console.log("FULL RESULT:", res.data);

        return {
          success: true,
          status: res.status,
          data: res.data
        };

      } catch (error) {
        const result = describeError(error, "createSale /sale/create");

        console.log("SUCCESS:", false);
        console.log("STATUS:", result.status);

        console.error(
          "❌ POST /sale/create — XATO:",
          result.backendMessage || result.responseData
        );

        return result;
      }
    },
    cancelSale: async function (saleId) {
      console.log("========== CANCEL SALE ==========");
      console.log("SALE ID:", saleId);

      try {
        const res = await crmApi.delete("/sale/cancel", {
          params: {
            sale_id: saleId
          }
        });

        console.log("SUCCESS:", true);
        console.log("STATUS:", res.status);
        console.log("RESPONSE:", res.data);

        return {
          success: true,
          status: res.status,
          data: res.data
        };
      } catch (error) {
        const result = describeError(error, "cancelSale /sale/cancel");

        console.log("SUCCESS:", false);
        console.log("STATUS:", result.status);
        console.error(
          "❌ CANCEL SALE — XATO:",
          result.backendMessage || result.responseData
        );

        return result;
      }
    },
    returnSale: async function (saleId) {
      console.log("========== RETURN SALE ==========");
      console.log("SALE ID:", saleId);

      try {
        const res = await crmApi.put("/sale/return", null, {
          params: {
            sale_id: saleId
          }
        });

        console.log("SUCCESS:", true);
        console.log("STATUS:", res.status);
        console.log("RESPONSE:", res.data);

        return {
          success: true,
          status: res.status,
          data: res.data
        };

      } catch (error) {
        const result = describeError(error, "returnSale /sale/return");

        console.log("SUCCESS:", false);
        console.log("STATUS:", result.status);

        console.error(
          "❌ RETURN SALE — XATO:",
          result.backendMessage || result.responseData
        );

        return result;
      }
    },
    addSalePayment: async function (saleId, amount) {
      console.log("========== ADD SALE PAYMENT ==========");
      console.log("SALE ID:", saleId);
      console.log("AMOUNT:", amount);

      try {
        const res = await crmApi.post(
          `/sale/payment/add?sale_id=${encodeURIComponent(saleId)}`,
          {
            amount: amount
          }
        );

        console.log("SUCCESS:", true);
        console.log("STATUS:", res.status);
        console.log("RESPONSE:", res.data);

        return {
          success: true,
          status: res.status,
          data: res.data
        };
      } catch (error) {
        const result = describeError(
          error,
          "addSalePayment /sale/payment/add"
        );

        console.log("SUCCESS:", false);
        console.log("STATUS:", result.status);

        console.error(
          "❌ ADD SALE PAYMENT — XATO:",
          result.backendMessage || result.responseData
        );

        return result;
      }
    },
    getSales: async function (params = {}) {
      console.log("========== GET SALES ==========");

      try {
        const res = await crmApi.get("/sale/get", {
          params: {
            client_id: params.client_id || undefined,
            product_id: params.product_id || undefined,
            status: params.status || "active",
            start_date: params.start_date || undefined,
            end_date: params.end_date || undefined,
            sort_type: params.sort_type || undefined,
            sort_order: params.sort_order || "descending"
          }
        });

        console.log("SUCCESS:", true);
        console.log("STATUS:", res.status);
        console.log("SALES:", res.data);

        return {
          success: true,
          status: res.status,
          data: res.data
        };

      } catch (error) {
        const result = describeError(error, "getSales /sale/get");

        console.log("SUCCESS:", false);
        console.log("STATUS:", result.status);
        console.error(
          "❌ GET SALES — XATO:",
          result.backendMessage || result.responseData
        );

        return result;
      }
    },
    createClient: async function (clientData) {
      console.log("========== CREATE CLIENT ==========");

      try {
        const res = await crmApi.post("/client/create", {
          client_name: clientData.client_name,
          client_phone: clientData.client_phone
        });

        console.log("SUCCESS:", true);
        console.log("STATUS:", res.status);
        console.log("RESPONSE:", res.data);

        return {
          success: true,
          status: res.status,
          data: res.data
        };
      } catch (error) {
        const result = describeError(error, "createClient /client/create");

        console.log("SUCCESS:", false);
        console.log("STATUS:", result.status);
        console.error(
          "❌ CREATE CLIENT — XATO:",
          result.backendMessage || result.responseData
        );

        return result;
      }
    },
    updateClient: async function (clientId, clientData) {
      console.log("========== UPDATE CLIENT ==========");
      console.log("CLIENT ID:", clientId);

      try {
        const res = await crmApi.put(
          "/client/update",
          {
            client_name: clientData.client_name,
            client_phone: clientData.client_phone
          },
          {
            params: {
              client_id: clientId
            }
          }
        );

        console.log("SUCCESS:", true);
        console.log("STATUS:", res.status);
        console.log("RESPONSE:", res.data);

        return {
          success: true,
          status: res.status,
          data: res.data
        };
      } catch (error) {
        const result = describeError(
          error,
          "updateClient /client/update"
        );

        console.log("SUCCESS:", false);
        console.log("STATUS:", result.status);

        console.error(
          "❌ UPDATE CLIENT — XATO:",
          result.backendMessage || result.responseData
        );

        return result;
      }
    },
    updateUser: async function (data) {
      console.log("========== UPDATE USER ==========");

      try {
        const res = await crmApi.put("/user/update", data);

        console.log("SUCCESS:", true);
        console.log("STATUS:", res.status);
        console.log("MESSAGE:", res.data?.message);
        console.log("USER:", res.data?.user);
        console.log("FULL RESULT:", res.data);

        return {
          success: true,
          status: res.status,
          data: res.data
        };

      } catch (error) {
        const result = describeError(error, "updateUser /user/update");

        console.log("SUCCESS:", false);
        console.log("STATUS:", result.status);
        console.error(
          "❌ UPDATE USER — XATO:",
          result.backendMessage || result.responseData
        );

        return result;
      }
    },
    updateProduct: async function (productId, data) {
      console.log("========== UPDATE PRODUCT ==========");

      try {
        const res = await crmApi.put(
          `/product/update?product_id=${encodeURIComponent(productId)}`,
          {
            product_name: data.product_name,
            product_barcode: data.product_barcode,
            category_id: data.category_id,
            purchase_price: data.purchase_price,
            selling_price: data.selling_price,
            quantity: data.quantity,
            minimum_quantity: data.minimum_quantity,
            images: data.images || []
          }
        );

        console.log("SUCCESS:", true);
        console.log("STATUS:", res.status);
        console.log("MESSAGE:", res.data?.message);
        console.log("PRODUCT:", res.data?.product);

        return {
          success: true,
          status: res.status,
          url: res.config.baseURL + res.config.url,
          data: res.data
        };
      } catch (error) {
        const result = describeError(error, "updateProduct /product/update");

        console.error("❌ UPDATE PRODUCT — XATO");
        console.error("STATUS:", result.status);
        console.error("ERROR:", result.backendMessage || result.responseData);

        return result;
      }
    },
    getProducts: async function () {
      console.log("========== GET PRODUCTS ==========");

      try {
        const res = await crmApi.get("/product");

        console.log("SUCCESS:", true);
        console.log("STATUS:", res.status);
        console.log("PRODUCTS:", res.data);

        const products = Array.isArray(res.data)
          ? res.data
          : res.data?.products || [];

        console.table(products);

        return {
          success: true,
          status: res.status,
          data: res.data,
          products
        };

      } catch (error) {
        const result = describeError(error, "getProducts /product");

        console.log("SUCCESS:", false);
        console.log("STATUS:", result.status);
        console.error(
          "❌ GET PRODUCTS — XATO:",
          result.backendMessage || result.responseData
        );

        return result;
      }
    },
    updateStoreProfile: async function (data) {
      try {
        const res = await crmApi.post("/store/profile/update", data);

        return {
          success: true,
          status: res.status,
          data: res.data
        };
      } catch (error) {
        return describeError(
          error,
          "updateStoreProfile /store/profile/update"
        );
      }
    },
    createProduct: async function (data) {
      try {
        const res = await crmApi.post("/product/create", data);

        return {
          success: true,
          status: res.status,
          data: res.data
        };
      } catch (error) {
        return describeError(error, "createProduct /product/create");
      }
    },

    // ⚠️ TASDIQLANMAGAN — Swagger'da "User Profile" bo'limi ko'rinmadi.
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