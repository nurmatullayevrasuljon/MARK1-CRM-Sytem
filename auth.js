var AuthSystem = window.AuthSystem = (function () {
    "use strict";

    // const API_URL = "https://backend-api-production-87e9.up.railway.app";
    const API_URL = "https://z3wax.pythonanywhere.com";
    window.CRM_API_URL = API_URL;

    const CURRENT_USER_KEY = "crm_current_user";
    const SESSION_KEY = "crm_session_active";
    const OLD_USER_KEY = "currentUser";
    const OLD_SESSION_KEY = "isLoggedIn";
    const ACCESS_TOKEN_KEY = "access_token";
    const REFRESH_TOKEN_KEY = "refresh_token";
    const AUTH_REDIRECT_KEY = "crm_auth_redirect";
    const TOKEN_SKEW_MS = 30000;
    const LOGIN_PAGE = "login.html";
    const DASHBOARD_PAGE = "index.html";

    // OFFLINE AUTH MODE START
    // Backend vaqtincha ishlamayotgani uchun login/register/logout/guard
    // tizimini butunlay LocalStorage orqali ishlaydigan qilib turibmiz.
    // Backend qayta ishga tushganda OFFLINE_MODE ni false qiling
    // (yoki shu "OFFLINE AUTH MODE" bloklarini butunlay o'chirib tashlang) —
    // asl (real API) kod hech qayerda o'chirilmagan, faqat vaqtincha chetlab o'tilmoqda.
    const OFFLINE_MODE = true;
    const OFFLINE_USERS_KEY = "crm_offline_users";

    function base64UrlEncode(obj) {
        const json = JSON.stringify(obj);
        const b64 = btoa(unescape(encodeURIComponent(json)));
        return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }

    // Haqiqiy backend imzosi bo'lmagan, lekin auth.js ning mavjud
    // decodeJwtPayload/isTokenFresh funksiyalari bilan to'liq mos keladigan
    // demo JWT hosil qiladi (exp claim orqali muddati aniqlanadi).
    function createOfflineJwt(payload) {
        const header = base64UrlEncode({ alg: "OFFLINE", typ: "JWT" });
        const body = base64UrlEncode(payload || {});
        return `${header}.${body}.offline-signature`;
    }
    // OFFLINE AUTH MODE END

    let refreshPromise = null;

    const crmApi = axios.create({
        baseURL: API_URL
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
            localStorage.getItem(REFRESH_TOKEN_KEY) ||
            localStorage.getItem(SESSION_KEY) === "true" ||
            localStorage.getItem(OLD_SESSION_KEY) === "true"
        ) {
            return localStorage;
        }

        return sessionStorage;
    }

    // ✅ FIX: Akkauntlar orasida ma'lumot sizib chiqmasligi uchun —
    // login/logout paytida barcha CRM ma'lumotlar keshini tozalaydigan funksiya.
    // Faqat tizim sozlamalariga emas, foydalanuvchi ma'lumotlariga tegishli kalitlarni tozalaydi.
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

        // Har bir qarzdorga tegishli dinamik SMS kalitlarini ham tozalash
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
            AUTH_REDIRECT_KEY
        ].forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        // ✅ FIX: sessiya bilan birga foydalanuvchi ma'lumotlari keshini ham tozalash
        clearAppDataCache();

        delete crmApi.defaults.headers.common.Authorization;
    }

    function clearTokensOnly() {
        [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY].forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        // delete crmApi.defaults.headers.common.Authorization;
    }

    function normalizeUser(user) {
        user = user || {};

        return {
            ...user,
            fullName: user.full_name || user.fullName || "",
            storeName: user.company_name || user.storeName || "",
            userId: user.id || user.userId || null
        };
    }

    function saveSession(user, remember) {
        const storage = remember ? localStorage : sessionStorage;
        const cleanUser = normalizeUser(user);

        storage.setItem(CURRENT_USER_KEY, JSON.stringify(cleanUser));
        storage.setItem(SESSION_KEY, "true");
        storage.setItem(OLD_USER_KEY, JSON.stringify(cleanUser));
        storage.setItem(OLD_SESSION_KEY, "true");
    }

    function saveTokens(tokens, remember) {
        const storage = remember ? localStorage : sessionStorage;
        const accessToken = tokens && tokens.access_token;
        const refreshToken = tokens && tokens.refresh_token;

        if (!accessToken || !refreshToken) {
            throw new Error("Token ma'lumotlari to'liq emas.");
        }

        // clearTokensOnly();

        storage.setItem(ACCESS_TOKEN_KEY, accessToken);
        storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        storage.setItem(SESSION_KEY, "true");
        storage.setItem(OLD_SESSION_KEY, "true");

        // setAuthorizationHeader(accessToken);
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

    function getRefreshToken() {
        return getStoredValue(REFRESH_TOKEN_KEY);
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

    function isAuthEndpoint(url) {
        return String(url || "").includes("/api/v1/auth/login") ||
            String(url || "").includes("/api/v1/auth/register") ||
            String(url || "").includes("/api/v1/auth/refresh") ||
            String(url || "").includes("/api/v1/auth/logout");
    }

    function getErrorMessage(error, fallback) {
        const detail = error && error.response && error.response.data && error.response.data.detail;

        if (Array.isArray(detail) && detail.length) {
            return detail.map(item => item.msg || item.message || String(item)).join("\n");
        }

        if (typeof detail === "string") {
            return detail;
        }

        return fallback || "Server bilan bog'lanishda xatolik yuz berdi.";
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

    function logoutInternal(options) {
        options = options || {};
        const refreshToken = getRefreshToken();

        // OFFLINE AUTH MODE START: backend ishlamagani uchun logout so'rovi yuborilmaydi
        if (!OFFLINE_MODE && refreshToken && options.callApi !== false) {
        // OFFLINE AUTH MODE END
            axios.post(`${API_URL}/api/v1/auth/logout`, {
                refresh_token: refreshToken
            }, {
                headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}
            }).catch(() => { });
        }

        refreshPromise = null;
        clearSessionOnly();

        if (options.redirect !== false) {
            redirectTo(options.redirectUrl || LOGIN_PAGE);
        }
    }

    async function refreshAccessToken(options) {
        options = options || {};

        const currentAccessToken = getAccessToken();
        if (!options.force && isTokenFresh(currentAccessToken)) {
            setAuthorizationHeader(currentAccessToken);
            return currentAccessToken;
        }

        const currentRefreshToken = getRefreshToken();
        if (!currentRefreshToken) {
            logoutInternal({ callApi: false, redirect: options.redirectOnFail !== false });
            throw new Error("Refresh token topilmadi.");
        }

        if (refreshPromise) {
            return refreshPromise;
        }

        refreshPromise = axios.post(`${API_URL}/api/v1/auth/refresh`, {
            refresh_token: currentRefreshToken
        }).then(response => {
            const nextAccessToken = response.data && response.data.access_token;
            const nextRefreshToken = response.data && response.data.refresh_token;

            saveTokens({
                access_token: nextAccessToken,
                refresh_token: nextRefreshToken || currentRefreshToken
            }, rememberCurrentSession());

            return nextAccessToken;
        }).catch(error => {
            logoutInternal({ callApi: false, redirect: options.redirectOnFail !== false });
            throw error;
        }).finally(() => {
            refreshPromise = null;
        });

        return refreshPromise;
    }

    async function fetchCurrentUser() {
        const response = await crmApi.get("/api/v1/auth/me");
        const user = response.data;

        saveSession(user, rememberCurrentSession());
        return user;
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

    return {
        register: async function (data) {
            data = data || {};

            // OFFLINE AUTH MODE START
            // Backend mavjud bo'lmagani uchun ro'yxatdan o'tishni to'liq
            // localStorage ichida simulyatsiya qilamiz.
            if (OFFLINE_MODE) {
                try {
                    const email = String(data.email || "").trim().toLowerCase();
                    const offlineUser = {
                        id: "offline-" + Date.now(),
                        full_name: String(data.fullName || "").trim(),
                        email: email,
                        phone: String(data.phone || "").trim() || null,
                        company_name: String(data.storeName || "").trim() || null
                    };

                    const users = safeJsonParse(localStorage.getItem(OFFLINE_USERS_KEY), {});
                    users[email] = offlineUser;
                    localStorage.setItem(OFFLINE_USERS_KEY, JSON.stringify(users));

                    return {
                        success: true,
                        code: "REGISTER_SUCCESS",
                        message: "Ro'yxatdan o'tish muvaffaqiyatli yakunlandi! (OFFLINE MODE)",
                        data: offlineUser
                    };
                } catch (error) {
                    console.error("Offline register error:", error);
                    return {
                        success: false,
                        code: "REGISTER_FAILED",
                        message: "Ro'yxatdan o'tishda xatolik yuz berdi (offline)."
                    };
                }
            }
            // OFFLINE AUTH MODE END

            try {
                const response = await axios.post(`${API_URL}/api/v1/auth/register`, {
                    full_name: String(data.fullName || "").trim(),
                    email: String(data.email || "").trim().toLowerCase(),
                    phone: String(data.phone || "").trim() || null,
                    password: String(data.password || ""),
                    company_name: String(data.storeName || "").trim() || null
                });

                return {
                    success: true,
                    code: "REGISTER_SUCCESS",
                    message: "Ro'yxatdan o'tish muvaffaqiyatli yakunlandi!",
                    data: response.data
                };
            } catch (error) {
                console.error("Register error:", error);
                return {
                    success: false,
                    code: "REGISTER_FAILED",
                    message: getErrorMessage(error, "Ro'yxatdan o'tishda xatolik yuz berdi.")
                };
            }
        },

        login: async function (emailOrPhoneOrData, passwordArg) {
            let loginValue = "";
            let password = "";
            let remember = false;

            if (typeof emailOrPhoneOrData === "object" && emailOrPhoneOrData !== null) {
                loginValue = emailOrPhoneOrData.login || emailOrPhoneOrData.email || "";
                password = emailOrPhoneOrData.password || "";
                remember = emailOrPhoneOrData.remember !== false;
            } else {
                loginValue = emailOrPhoneOrData || "";
                password = passwordArg || "";
            }

            // OFFLINE AUTH MODE START
            // Backend mavjud bo'lmagani uchun login so'rovi yuborilmaydi:
            // fake JWT token yaratib, demo current_user localStorage'ga yoziladi.
            if (OFFLINE_MODE) {
                try {
                    const emailKey = String(loginValue || "").trim().toLowerCase();
                    const users = safeJsonParse(localStorage.getItem(OFFLINE_USERS_KEY), {});
                    const existingUser = users[emailKey];

                    const demoUser = existingUser || {
                        id: "offline-demo",
                        full_name: "Demo foydalanuvchi",
                        email: emailKey,
                        phone: null,
                        company_name: "Demo do'kon"
                    };

                    const nowSeconds = Math.floor(Date.now() / 1000);
                    const fakeAccessToken = createOfflineJwt({
                        sub: demoUser.email,
                        exp: nowSeconds + 60 * 60 * 24 * 30 // 30 kun amal qiladi
                    });
                    const fakeRefreshToken = createOfflineJwt({
                        sub: demoUser.email,
                        type: "refresh",
                        exp: nowSeconds + 60 * 60 * 24 * 60 // 60 kun amal qiladi
                    });

                    clearSessionOnly();
                    saveTokens({ access_token: fakeAccessToken, refresh_token: fakeRefreshToken }, remember);
                    saveSession(demoUser, remember);

                    return {
                        success: true,
                        code: "LOGIN_SUCCESS",
                        message: "Tizimga muvaffaqiyatli kirildi! (OFFLINE MODE)",
                        user: normalizeUser(demoUser)
                    };
                } catch (error) {
                    console.error("Offline login error:", error);
                    return {
                        success: false,
                        code: "LOGIN_FAILED",
                        message: "Email yoki parol noto'g'ri! (offline)"
                    };
                }
            }
            // OFFLINE AUTH MODE END

            try {
                const response = await axios.post(`${API_URL}/api/v1/auth/login`, {
                    email: String(loginValue || "").trim().toLowerCase(),
                    password: password
                });

                clearSessionOnly();
                saveTokens(response.data, remember);

                const backendUser = await fetchCurrentUser();

                return {
                    success: true,
                    code: "LOGIN_SUCCESS",
                    message: "Tizimga muvaffaqiyatli kirildi!",
                    user: backendUser
                };
            } catch (error) {
                console.error("Login error:", error);
                clearTokensOnly();

                return {
                    success: false,
                    code: "LOGIN_FAILED",
                    message: getErrorMessage(error, "Email yoki parol noto'g'ri!")
                };
            }
        },

        ensureValidSession: async function () {
            if (!getRefreshToken()) {
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

        getRefreshToken: getRefreshToken,

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

            const updatedUser = normalizeUser({
                ...currentUser,
                ...updates
            });

            if (updates.fullName) updatedUser.full_name = updates.fullName;
            if (updates.storeName) updatedUser.company_name = updates.storeName;

            saveSession(updatedUser, rememberCurrentSession());
            return true;
        },

        changePassword: async function (oldPassword, newPassword) {
            try {
                await crmApi.post("/api/v1/auth/change-password", {
                    old_password: oldPassword,
                    new_password: newPassword
                });

                return {
                    success: true,
                    code: "PASSWORD_CHANGED",
                    message: "Parol muvaffaqiyatli o'zgartirildi!"
                };
            } catch (error) {
                console.error("Change password error:", error);
                return {
                    success: false,
                    code: "PASSWORD_CHANGE_FAILED",
                    message: getErrorMessage(error, "Parolni o'zgartirib bo'lmadi.")
                };
            }
        },

        isSessionValid: function () {
            return !!getRefreshToken();
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