var AuthSystem = window.AuthSystem = (function () {
    "use strict";

    // ⚠️ VAQTINCHALIK: bu ngrok manzili har safar tunnel qayta ishga tushganda
    // o'zgaradi. Backend doimiy serverga (Render/Railway/VPS) chiqarilgach,
    // shu joyni doimiy manzil bilan almashtiring.
    const API_URL = "https://mark1-crm-sytem.onrender.com/api";
    window.CRM_API_URL = API_URL;

    // ✅ YANGI: ngrok bepul tarifi brauzerdan kelgan so'rovlarga avval
    // "warning" HTML sahifasini qaytaradi (CORS headersiz) — shu header
    // bilan uni chetlab o'tamiz. Backend doimiy domenga ko'chirilgach,
    // bu qatorni olib tashlash mumkin (zarari yo'q, shunchaki keraksiz bo'ladi).
    const NGROK_BYPASS_HEADERS = { "ngrok-skip-browser-warning": "true" };

    const CURRENT_USER_KEY = "crm_current_user";
    const SESSION_KEY = "crm_session_active";
    const OLD_USER_KEY = "currentUser";
    const OLD_SESSION_KEY = "isLoggedIn";
    const ACCESS_TOKEN_KEY = "access_token";
    // ✅ YANGI: refresh_token endi backend tomonidan httpOnly cookie orqali
    // boshqariladi — JS unga umuman kira olmaydi. Bu kalit faqat eski
    // funksiya signaturalarini buzmaslik uchun saqlanmoqda, hech qachon
    // haqiqiy qiymat bilan to'ldirilmaydi.
    const REFRESH_TOKEN_KEY = "refresh_token";
    // ✅ YANGI: hisob turi — "store" (do'kon egasi/CEO) yoki "user" (xodim).
    // Refresh va profil endpointlari hisob turiga qarab tanlanadi.
    const ACCOUNT_TYPE_KEY = "crm_account_type";
    const AUTH_REDIRECT_KEY = "crm_auth_redirect";
    const TOKEN_SKEW_MS = 30000;
    const LOGIN_PAGE = "login.html";
    const DASHBOARD_PAGE = "index.html";

    let refreshPromise = null;

    // ✅ YANGI: withCredentials: true — httpOnly refreshToken cookie
    // brauzer tomonidan yuborilishi/qabul qilinishi uchun SHART.
    const crmApi = axios.create({
        baseURL: API_URL,
        withCredentials: true,
        headers: { ...NGROK_BYPASS_HEADERS }
    });

    window.crmApi = crmApi;

    function safeJsonParse(value, fallback) {
        try {
            return value ? JSON.parse(value) : fallback;
        } catch {
            return fallback;
        }
    }

    function getStoredValue(key) {
        return localStorage.getItem(key) || sessionStorage.getItem(key);
    }

    function getStorageForExistingSession() {
        if (
            localStorage.getItem(ACCESS_TOKEN_KEY) ||
            localStorage.getItem(SESSION_KEY) === "true" ||
            localStorage.getItem(OLD_SESSION_KEY) === "true"
        ) {
            return localStorage;
        }

        return sessionStorage;
    }

    // ✅ FIX (o'zgarmadi): Akkauntlar orasida ma'lumot sizib chiqmasligi uchun —
    // login/logout paytida barcha CRM ma'lumotlar keshini tozalaydigan funksiya.
    function clearAppDataCache() {
        [
            "products",
            "categories",
            "sales",
            "crmDebtors",
            "crmPaidDebtors",
            "smsHistory",
            "crm_statistics",
            "currentSaleSessionId",
            "currentSalesDate",
            "yesterdaySalesTotal",
            "profile_data",
            "profile_avatar",
            "activePage",
            "activePageTitle",
            "activeMobileSection"
        ].forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        Object.keys(localStorage).forEach(key => {
            if (
                key.indexOf("last_sms_") === 0 ||
                key.indexOf("last_auto_sms_") === 0 ||
                key.indexOf("last_overdue_sms_") === 0
            ) {
                localStorage.removeItem(key);
            }
        });
    }

    function clearSessionOnly() {
        [
            CURRENT_USER_KEY,
            SESSION_KEY,
            OLD_USER_KEY,
            OLD_SESSION_KEY,
            ACCESS_TOKEN_KEY,
            REFRESH_TOKEN_KEY,
            ACCOUNT_TYPE_KEY,
            AUTH_REDIRECT_KEY
        ].forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        clearAppDataCache();

        delete crmApi.defaults.headers.common.Authorization;
    }

    function clearTokensOnly() {
        [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, ACCOUNT_TYPE_KEY].forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
    }

    // ✅ YANGI: backend maydon nomlari butunlay boshqacha —
    // ceo_name/user_name, store_name, profile_picture.
    // script.js hali ham .fullName / .storeName / .avatar kutadi —
    // shuning uchun shu nomlarga map qilamiz, mavjud kodni buzmaslik uchun.
    function normalizeUser(user, accountType) {
        user = user || {};

        const cleaned = { ...user };
        // Xavfsizlik: parol/OTP maydonlari hech qachon local keshda saqlanmasin
        delete cleaned.password;
        delete cleaned.otp;
        delete cleaned.otp_expires_at;

        return {
            ...cleaned,
            fullName: user.ceo_name || user.user_name || user.fullName || "",
            storeName: user.store_name || user.storeName || "",
            userId: user._id || user.id || user.userId || null,
            avatar: user.profile_picture || user.avatar || null,
            phone: user.ceo_phone || user.user_phone || user.phone || "",
            role: user.role || (accountType === "user" ? "" : "ceo"),
            accountType: accountType || user.accountType || null
        };
    }

    function saveSession(user, remember, accountType) {
        const storage = remember ? localStorage : sessionStorage;
        const cleanUser = normalizeUser(user, accountType);

        storage.setItem(CURRENT_USER_KEY, JSON.stringify(cleanUser));
        storage.setItem(SESSION_KEY, "true");
        storage.setItem(OLD_USER_KEY, JSON.stringify(cleanUser));
        storage.setItem(OLD_SESSION_KEY, "true");
    }

    // ✅ YANGI: endi faqat access_token saqlanadi. refresh_token backendda
    // httpOnly cookie sifatida turadi, JS uni o'qiy olmaydi va saqlamaydi.
    function saveTokens(tokens, remember) {
        const storage = remember ? localStorage : sessionStorage;
        const accessToken = tokens && tokens.access_token;

        if (!accessToken) {
            throw new Error("Access token topilmadi.");
        }

        storage.setItem(ACCESS_TOKEN_KEY, accessToken);
        storage.setItem(SESSION_KEY, "true");
        storage.setItem(OLD_SESSION_KEY, "true");
    }

    function setAccountType(kind) {
        const storage = rememberCurrentSession() ? localStorage : sessionStorage;
        storage.setItem(ACCOUNT_TYPE_KEY, kind);
    }

    function getAccountType() {
        return getStoredValue(ACCOUNT_TYPE_KEY) || null;
    }

    function setAuthorizationHeader(token) {
        if (token) {
            crmApi.defaults.headers.common.Authorization = `Bearer ${token}`;
        } else {
            delete crmApi.defaults.headers.common.Authorization;
        }
    }

    function getAccessToken() {
        return getStoredValue(ACCESS_TOKEN_KEY);
    }

    // ⚠️ DEPRECATED: refresh_token endi JS uchun mavjud emas (httpOnly cookie).
    // Funksiya faqat eski chaqiruvlar sinmasligi uchun qoldirilgan — doim null qaytaradi.
    function getRefreshToken() {
        return null;
    }

    function decodeJwtPayload(token) {
        if (!token || token.split(".").length < 2) return null;

        try {
            const base64 = token
                .split(".")[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/");
            const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
            const json = decodeURIComponent(
                atob(padded)
                    .split("")
                    .map(char => "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2))
                    .join("")
            );

            return JSON.parse(json);
        } catch {
            return null;
        }
    }

    function getTokenExpiresAt(token) {
        const payload = decodeJwtPayload(token);
        return payload && payload.exp ? payload.exp * 1000 : null;
    }

    function isTokenFresh(token) {
        const expiresAt = getTokenExpiresAt(token);

        if (!token) return false;
        if (!expiresAt) return true;

        return Date.now() + TOKEN_SKEW_MS < expiresAt;
    }

    // ✅ YANGI: yangi backendda barcha auth endpointlar /api/auth/... prefiksida
    function isAuthEndpoint(url) {
        return String(url || "").includes("/api/auth/");
    }

    // ✅ YANGI: yangi backend xato formati { message: "..." },
    // FastAPI'ning { detail: [...] } formati emas.
    function getErrorMessage(error, fallback) {
        const data = error && error.response && error.response.data;

        if (data && typeof data.message === "string" && data.message.trim()) {
            return data.message;
        }

        // Eski format bilan mos kelib qolsa ham ishlashi uchun (xavfsizlik uchun qoldirildi)
        const detail = data && data.detail;
        if (Array.isArray(detail) && detail.length) {
            return detail.map(item => item.msg || item.message || String(item)).join("\n");
        }
        if (typeof detail === "string") {
            return detail;
        }

        return fallback || "Server bilan bog'lanishda xatolik yuz berdi.";
    }

    // ✅ YANGI: "topilmadi" xabarini aniqlash — login()da do'kon/xodim
    // hisoblari orasida avtomatik tanlash uchun ishlatiladi.
    function isAccountNotFoundError(error) {
        const message = getErrorMessage(error, "");
        return typeof message === "string" && message.indexOf("topilmadi") !== -1;
    }

    // ✅ YANGI: backend ceo_phone/user_phone uchun aynan 9 xonali raqam kutadi
    // (masalan "901234567"), "+998" yoki bo'sh joylarsiz.
    function normalizePhone(raw) {
        let digits = String(raw || "").replace(/\D/g, "");

        if (digits.length > 9 && digits.indexOf("998") === 0) {
            digits = digits.slice(3);
        }

        if (digits.length > 9) {
            digits = digits.slice(-9);
        }

        return digits;
    }

    function redirectTo(url) {
        const currentPage = window.location.pathname.split("/").pop().toLowerCase();
        const targetPage = String(url || "").split("/").pop().toLowerCase();

        if (currentPage !== targetPage) {
            window.location.href = url;
        }
    }

    function isPublicPage() {
        const page = window.location.pathname.toLowerCase();
        const currentPage = page.split("/").pop();
        const publicPages = [
            "",
            "/",
            "w-page.html",
            "signup.html",
            "login.html",
            "landing.html"
        ];

        return publicPages.includes(currentPage) || page.endsWith("/");
    }

    function rememberCurrentSession() {
        return getStorageForExistingSession() === localStorage;
    }

    // ✅ YANGI: yangi backendda logout endpointi umuman yo'q (swaggerda ko'rsatilmagan).
    // Shu sabab server tomonda hech narsa chaqirilmaydi — faqat local sessiya tozalanadi.
    // ⚠️ DIQQAT: bu refreshToken cookie'sini serverda bekor qilmaydi (u hali ham
    // 7 kun amal qiladi). Buni Jasurbekka aytib, /api/auth/*/logout endpointi
    // qo'shishni so'rash tavsiya etiladi.
    function logoutInternal(options) {
        options = options || {};

        refreshPromise = null;
        clearSessionOnly();

        if (options.redirect !== false) {
            redirectTo(options.redirectUrl || LOGIN_PAGE);
        }
    }

    function refreshEndpointFor(accountType) {
        return accountType === "user" ? "/api/auth/user/refresh" : "/api/auth/store/refresh";
    }

    function profileEndpointFor(accountType) {
        return accountType === "user" ? "/api/user/profile/get" : "/api/store/profile/get";
    }

    // ✅ YANGI: endi body yubormaymiz — refresh cookie orqali avtomatik ketadi.
    // Hisob turi noma'lum bo'lsa (masalan localStorage tozalangan, lekin cookie
    // hali ham amal qilayotgan holat), avval "store", so'ng "user" sifatida sinaymiz.
    async function refreshAccessToken(options) {
        options = options || {};

        const currentAccessToken = getAccessToken();
        if (!options.force && isTokenFresh(currentAccessToken)) {
            setAuthorizationHeader(currentAccessToken);
            return currentAccessToken;
        }

        if (refreshPromise) {
            return refreshPromise;
        }

        const knownAccountType = getAccountType();
        const candidates = knownAccountType ? [knownAccountType] : ["store", "user"];

        refreshPromise = (async () => {
            let lastError = null;

            for (const kind of candidates) {
                try {
                    const response = await axios.post(
                        `${API_URL}${refreshEndpointFor(kind)}`,
                        {},
                        { withCredentials: true, headers: NGROK_BYPASS_HEADERS }
                    );

                    const nextAccessToken = response.data && response.data.access_token;
                    if (!nextAccessToken) throw new Error("access_token qaytmadi");

                    setAccountType(kind);
                    saveTokens({ access_token: nextAccessToken }, rememberCurrentSession());
                    return nextAccessToken;
                } catch (error) {
                    lastError = error;
                }
            }

            logoutInternal({ redirect: options.redirectOnFail !== false });
            throw lastError || new Error("Sessiya muddati tugagan.");
        })().finally(() => {
            refreshPromise = null;
        });

        return refreshPromise;
    }

    // ✅ YANGI: /api/v1/auth/me o'rniga hisob turiga qarab
    // /api/store/profile/get YOKI /api/user/profile/get chaqiriladi.
    async function fetchCurrentUser(accountType) {
        const kind = accountType || getAccountType() || "store";
        const response = await crmApi.get(profileEndpointFor(kind));
        const user = response.data;

        saveSession(user, rememberCurrentSession(), kind);
        return normalizeUser(user, kind);
    }

    setAuthorizationHeader(getAccessToken());

    crmApi.interceptors.request.use(async config => {
        config.headers = config.headers || {};

        if (config.data instanceof FormData) {
            delete config.headers["Content-Type"];
        } else if (!config.headers["Content-Type"]) {
            config.headers["Content-Type"] = "application/json";
        }

        if (!isAuthEndpoint(config.url)) {
            const token = await refreshAccessToken({ redirectOnFail: false });
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    });

    crmApi.interceptors.response.use(
        response => response,
        async error => {
            const originalRequest = error && error.config;

            if (
                error &&
                error.response &&
                error.response.status === 401 &&
                originalRequest &&
                !originalRequest._retry &&
                !isAuthEndpoint(originalRequest.url)
            ) {
                originalRequest._retry = true;

                try {
                    const token = await refreshAccessToken({ force: true });
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return crmApi(originalRequest);
                } catch (refreshError) {
                    return Promise.reject(refreshError);
                }
            }

            return Promise.reject(error);
        }
    );

    // ✅ YANGI: signup yagona bosqichda emas — hisob yaratiladi, lekin
    // tasdiqlanmaguncha (verify) kirish mumkin emas. "email" maydoni backendda
    // umuman yo'q — signup.html'dagi email input hozircha e'tiborga olinmaydi
    // (bu 2-3-bosqichda, signup.js/index.js integratsiyasida hal qilinadi).
    async function registerFn(data) {
        data = data || {};

        try {
            const response = await axios.post(`${API_URL}/api/auth/store/signup`, {
                ceo_name: String(data.fullName || "").trim(),
                ceo_phone: normalizePhone(data.phone),
                store_name: String(data.storeName || "").trim(),
                password: String(data.password || "")
            }, { headers: NGROK_BYPASS_HEADERS });

            return {
                success: true,
                code: "REGISTER_NEEDS_VERIFY",
                message: response.data && response.data.message || "Hisob yaratildi, tasdiqlash kodi yuborildi.",
                verifyData: response.data && response.data.verify_data || null
            };
        } catch (error) {
            console.error("Register error:", error);
            return {
                success: false,
                code: "REGISTER_FAILED",
                message: getErrorMessage(error, "Ro'yxatdan o'tishda xatolik yuz berdi.")
            };
        }
    }

    // ✅ YANGI: signup'dan keyingi majburiy qadam. Muvaffaqiyatli bo'lsa
    // access_token qaytadi va foydalanuvchi avtomatik tizimga kiradi.
    async function verifyFn(data) {
        data = data || {};
        const phone = normalizePhone(data.phone || data.ceo_phone);
        const remember = data.remember !== false;

        try {
            const response = await axios.post(`${API_URL}/api/auth/store/verify`, {
                ceo_phone: phone,
                otp: String(data.otp || data.code || "").trim()
            }, { withCredentials: true, headers: NGROK_BYPASS_HEADERS });

            clearSessionOnly();
            setAccountType("store");
            saveTokens({ access_token: response.data && response.data.access_token }, remember);

            const backendUser = await fetchCurrentUser("store");

            return {
                success: true,
                code: "VERIFY_SUCCESS",
                message: response.data && response.data.message || "Hisob tasdiqlandi!",
                user: backendUser
            };
        } catch (error) {
            console.error("Verify error:", error);
            return {
                success: false,
                code: "VERIFY_FAILED",
                message: getErrorMessage(error, "Kodni tasdiqlashda xatolik yuz berdi.")
            };
        }
    }

    async function trySignin(kind, phone, password) {
        const endpoint = kind === "user" ? "/api/auth/user/signin" : "/api/auth/store/signin";
        const payload = kind === "user"
            ? { user_phone: phone, password }
            : { ceo_phone: phone, password };

        return axios.post(`${API_URL}${endpoint}`, payload, { withCredentials: true, headers: NGROK_BYPASS_HEADERS });
    }

    // ✅ YANGI: bitta login formasi ikki xil hisobga (do'kon egasi / xodim)
    // xizmat qiladi — avval do'kon sifatida, "topilmadi" bo'lsa xodim sifatida sinaydi.
    // Shu tufayli login.html'ga tegmasdan ham ishlaydi (email tab endi ishlatilmaydi,
    // faqat telefon raqami kerak — bu 2-bosqichda index.js'da hal qilinadi).
    async function loginFn(emailOrPhoneOrData, passwordArg) {
        let loginValue = "";
        let password = "";
        let remember = false;

        if (typeof emailOrPhoneOrData === "object" && emailOrPhoneOrData !== null) {
            loginValue = emailOrPhoneOrData.login || emailOrPhoneOrData.phone || emailOrPhoneOrData.email || "";
            password = emailOrPhoneOrData.password || "";
            remember = emailOrPhoneOrData.remember !== false;
        } else {
            loginValue = emailOrPhoneOrData || "";
            password = passwordArg || "";
        }

        const phone = normalizePhone(loginValue);
        clearSessionOnly();

        let lastError = null;

        for (const kind of ["store", "user"]) {
            try {
                const response = await trySignin(kind, phone, password);

                setAccountType(kind);
                saveTokens({ access_token: response.data && response.data.access_token }, remember);

                const backendUser = await fetchCurrentUser(kind);

                return {
                    success: true,
                    code: "LOGIN_SUCCESS",
                    message: response.data && response.data.message || "Tizimga muvaffaqiyatli kirildi!",
                    user: backendUser
                };
            } catch (error) {
                lastError = error;
                clearTokensOnly();

                if (!isAccountNotFoundError(error)) {
                    // Bu turdagi hisob topildi, lekin parol/boshqa xato bor —
                    // ikkinchi turni sinashning ma'nosi yo'q.
                    break;
                }
                // "topilmadi" bo'lsa, keyingi hisob turini sinaymiz.
            }
        }

        return {
            success: false,
            code: "LOGIN_FAILED",
            message: getErrorMessage(lastError, "Telefon raqam yoki parol noto'g'ri!")
        };
    }

    async function forgotPasswordFn(data) {
        data = data || {};

        try {
            const response = await axios.post(`${API_URL}/api/auth/store/forgot-password`, {
                ceo_phone: normalizePhone(data.phone || data.ceo_phone)
            }, { headers: NGROK_BYPASS_HEADERS });

            return {
                success: true,
                code: "FORGOT_PASSWORD_SUCCESS",
                message: response.data && response.data.message || "Tasdiqlash kodi yuborildi.",
                verifyData: response.data && response.data.verify_data || null
            };
        } catch (error) {
            console.error("Forgot password error:", error);
            return {
                success: false,
                code: "FORGOT_PASSWORD_FAILED",
                message: getErrorMessage(error, "Kod yuborishda xatolik yuz berdi.")
            };
        }
    }

    async function resetPasswordFn(data) {
        data = data || {};

        try {
            const response = await axios.post(`${API_URL}/api/auth/store/reset-password`, {
                ceo_phone: normalizePhone(data.phone || data.ceo_phone),
                otp: String(data.otp || data.code || "").trim(),
                new_password: String(data.newPassword || data.new_password || "")
            }, { headers: NGROK_BYPASS_HEADERS });

            return {
                success: true,
                code: "RESET_PASSWORD_SUCCESS",
                message: response.data && response.data.message || "Parol muvaffaqiyatli o'zgartirildi!"
            };
        } catch (error) {
            console.error("Reset password error:", error);
            return {
                success: false,
                code: "RESET_PASSWORD_FAILED",
                message: getErrorMessage(error, "Parolni o'zgartirib bo'lmadi.")
            };
        }
    }

    return {
        register: registerFn,
        verify: verifyFn,
        login: loginFn,
        forgotPassword: forgotPasswordFn,
        resetPassword: resetPasswordFn,

        ensureValidSession: async function () {
            if (getStoredValue(SESSION_KEY) !== "true" && getStoredValue(OLD_SESSION_KEY) !== "true") {
                return false;
            }

            try {
                await refreshAccessToken({ redirectOnFail: false });

                if (!this.getCurrentUser()) {
                    await fetchCurrentUser();
                }

                return true;
            } catch {
                return false;
            }
        },

        getAccessToken: getAccessToken,

        // ⚠️ DEPRECATED — doim null qaytaradi, refresh_token endi httpOnly cookie'da.
        getRefreshToken: getRefreshToken,

        getAccountType: getAccountType,

        getCurrentUser: function () {
            const data = getStoredValue(CURRENT_USER_KEY) || getStoredValue(OLD_USER_KEY);
            return safeJsonParse(data, null);
        },

        getCurrentUserFullData: function () {
            return this.getCurrentUser();
        },

        updateCurrentUserData: function (updates) {
            const currentUser = this.getCurrentUser();

            if (!currentUser) {
                return false;
            }

            const accountType = getAccountType();
            const updatedUser = normalizeUser({
                ...currentUser,
                ...updates
            }, accountType);

            if (updates.fullName) {
                if (accountType === "user") {
                    updatedUser.user_name = updates.fullName;
                } else {
                    updatedUser.ceo_name = updates.fullName;
                }
            }
            if (updates.storeName && accountType !== "user") {
                updatedUser.store_name = updates.storeName;
            }
            if (updates.avatar) {
                updatedUser.profile_picture = updates.avatar;
            }

            saveSession(updatedUser, rememberCurrentSession(), accountType);
            return true;
        },

        // ⚠️ Yangi backendda "parolni almashtirish" (tizimga kirgan holda) endpointi
        // umuman yo'q — faqat OTP orqali forgotPassword/resetPassword bor.
        // Bu funksiya endi shunchaki xato qaytaradi, chaqiruvchi joy (profile.js
        // bosqichida) forgotPassword/resetPassword flowga o'tkaziladi.
        changePassword: async function () {
            console.warn("changePassword: yangi backendda bu endpoint yo'q. forgotPassword/resetPassword'dan foydalaning.");
            return {
                success: false,
                code: "NOT_SUPPORTED",
                message: "Parolni shu yerdan o'zgartirib bo'lmaydi. SMS kod orqali parolni tiklash funksiyasidan foydalaning."
            };
        },

        // ✅ YANGI: refresh_token o'qib bo'lmasligi sababli, sessiya bor-yo'qligi
        // endi mahalliy "session active" flagi orqali tekshiriladi (optimistik),
        // haqiqiy tasdiq esa ensureValidSession() orqali serverdan olinadi.
        isSessionValid: function () {
            return getStoredValue(SESSION_KEY) === "true" || getStoredValue(OLD_SESSION_KEY) === "true";
        },

        isLoggedIn: function () {
            return this.isSessionValid();
        },

        logout: function (options) {
            logoutInternal(options);
        },

        protectPage: function () {
            if (isPublicPage()) {
                return true;
            }

            if (!this.isSessionValid()) {
                sessionStorage.setItem(AUTH_REDIRECT_KEY, window.location.href);
                redirectTo(LOGIN_PAGE);
                return false;
            }

            this.ensureValidSession().then(isValid => {
                if (!isValid) {
                    sessionStorage.setItem(AUTH_REDIRECT_KEY, window.location.href);
                    redirectTo(LOGIN_PAGE);
                }
            });

            return true;
        },

        redirectIfLoggedIn: function (redirectUrl) {
            redirectUrl = redirectUrl || DASHBOARD_PAGE;

            const currentPage = window.location.pathname.split("/").pop().toLowerCase();
            const targetPage = redirectUrl.split("/").pop().toLowerCase();

            if (currentPage === targetPage) {
                return false;
            }

            if (this.isSessionValid()) {
                if (isTokenFresh(getAccessToken())) {
                    const savedRedirect = sessionStorage.getItem(AUTH_REDIRECT_KEY);
                    sessionStorage.removeItem(AUTH_REDIRECT_KEY);
                    redirectTo(savedRedirect || redirectUrl);
                    return true;
                }

                this.ensureValidSession().then(isValid => {
                    if (isValid) {
                        const savedRedirect = sessionStorage.getItem(AUTH_REDIRECT_KEY);
                        sessionStorage.removeItem(AUTH_REDIRECT_KEY);
                        redirectTo(savedRedirect || redirectUrl);
                    }
                });
            }

            return false;
        },

        clearAllAuthData: function () {
            clearSessionOnly();
            return true;
        }
    };
})();

// ─────────────────────────────────────────────────────────────────────────────
// 🌐 GLOBAL AUTH BRIDGE
window.getAuth = function () {
    return window.AuthSystem || null;
};