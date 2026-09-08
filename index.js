(function (global) {
  "use strict";

  // ==========================================================
  // DOM SHORTCUTS
  // ==========================================================

  function $(id) {
    return document.getElementById(id);
  }

  function $q(sel) {
    return document.querySelector(sel);
  }

  function $qa(sel) {
    return document.querySelectorAll(sel);
  }

  function setText(el, text) {
    if (el) {
      el.textContent = text || "";
    }
  }

  // function getAuth() {
  //   return global.AuthSystem || null;
  // }
  function getAuth() {
    return window.AuthSystem || null;
}

  // ==========================================================
  // CONFIG
  // ==========================================================

  var DASHBOARD_PAGE = "index.html";
  var LOGIN_PAGE = "login.html";
  var SIGNUP_PAGE = "signup.html";

  // ==========================================================
  // PAGE TRANSITION MODULE
  // Qaltirash/flicker yo'q. Overlay yo'q. setTimeout yo'q.
  // ==========================================================

  var Transition = (function () {
    var booted = false;

    function init() {
      if (booted) return;
      booted = true;

      document.addEventListener("click", function (e) {
        var link = e.target.closest("a[data-transition]");
        if (!link) return;

        var href = link.getAttribute("href");

        if (!href || href.charAt(0) === "#") return;
        if (link.target === "_blank" || link.hasAttribute("download")) return;

        try {
          var url = new URL(link.href, window.location.href);

          if (url.origin !== window.location.origin) {
            return;
          }
        } catch (err) {
          return;
        }

        e.preventDefault();
        go(link.href);
      });
    }

    function getPageName(url) {
      try {
        var parsed = new URL(url, window.location.href);
        return parsed.pathname.split("/").pop().toLowerCase();
      } catch (err) {
        return String(url || "").split("/").pop().toLowerCase();
      }
    }

    function go(url, replace) {
      if (!url) return;

      var currentPage = window.location.pathname.split("/").pop().toLowerCase();
      var targetPage = getPageName(url);

      if (currentPage === targetPage) {
        return;
      }

      if (replace) {
        window.location.replace(url);
      } else {
        window.location.href = url;
      }
    }

    return {
      init: init,
      go: go
    };
  })();

  // ==========================================================
  // PAGE DETECTOR
  // ==========================================================

  var Page = {
    isSignup: function () {
      return !!$("signupForm");
    },

    isLogin: function () {
      return !!$("loginForm");
    },

    isLanding: function () {
      return (
        !$("signupForm") &&
        !$("loginForm") &&
        !!$("navbar") &&
        !$("profileName") &&
        !$("logoutBtn") &&
        ($("startBtn") !== null ||
          $("trialBtn") !== null ||
          $("heroStartBtn") !== null ||
          $("bottomStartBtn") !== null)
      );
    },

    isDashboardLike: function () {
      return !this.isSignup() && !this.isLogin() && !this.isLanding();
    }
  };

  // ==========================================================
  // AUTH HELPERS
  // ==========================================================

  function isLoggedIn() {
    var Auth = getAuth();

    if (!Auth || typeof Auth.isSessionValid !== "function") {
      return false;
    }

    return Auth.isSessionValid();
  }

  function redirectIfLoggedIn() {
    var Auth = getAuth();

    if (!Auth || typeof Auth.redirectIfLoggedIn !== "function") {
      if (isLoggedIn()) {
        Transition.go(DASHBOARD_PAGE, true);
        return true;
      }

      return false;
    }

    return Auth.redirectIfLoggedIn(DASHBOARD_PAGE);
  }

  function protectPage() {
    var Auth = getAuth();

    if (!Auth || typeof Auth.protectPage !== "function") {
      Transition.go(LOGIN_PAGE, true);
      return false;
    }

    return Auth.protectPage();
  }

  // ==========================================================
  // PHONE / VALIDATION UTILS
  // ==========================================================

  function cleanPhone(value) {
    return String(value || "").replace(/\s+/g, "");
  }

  function normalizeUzPhoneInput(value) {
    value = String(value || "").replace(/[^\d+]/g, "");

    if (value.startsWith("998")) {
      value = "+" + value;
    }

    if (!value.startsWith("+998")) {
      value = "+998" + value.replace(/\D/g, "").replace(/^998/, "");
    }

    if (value.length > 13) {
      value = value.slice(0, 13);
    }

    return value;
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
  }

  function isValidPhone(value) {
    return /^\+998\d{9}$/.test(cleanPhone(value));
  }

  // ==========================================================
  // SIGNUP PAGE INIT
  // ==========================================================

  function initSignupPage() {
    if (redirectIfLoggedIn()) return;

    var form = $("signupForm");
    if (!form) return;

    var createBtn = $("createBtn");
    var termsEl = $("terms");
    var firstNameEl = $("firstName");
    var emailEl = $("email");
    var passwordEl = $("password");
    var phoneEl = $("phone");
    var storeEl = $("storeName");
    var googleBtn = $("googleBtn");

    if (
      !createBtn ||
      !termsEl ||
      !firstNameEl ||
      !emailEl ||
      !passwordEl ||
      !phoneEl ||
      !storeEl
    ) {
      return;
    }

    function validate() {
      var ok =
        firstNameEl.value.trim().length >= 3 &&
        isValidEmail(emailEl.value) &&
        isValidPhone(phoneEl.value) &&
        storeEl.value.trim().length >= 2 &&
        passwordEl.value.length >= 8 &&
        termsEl.checked;

      if (ok) {
        createBtn.removeAttribute("disabled");
        createBtn.classList.add("active");
      } else {
        createBtn.setAttribute("disabled", "disabled");
        createBtn.classList.remove("active");
      }

      return ok;
    }

    function resetSignupButton() {
      createBtn.textContent = "Yangi hisob yaratish";
      validate();
    }

    phoneEl.addEventListener("focus", function () {
      if (!phoneEl.value.trim()) {
        phoneEl.value = "+998";
      }
    });

    phoneEl.addEventListener("input", function () {
      phoneEl.value = normalizeUzPhoneInput(phoneEl.value);
      validate();
    });

    firstNameEl.addEventListener("input", validate);
    emailEl.addEventListener("input", validate);
    passwordEl.addEventListener("input", validate);
    storeEl.addEventListener("input", validate);
    termsEl.addEventListener("change", validate);
    termsEl.addEventListener("click", validate);

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (!validate()) {
        form.classList.add("was-validated");
        return;
      }

      var Auth = getAuth();

      if (!Auth || typeof Auth.register !== "function") {
        alert("AuthSystem topilmadi. auth.js faylini tekshiring.");
        resetSignupButton();
        return;
      }

      createBtn.textContent = "Yaratilmoqda...";
      createBtn.setAttribute("disabled", "disabled");
      createBtn.classList.remove("active");

      var userData = {
        fullName: firstNameEl.value.trim(),
        email: normalizeEmail(emailEl.value),
        phone: cleanPhone(phoneEl.value),
        storeName: storeEl.value.trim(),
        password: passwordEl.value,
        role: "Boshqaruv"
      };

      try {
        var reg = await Auth.register(userData);

        // Boshqa register xatolari: sahifada qoladi.
        if (!reg || !reg.success) {
          alert((reg && reg.message) || "Ro'yxatdan o'tishda xatolik yuz berdi.");
          resetSignupButton();
          return;
        }

        // ✅ YANGI: yangi backendda signup darhol login qilmaydi — SMS orqali
        // yuborilgan kodni tasdiqlash (verify) shart bo'ladi. signup.html'da
        // hali alohida OTP input maydoni yo'q, shu sabab uni HTML/CSS'ga
        // tegmasdan window.prompt() orqali so'raymiz.
        if (!Auth || typeof Auth.verify !== "function") {
          alert("Hisob yaratildi. Endi login sahifasidan kiring.");
          Transition.go(LOGIN_PAGE, true);
          return;
        }

        createBtn.textContent = "Kod yuborildi...";

        var verified = false;
        var attemptsLeft = 3;

        while (!verified && attemptsLeft > 0) {
          var otp = window.prompt(
            "Telefoningizga (" + userData.phone + ") yuborilgan tasdiqlash kodini kiriting:"
          );

          if (otp === null) {
            // Foydalanuvchi bekor qildi — hisob yaratilgan, lekin tasdiqlanmagan holda qoladi.
            alert("Hisob yaratildi, lekin hali tasdiqlanmagan. Login sahifasida qayta urinib ko'rishingiz mumkin.");
            Transition.go(LOGIN_PAGE, true);
            return;
          }

          var verifyResult = await Auth.verify({
            phone: userData.phone,
            otp: otp,
            remember: true
          });

          if (verifyResult && verifyResult.success) {
            verified = true;
            Transition.go(DASHBOARD_PAGE, true);
            return;
          }

          attemptsLeft--;
          alert((verifyResult && verifyResult.message) || "Kod noto'g'ri.");
        }

        alert("Urinishlar tugadi. Iltimos, login sahifasidan qayta urinib ko'ring.");
        Transition.go(LOGIN_PAGE, true);
      } catch (err) {
        console.error(err);
        alert("Xatolik yuz berdi: " + (err.message || err));
        resetSignupButton();
      }
    });

    if (googleBtn) {
      googleBtn.addEventListener("click", function (e) {
        e.preventDefault();
        alert("Google orqali kirish hali ulanmagan.");
      });
    }

    validate();
  }

  // ==========================================================
  // LOGIN PAGE INIT
  // ==========================================================

  function initLoginPage() {
    if (redirectIfLoggedIn()) return;

    var form = $("loginForm");
    if (!form) return;

    var loginBtn = $("loginBtn");
    var loginInput = $("loginInput");
    var passwordEl = $("password");
    var rememberEl = $("remember");

    if (!loginBtn || !loginInput || !passwordEl) return;

    var emailTabEl = $("emailTab");
    var phoneTabEl = $("phoneTab");
    var labelEl = $("loginLabel");

    // ✅ YANGI: yangi backendda email orqali kirish umuman yo'q — faqat
    // telefon raqam bilan (do'kon egasi yoki xodim). Standart holat "phone".
    var loginType = "phone";

    function checkForm() {
      var loginValid = false;

      if (loginType === "email") {
        loginValid = isValidEmail(loginInput.value);
      } else {
        loginValid = isValidPhone(loginInput.value);
      }

      loginBtn.disabled = !(loginValid && passwordEl.value.length >= 6);
    }

    function resetLoginButton() {
      loginBtn.textContent = "Tizimga kirish";
      checkForm();
    }

    if (emailTabEl && phoneTabEl && labelEl) {
      emailTabEl.addEventListener("click", function () {
        loginType = "email";

        emailTabEl.classList.add("active");
        phoneTabEl.classList.remove("active");

        labelEl.textContent = "E-pochta manzili";
        loginInput.type = "email";
        loginInput.placeholder = "you@example.com";
        loginInput.value = "";

        checkForm();
      });

      phoneTabEl.addEventListener("click", function () {
        loginType = "phone";

        phoneTabEl.classList.add("active");
        emailTabEl.classList.remove("active");

        labelEl.textContent = "Telefon raqam";
        loginInput.type = "tel";
        loginInput.placeholder = "+998901234567";
        loginInput.value = "+998";

        checkForm();
      });

      // ✅ YANGI: sahifa ochilganda "Telefon" tab avtomatik faol bo'lsin
      // (email endi backendda ishlamaydi).
      phoneTabEl.classList.add("active");
      emailTabEl.classList.remove("active");
      labelEl.textContent = "Telefon raqam";
      loginInput.type = "tel";
      loginInput.placeholder = "+998901234567";
    }

    loginInput.addEventListener("input", function () {
      if (loginType === "phone") {
        loginInput.value = normalizeUzPhoneInput(loginInput.value);
      }

      checkForm();
    });

    passwordEl.addEventListener("input", checkForm);

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      checkForm();

      if (loginBtn.disabled) return;

      // ✅ YANGI (eskisining teskarisi): endi EMAIL emas, TELEFON qabul qilinadi.
      if (loginType === "email") {
        alert("Yangi tizimda kirish faqat telefon raqam orqali. Iltimos, \"Telefon\" bo'limiga o'ting.");
        resetLoginButton();
        return;
      }

      var Auth = getAuth();

      if (!Auth || typeof Auth.login !== "function") {
        alert("AuthSystem topilmadi. auth.js faylini tekshiring.");
        resetLoginButton();
        return;
      }

      loginBtn.textContent = "Kirish...";
      loginBtn.disabled = true;

      try {
        var result = await Auth.login({
          login: loginInput.value.trim(),
          password: passwordEl.value,
          remember: rememberEl ? rememberEl.checked : true
        });

        if (result && result.success) {
          Transition.go(DASHBOARD_PAGE, true);
          return;
        }

        alert((result && result.message) || "Telefon raqam yoki parol noto'g'ri.");
        resetLoginButton();
      } catch (err) {
        console.error(err);
        alert("Kirishda xatolik yuz berdi: " + (err.message || err));
        resetLoginButton();
      }
    });

    checkForm();
  }

  // ==========================================================
  // PAROLNI TIKLASH OYNASI (forgot password)
  // Faqat login.html sahifasida ishlaydi. Kerakli elementlar topilmasa
  // (masalan boshqa sahifada), funksiya darhol to'xtaydi — hech qanday
  // boshqa narsaga ta'sir qilmaydi.
  // ==========================================================

  function initForgotPasswordModal() {
    var overlay = $("fpOverlay");
    if (!overlay) return;

    var openLink = $("forgotPasswordLink");
    var closeBtn = $("fpCloseBtn");

    var step1 = $("fpStep1");
    var step2 = $("fpStep2");
    var step3 = $("fpStep3");

    var phoneInput = $("fpPhoneInput");
    var step1Error = $("fpStep1Error");
    var sendCodeBtn = $("fpSendCodeBtn");

    var step2Subtitle = $("fpStep2Subtitle");
    var otpInput = $("fpOtpInput");
    var newPasswordInput = $("fpNewPassword");
    var newPasswordConfirmInput = $("fpNewPasswordConfirm");
    var step2Error = $("fpStep2Error");
    var resetBtn = $("fpResetBtn");
    var resendLink = $("fpResendLink");
    var backLink = $("fpBackLink");

    var doneBtn = $("fpDoneBtn");

    // Joriy oqim davomida ishlatiladigan telefon raqami
    var currentPhone = "";

    function showStep(step) {
      [step1, step2, step3].forEach(function (el) {
        if (el) el.classList.remove("active");
      });
      if (step) step.classList.add("active");
    }

    function showError(el, message) {
      if (!el) return;
      el.textContent = message;
      el.classList.add("show");
    }

    function hideError(el) {
      if (!el) return;
      el.textContent = "";
      el.classList.remove("show");
    }

    function resetModalState() {
      currentPhone = "";
      if (phoneInput) phoneInput.value = "+998";
      if (otpInput) otpInput.value = "";
      if (newPasswordInput) newPasswordInput.value = "";
      if (newPasswordConfirmInput) newPasswordConfirmInput.value = "";
      hideError(step1Error);
      hideError(step2Error);
      showStep(step1);

      // Oyna qayta ochilganda, oldingi "qayta yuborish" hisoblagichi
      // (agar ishlab turgan bo'lsa) to'xtatiladi va tugma asl holatiga
      // qaytariladi — aks holda eski taymer fonda ishlab, keyingi safar
      // tugmani chalkash holatga keltirib qo'yishi mumkin edi.
      if (resendCooldownTimer) {
        clearInterval(resendCooldownTimer);
        resendCooldownTimer = null;
      }
      if (resendLink) {
        resendLink.classList.remove("disabled");
        resendLink.style.pointerEvents = "";
        resendLink.style.opacity = "";
        resendLink.textContent = "Kodni qayta yuborish";
      }
    }

    function openModal() {
      resetModalState();
      overlay.classList.add("show");
    }

    function closeModal() {
      overlay.classList.remove("show");
    }

    if (openLink) {
      openLink.addEventListener("click", function (e) {
        e.preventDefault();
        openModal();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", closeModal);
    }

    // Overlay foniga bosilsa ham yopiladi (ichidagi qutichaga bosilsa yopilmaydi)
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });

    if (phoneInput) {
      phoneInput.addEventListener("input", function () {
        phoneInput.value = normalizeUzPhoneInput(phoneInput.value);
      });
    }

    // -----------------------------------------------------------
    // 1-BOSQICH: kod so'rash
    // -----------------------------------------------------------
    async function requestCode() {
      hideError(step1Error);

      var phone = phoneInput ? phoneInput.value.trim() : "";

      if (!isValidPhone(phone)) {
        showError(step1Error, "Telefon raqamni to'g'ri kiriting (+998901234567).");
        return;
      }

      var Auth = getAuth();
      if (!Auth || typeof Auth.forgotPassword !== "function") {
        showError(step1Error, "Tizim xatoligi: AuthSystem topilmadi.");
        return;
      }

      // MUHIM: bu funksiya HAM "Kod yuborish" (1-bosqich) tugmasidan,
      // HAM "Kodni qayta yuborish" havolasidan chaqiriladi. Ikkalasini
      // ham darhol band qilib qo'yamiz — aks holda foydalanuvchi ikkala
      // tugmani ketma-ket bir necha marta bossa, bir nechta SMS pullik
      // xabar ketib qolishi mumkin edi.
      var originalBtnText = sendCodeBtn.textContent;
      sendCodeBtn.disabled = true;
      sendCodeBtn.textContent = "Yuborilmoqda...";

      var resendWasEnabled = resendLink && !resendLink.classList.contains("disabled");
      if (resendLink) {
        resendLink.classList.add("disabled");
        resendLink.style.pointerEvents = "none";
        resendLink.style.opacity = "0.5";
      }

      try {
        var result = await Auth.forgotPassword(phone);

        if (result && result.success) {
          currentPhone = phone;
          if (step2Subtitle) {
            step2Subtitle.textContent = phone + " raqamiga yuborilgan kodni va yangi parolni kiriting.";
          }
          showStep(step2);
          startResendCooldown(30);
        } else {
          showError(
            step1Error,
            (result && result.message) || "Kod yuborishda xatolik yuz berdi. Qaytadan urinib ko'ring."
          );
          // Xatolik bo'lsa, darhol qayta urinishga ruxsat beramiz.
          if (resendLink && resendWasEnabled) {
            resendLink.classList.remove("disabled");
            resendLink.style.pointerEvents = "";
            resendLink.style.opacity = "";
          }
        }
      } catch (err) {
        console.error(err);
        showError(step1Error, "Kod yuborishda xatolik yuz berdi. Internet aloqasini tekshiring.");
        if (resendLink && resendWasEnabled) {
          resendLink.classList.remove("disabled");
          resendLink.style.pointerEvents = "";
          resendLink.style.opacity = "";
        }
      } finally {
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = originalBtnText;
      }
    }

    // -----------------------------------------------------------
    // "Qayta yuborish" havolasini vaqtincha bloklab, orqaga sanoq
    // ko'rsatadi (masalan 30, 29, 28... soniya). Bu — foydalanuvchi
    // bir nechta pullik SMS'ni tasodifan ketma-ket yubormasligi uchun.
    // -----------------------------------------------------------
    var resendCooldownTimer = null;

    function startResendCooldown(seconds) {
      if (!resendLink) return;

      if (resendCooldownTimer) {
        clearInterval(resendCooldownTimer);
        resendCooldownTimer = null;
      }

      var remaining = seconds;
      var originalLabel = "Kodni qayta yuborish";

      resendLink.classList.add("disabled");
      resendLink.style.pointerEvents = "none";
      resendLink.style.opacity = "0.5";
      resendLink.textContent = originalLabel + " (" + remaining + "s)";

      resendCooldownTimer = setInterval(function () {
        remaining -= 1;

        if (remaining <= 0) {
          clearInterval(resendCooldownTimer);
          resendCooldownTimer = null;
          resendLink.classList.remove("disabled");
          resendLink.style.pointerEvents = "";
          resendLink.style.opacity = "";
          resendLink.textContent = originalLabel;
        } else {
          resendLink.textContent = originalLabel + " (" + remaining + "s)";
        }
      }, 1000);
    }

    if (sendCodeBtn) {
      sendCodeBtn.addEventListener("click", requestCode);
    }

    // -----------------------------------------------------------
    // 2-BOSQICH: kod + yangi parol bilan tasdiqlash
    // -----------------------------------------------------------
    async function confirmReset() {
      hideError(step2Error);

      var code = otpInput ? otpInput.value.trim() : "";
      var newPassword = newPasswordInput ? newPasswordInput.value : "";
      var newPasswordConfirm = newPasswordConfirmInput ? newPasswordConfirmInput.value : "";

      if (!code) {
        showError(step2Error, "Tasdiqlash kodini kiriting.");
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        showError(step2Error, "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak.");
        return;
      }

      if (newPassword !== newPasswordConfirm) {
        showError(step2Error, "Parollar bir-biriga mos kelmadi.");
        return;
      }

      var Auth = getAuth();
      if (!Auth || typeof Auth.resetPassword !== "function") {
        showError(step2Error, "Tizim xatoligi: AuthSystem topilmadi.");
        return;
      }

      var originalText = resetBtn.textContent;
      resetBtn.disabled = true;
      resetBtn.textContent = "Yuborilmoqda...";

      try {
        var result = await Auth.resetPassword({
          phone: currentPhone,
          code: code,
          newPassword: newPassword
        });

        if (result && result.success) {
          showStep(step3);

          // Login formasiga telefon raqamini avtomatik to'ldirib qo'yamiz —
          // foydalanuvchi qayta yozmasin.
          var loginInput = $("loginInput");
          var phoneTabEl = $("phoneTab");
          if (loginInput && phoneTabEl) {
            phoneTabEl.click();
            loginInput.value = currentPhone;
          }
        } else {
          showError(
            step2Error,
            (result && result.message) || "Kod noto'g'ri yoki muddati o'tgan. Qaytadan urinib ko'ring."
          );
        }
      } catch (err) {
        console.error(err);
        showError(step2Error, "Xatolik yuz berdi. Internet aloqasini tekshiring.");
      } finally {
        resetBtn.disabled = false;
        resetBtn.textContent = originalText;
      }
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", confirmReset);
    }

    if (resendLink) {
      resendLink.addEventListener("click", function (e) {
        e.preventDefault();
        if (currentPhone) {
          phoneInput.value = currentPhone;
        }
        requestCode();
      });
    }

    if (backLink) {
      backLink.addEventListener("click", function (e) {
        e.preventDefault();
        hideError(step2Error);
        showStep(step1);
      });
    }

    if (doneBtn) {
      doneBtn.addEventListener("click", closeModal);
    }
  }

  // NOTE: initSecurityTab() bu yerdan olib tashlandi.
  // script.js IIFE ichida to'liqroq versiyasi mavjud (DOMContentLoaded ga ulangan).
  // Ikkita versiya bir vaqtda changePasswordBtn ga ikkita listener qo'shar edi.

// ==========================================================
  // LANDING PAGE INIT
  // Faqat LANDING sahifasi uchun (#navbar bor, lekin dashboard emas)
  // ==========================================================

  // function initLandingPage() {
  //   var navbar        = $("navbar");
  //   var mobileMenuBtn = $("mobileMenuBtn");
  //   if (!navbar) return;

  //   // Navbar scroll
  //   window.addEventListener("scroll", function () {
  //     navbar.classList.toggle("scrolled", window.scrollY > 50);
  //   }, { passive: true });

  //   // Mobile menu
  //   if (mobileMenuBtn) {
  //     mobileMenuBtn.addEventListener("click", function () {
  //       var open = navbar.classList.toggle("mobile-open");
  //       mobileMenuBtn.textContent = open ? "✕" : "☰";
  //     });
  //   }

  //   // CTA tugmalari
  //   ["startBtn", "trialBtn", "bottomStartBtn", "bottomTrialBtn"].forEach(function (id) {
  //     var btn = $(id);
  //     if (!btn || btn.dataset.ctaBound === "true") return;
  //     btn.dataset.ctaBound = "true";
  //     btn.addEventListener("click", function (e) {
  //       e.preventDefault();
  //       Transition.go(isLoggedIn() ? DASHBOARD_PAGE : SIGNUP_PAGE);
  //     });
  //   });

  //   // Smooth scroll (in-page anchor linklar)
  //   var anchors = $qa('a[href^="#"]');
  //   for (var ai = 0; ai < anchors.length; ai++) {
  //     (function (a) {
  //       a.addEventListener("click", function (e) {
  //         var href = a.getAttribute("href");
  //         if (!href || href.length < 2) return;
  //         var target = $q(href);
  //         if (!target) return;
  //         e.preventDefault();
  //         target.scrollIntoView({ behavior: "smooth", block: "start" });
  //         if (mobileMenuBtn) {
  //           navbar.classList.remove("mobile-open");
  //           mobileMenuBtn.textContent = "☰";
  //         }
  //       });
  //     }(anchors[ai]));
  //   }

  //   // Mouse parallax
  //   var mx = 0, my = 0, cx = 0, cy = 0;
  //   document.addEventListener("mousemove", function (e) {
  //     mx = (e.clientX - window.innerWidth  / 2) / 40;
  //     my = (e.clientY - window.innerHeight / 2) / 40;
  //   }, { passive: true });

  //   (function tick() {
  //     cx += (mx - cx) * 0.1;
  //     cy += (my - cy) * 0.1;
  //     var floaters = $qa(".floating-element");
  //     for (var fi = 0; fi < floaters.length; fi++) {
  //       var spd = (fi + 1) * 0.5;
  //       floaters[fi].style.transform =
  //         "translate(" + (cx * spd) + "px," + (cy * spd) + "px)";
  //     }
  //     requestAnimationFrame(tick);
  //   }());

  //   // Scroll reveal
  //   if ("IntersectionObserver" in window) {
  //     var revEls = $qa(".block-text, .line-text");
  //     if (revEls.length) {
  //       var ro = new IntersectionObserver(function (entries) {
  //         entries.forEach(function (en) {
  //           if (!en.isIntersecting) return;
  //           en.target.classList.add("block-text-show", "line-text-show");
  //           ro.unobserve(en.target);
  //         });
  //       }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
  //       revEls.forEach(function (el, i) {
  //         el.classList.add("block-text-" + ((i % 4) + 1));
  //         ro.observe(el);
  //       });
  //     }

  //     var iconBoxes = $qa(".icon-box");
  //     if (iconBoxes.length) {
  //       var io = new IntersectionObserver(function (entries) {
  //         entries.forEach(function (en) {
  //           if (!en.isIntersecting) return;
  //           en.target.classList.add("svg-icon", "icon-text", "icon-text2");
  //           io.unobserve(en.target);
  //         });
  //       }, { threshold: 0.1 });
  //       iconBoxes.forEach(function (el) { io.observe(el); });
  //     }
  //   }

  //   // Active nav link tracking
  //   var navLinks  = $qa(".nav-links a");
  //   var navHeight = navbar.offsetHeight;

  //   navLinks.forEach(function (link) {
  //     link.addEventListener("click", function () {
  //       var tid = link.dataset && link.dataset.target;
  //       if (!tid) return;
  //       var el = $q("#" + tid);
  //       if (!el) return;
  //       var y = el.getBoundingClientRect().top + window.pageYOffset - navHeight - 10;
  //       window.scrollTo({ top: y, behavior: "smooth" });
  //       navLinks.forEach(function (l) { l.classList.remove("active"); });
  //       link.classList.add("active");
  //     });
  //   });

  //   var sections = $qa("section");
  //   window.addEventListener("scroll", function () {
  //     var current = "";
  //     sections.forEach(function (s) {
  //       if (window.scrollY >= s.offsetTop - navHeight - 20) {
  //         current = s.getAttribute("id") || "";
  //       }
  //     });
  //     navLinks.forEach(function (l) {
  //       l.classList.toggle(
  //         "active",
  //         !!(l.dataset && l.dataset.target === current)
  //       );
  //     });
  //   }, { passive: true });
  // }

  // ==========================================================
  // DASHBOARD INIT
  // ==========================================================

  function initDashboard() {
    if (!protectPage()) return;

    var Auth = getAuth();

    // ❗ MUHIM TUZATISH: ILGARI shu yerda "agar Auth.getCurrentUser() null
    // bo'lsa — login.html'ga qaytar" degan tekshiruv bor edi. Lekin
    // verify/signin backend javobida "user" obyekti UMUMAN qaytmaydi
    // (faqat { message, access_token }) — shuning uchun login/verify'dan
    // DARHOL keyin getCurrentUser() har doim null bo'ladi, garchi
    // foydalanuvchi haqiqatan ham tizimga kirgan (token bor) bo'lsa ham.
    // Natijada: index.html ochiladi -> initDashboard() "user yo'q" deb
    // login.html'ga qaytaradi -> login.html "token bor" deb yana
    // index.html'ga qaytaradi -> CHEKSIZ SIKL (redirect loop).
    //
    // TO'G'RI TEKSHIRUV — sessiya (token+role) haqiqiy autentifikatsiya
    // belgisi, "user" obyekti esa faqat UI'ni to'ldirish uchun (u
    // script.js'dagi loadProfile() orqali GET /store/profile/get'dan
    // ALOHIDA yuklanadi). Shu sabab bu yerda faqat null-safe qilib
    // qo'yamiz, redirect qilmaymiz.
    var user = (Auth && typeof Auth.getCurrentUser === "function")
      ? (Auth.getCurrentUser() || {})
      : {};

    setText($("profileName"), user.fullName || "");
    setText($("profileEmail"), user.email || "");
    setText($("profilePhone"), user.phone || "");
    setText($("profileStore"), user.storeName || "");
    setText($("profileRole"), user.role || "");

    var logoutBtn = $("logoutBtn");

    if (logoutBtn && logoutBtn.dataset.logoutBound !== "true") {
      logoutBtn.dataset.logoutBound = "true";
      logoutBtn.addEventListener("click", function (e) {
        e.preventDefault();

        if (Auth && typeof Auth.logout === "function") {
          Auth.logout();
        }
      });
    }
  }

  // ==========================================================
  // ROUTER
  // ==========================================================

  function route() {
    if (Page.isSignup()) {
      initSignupPage();
      return;
    }

    if (Page.isLogin()) {
      initLoginPage();
      initForgotPasswordModal();
      return;
    }

    if (Page.isLanding()) {
      initLandingPage();
      return;
    }

    initDashboard();
  }

  // ==========================================================
  // PAROLNI KO'RSATISH / YASHIRISH (show/hide password)
  // Sahifadagi barcha [data-pw-toggle] tugmalari uchun umumiy ishlaydi.
  // Hech qanday tugma topilmasa, hech narsa qilmaydi.
  // ==========================================================

  function initPasswordToggles() {
    var toggles = $qa("[data-pw-toggle]");
    if (!toggles || !toggles.length) return;

    toggles.forEach(function (btn) {
      var targetId = btn.getAttribute("data-pw-toggle");
      var input = targetId ? $(targetId) : null;
      if (!input) return;

      btn.addEventListener("click", function () {
        var isHidden = input.type === "password";
        input.type = isHidden ? "text" : "password";
        btn.textContent = isHidden ? "🙈" : "👁";
        btn.setAttribute(
          "aria-label",
          isHidden ? "Parolni yashirish" : "Parolni ko'rsatish"
        );
      });
    });
  }

  // ==========================================================
  // BOOT
  // ==========================================================

  document.addEventListener("DOMContentLoaded", function () {
    Transition.init();
    initPasswordToggles();
    route();
  });

  // ==========================================================
  // GLOBAL EXPORTS
  // ==========================================================

  global.goToPage = function (url) {
    Transition.go(url);
  };

  global.goToSignup = function () {
    Transition.go(SIGNUP_PAGE);
  };

  global.logout = function () {
    var Auth = getAuth();

    if (Auth && typeof Auth.logout === "function") {
      Auth.logout();
    }
  };

  global.getCurrentUser = function () {
    var Auth = getAuth();

    if (Auth && typeof Auth.getCurrentUser === "function") {
      return Auth.getCurrentUser();
    }

    return null;
  };

  global.updateCurrentUser = function (data) {
    var Auth = getAuth();

    if (Auth && typeof Auth.updateCurrentUserData === "function") {
      return Auth.updateCurrentUserData(data);
    }

    return false;
  };

  global.isUserLoggedIn = function () {
    return isLoggedIn();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 🌐 GLOBAL getAuth BRIDGE (index.js ichidan)
  //
  // index.js IIFE ichidagi `getAuth()` private edi — tashqi fayllar
  // (signup.js, profile.js, dashboard.js) uni topa olmaydi.
  // window.getAuth auth.js dan ham set qilinadi, lekin bu yerda ham
  // override qilamiz — agar index.js keyin yuklansa, to'g'ri versiya saqlansin.
  // Bu IIFE ichidagi private getAuth() ga delegate qiladi.
  // ─────────────────────────────────────────────────────────────────────────
  global.getAuth = function () {
    return getAuth();
  };

})(window);