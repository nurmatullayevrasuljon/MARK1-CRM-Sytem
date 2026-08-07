var AuthSystem = window.AuthSystem = (function () {
    "use strict";

    const USERS_KEY = "crm_all_users";
    const CURRENT_USER_KEY = "crm_current_user";
    const SESSION_KEY = "crm_session_active";

    const OLD_USER_KEY = "currentUser";
    const OLD_SESSION_KEY = "isLoggedIn";

    function safeJsonParse(value, fallback) {
        try {
            return value ? JSON.parse(value) : fallback;
        } catch {
            return fallback;
        }
    }

    function getAllUsers() {
        const users = localStorage.getItem(USERS_KEY);
        const parsed = safeJsonParse(users, []);
        return Array.isArray(parsed) ? parsed : [];
    }

    function saveAllUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function normalizeEmail(email) {
        return String(email || "").trim().toLowerCase();
    }

    function normalizePhone(phone) {
        let value = String(phone || "").replace(/[^\d+]/g, "").trim();

        if (/^\d{9}$/.test(value)) {
            value = "+998" + value;
        } else if (value.startsWith("998")) {
            value = "+" + value;
        }

        return value;
    }

    function normalizePassword(password) {
        return String(password || "");
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
    }

    function isValidPhone(phone) {
        return /^\+998\d{9}$/.test(normalizePhone(phone));
    }

    function hashPassword(password) {
        password = normalizePassword(password);

        let hash = 0;

        for (let i = 0; i < password.length; i++) {
            hash = (hash << 5) - hash + password.charCodeAt(i);
            hash |= 0;
        }

        return hash.toString(36);
    }

    function generateUserId() {
        return "user_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    }

    function sanitizeUser(user) {
        if (!user) return null;

        const cleanUser = { ...user };
        delete cleanUser.password;

        return cleanUser;
    }

    function clearSessionOnly() {
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(OLD_USER_KEY);
        localStorage.removeItem(OLD_SESSION_KEY);

        sessionStorage.removeItem(CURRENT_USER_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(OLD_USER_KEY);
        sessionStorage.removeItem(OLD_SESSION_KEY);
    }

    function saveSession(user, remember) {
        const cleanUser = sanitizeUser(user);
        const storage = remember ? localStorage : sessionStorage;

        clearSessionOnly();

        storage.setItem(CURRENT_USER_KEY, JSON.stringify(cleanUser));
        storage.setItem(SESSION_KEY, "true");

        storage.setItem(OLD_USER_KEY, JSON.stringify(cleanUser));
        storage.setItem(OLD_SESSION_KEY, "true");
    }

    function readSessionValue(key) {
        return localStorage.getItem(key) || sessionStorage.getItem(key);
    }

    function isRememberedSession() {
        return (
            localStorage.getItem(SESSION_KEY) === "true" ||
            localStorage.getItem(OLD_SESSION_KEY) === "true"
        );
    }

    function redirectTo(url) {
        const currentPage = window.location.pathname.split("/").pop().toLowerCase();
        const targetPage = String(url || "").split("/").pop().toLowerCase();

        if (currentPage !== targetPage) {
            window.location.href = url;
        }
    }

    return {
        register: function (data) {
            data = data || {};

            const allUsers = getAllUsers();

            const fullName = String(data.fullName || "").trim();
            const email = normalizeEmail(data.email);
            const phone = normalizePhone(data.phone);
            const storeName = String(data.storeName || "").trim();
            const password = normalizePassword(data.password);
            const role = String(data.role || "Boshqaruv").trim();

            if (fullName.length < 3) {
                return {
                    success: false,
                    code: "INVALID_FULL_NAME",
                    message: "Ism-familiya kamida 3 ta belgidan iborat bo‘lishi kerak!"
                };
            }

            if (!isValidEmail(email)) {
                return {
                    success: false,
                    code: "INVALID_EMAIL",
                    message: "To‘g‘ri email kiriting!"
                };
            }

            if (!isValidPhone(phone)) {
                return {
                    success: false,
                    code: "INVALID_PHONE",
                    message: "Telefon raqam +998901234567 formatida bo‘lishi kerak!"
                };
            }

            if (storeName.length < 2) {
                return {
                    success: false,
                    code: "INVALID_STORE_NAME",
                    message: "Do‘kon nomi kamida 2 ta belgidan iborat bo‘lishi kerak!"
                };
            }

            if (password.length < 6) {
                return {
                    success: false,
                    code: "INVALID_PASSWORD",
                    message: "Parol kamida 6 ta belgidan iborat bo‘lishi kerak!"
                };
            }

            const emailExists = allUsers.some(function (user) {
                return normalizeEmail(user.email) === email;
            });

            if (emailExists) {
                return {
                    success: false,
                    code: "EMAIL_EXISTS",
                    redirectTo: "login.html",
                    message: "Bu email allaqachon ro‘yxatdan o‘tgan! Iltimos, tizimga kiring."
                };
            }

            const phoneExists = allUsers.some(function (user) {
                return normalizePhone(user.phone) === phone;
            });

            if (phoneExists) {
                return {
                    success: false,
                    code: "PHONE_EXISTS",
                    redirectTo: "login.html",
                    message: "Bu telefon raqam allaqachon ro‘yxatdan o‘tgan! Iltimos, tizimga kiring."
                };
            }

            const newUser = {
                userId: generateUserId(),
                fullName: fullName,
                email: email,
                phone: phone,
                storeName: storeName,
                password: hashPassword(password),
                role: role,
                createdAt: new Date().toISOString(),

                products: [],
                categories: ["Electronics"],
                sales: [],
                debtors: [],
                paidDebtors: [],
                smsHistory: [],

                stats: {
                    customers: 0,
                    deals: 0,
                    today: 0
                }
            };

            allUsers.push(newUser);
            saveAllUsers(allUsers);

            return {
                success: true,
                code: "REGISTER_SUCCESS",
                message: "Ro‘yxatdan o‘tish muvaffaqiyatli yakunlandi!",
                user: sanitizeUser(newUser)
            };
        },

        login: function (emailOrPhoneOrData, passwordArg) {
            const users = getAllUsers();

            let loginValue = "";
            let password = "";
            let remember = true;

            if (typeof emailOrPhoneOrData === "object" && emailOrPhoneOrData !== null) {
                loginValue =
                    emailOrPhoneOrData.login ||
                    emailOrPhoneOrData.email ||
                    emailOrPhoneOrData.phone ||
                    "";

                password = emailOrPhoneOrData.password || "";
                remember = emailOrPhoneOrData.remember === true;
            } else {
                loginValue = emailOrPhoneOrData || "";
                password = passwordArg || "";
                remember = true;
            }

            const normalizedLoginEmail = normalizeEmail(loginValue);
            const normalizedLoginPhone = normalizePhone(loginValue);
            const hashedPassword = hashPassword(password);

            const user = users.find(function (user) {
                const userEmail = normalizeEmail(user.email);
                const userPhone = normalizePhone(user.phone);

                return (
                    (userEmail === normalizedLoginEmail || userPhone === normalizedLoginPhone) &&
                    user.password === hashedPassword
                );
            });

            if (!user) {
                return {
                    success: false,
                    code: "LOGIN_FAILED",
                    message: "Email/Telefon yoki parol noto‘g‘ri!"
                };
            }

            saveSession(user, remember);

            return {
                success: true,
                code: "LOGIN_SUCCESS",
                message: "Tizimga muvaffaqiyatli kirildi!",
                user: sanitizeUser(user)
            };
        },

        getCurrentUser: function () {
            const data =
                readSessionValue(CURRENT_USER_KEY) ||
                readSessionValue(OLD_USER_KEY);

            return safeJsonParse(data, null);
        },

        getCurrentUserFullData: function () {
            const currentUser = this.getCurrentUser();

            if (!currentUser || !currentUser.userId) {
                return null;
            }

            const users = getAllUsers();

            return users.find(function (user) {
                return user.userId === currentUser.userId;
            }) || null;
        },

        updateCurrentUserData: function (updates) {
            const currentUser = this.getCurrentUser();

            if (!currentUser || !currentUser.userId) {
                return false;
            }

            const allUsers = getAllUsers();

            const index = allUsers.findIndex(function (user) {
                return user.userId === currentUser.userId;
            });

            if (index === -1) {
                this.logout();
                return false;
            }

            const updatedUser = {
                ...allUsers[index]
            };

            Object.keys(updates || {}).forEach(function (key) {
                if (key === "password" || key === "userId") {
                    return;
                }

                if (Array.isArray(updates[key])) {
                    updatedUser[key] = [...updates[key]];
                } else if (
                    typeof updates[key] === "object" &&
                    updates[key] !== null &&
                    !Array.isArray(updates[key])
                ) {
                    updatedUser[key] = {
                        ...(updatedUser[key] || {}),
                        ...updates[key]
                    };
                } else {
                    updatedUser[key] = updates[key];
                }
            });

            allUsers[index] = updatedUser;
            saveAllUsers(allUsers);

            saveSession(updatedUser, isRememberedSession());

            return true;
        },

        changePassword: function (oldPassword, newPassword) {
            const currentUser = this.getCurrentUser();

            if (!currentUser || !currentUser.userId) {
                return {
                    success: false,
                    code: "NOT_LOGGED_IN",
                    message: "Avval tizimga kiring!"
                };
            }

            if (normalizePassword(newPassword).length < 6) {
                return {
                    success: false,
                    code: "INVALID_NEW_PASSWORD",
                    message: "Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak!"
                };
            }

            const allUsers = getAllUsers();

            const index = allUsers.findIndex(function (user) {
                return user.userId === currentUser.userId;
            });

            if (index === -1) {
                return {
                    success: false,
                    code: "USER_NOT_FOUND",
                    message: "Foydalanuvchi topilmadi!"
                };
            }

            if (allUsers[index].password !== hashPassword(oldPassword)) {
                return {
                    success: false,
                    code: "OLD_PASSWORD_WRONG",
                    message: "Eski parol noto‘g‘ri!"
                };
            }

            allUsers[index].password = hashPassword(newPassword);
            saveAllUsers(allUsers);

            return {
                success: true,
                code: "PASSWORD_CHANGED",
                message: "Parol muvaffaqiyatli o‘zgartirildi!"
            };
        },

        isSessionValid: function () {
            const hasSession =
                readSessionValue(SESSION_KEY) === "true" ||
                readSessionValue(OLD_SESSION_KEY) === "true";

            const currentUser = this.getCurrentUser();

            if (!hasSession || !currentUser || !currentUser.userId) {
                return false;
            }

            const users = getAllUsers();

            return users.some(function (user) {
                return user.userId === currentUser.userId;
            });
        },

        logout: function () {
            clearSessionOnly();
            window.location.href = "login.html";
        },

        protectPage: function () {
            const page = window.location.pathname.toLowerCase();

            const publicPages = [
                "",
                "/",
                "index.html",
                "w-page.html",
                "signup.html",
                "login.html",
                "landing.html"
            ];

            const currentPage = page.split("/").pop();

            const isPublicPage = publicPages.includes(currentPage) || page.endsWith("/");

            if (!isPublicPage && !this.isSessionValid()) {
                redirectTo("login.html");
                return false;
            }

            return true;
        },

        redirectIfLoggedIn: function (redirectUrl) {
            redirectUrl = redirectUrl || "dashboard.html";

            const currentPage = window.location.pathname.split("/").pop().toLowerCase();
            const targetPage = redirectUrl.split("/").pop().toLowerCase();

            if (currentPage === targetPage) {
                return false;
            }

            if (this.isSessionValid()) {
                redirectTo(redirectUrl);
                return true;
            }

            return false;
        },

        clearAllAuthData: function () {
            localStorage.removeItem(USERS_KEY);
            clearSessionOnly();
            return true;
        },

        _debugGetAllUsers: function () {
            return getAllUsers().map(sanitizeUser);
        },

        _debugClearUsers: function () {
            localStorage.removeItem(USERS_KEY);
            clearSessionOnly();
            return true;
        }
    };
})();

console.log("🔥 AUTH SYSTEM TAYYOR");
