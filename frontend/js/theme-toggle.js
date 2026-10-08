/**
 * MARK1 — Yagona Mavzu Tizimi
 * Barcha sahifalar: landing, login, signup, index (dashboard)
 *
 * Ishlash tartibi:
 * 1. localStorage'dan mavzuni o'qiydi
 * 2. Agar sahifada #themeToggleBtn bo'lsa — uni ishlatadi
 * 3. Agar bo'lmasa — suzuvchi tugma yaratadi (landing, login, signup)
 * 4. Tugma bosilganda: tungi ↔ kunduzgi
 * 5. Klaviatura: Shift+T — mavzuni almashtirish
 */
(function () {
  "use strict";

  /* ── 1. FOUC oldini olish (sahifa yuklanishidan OLDIN) ── */
  function applySavedTheme() {
    var saved = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = saved ? saved === "dark" : prefersDark;

    if (isDark) {
      document.documentElement.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
    }
    return isDark;
  }

  var isDark = applySavedTheme();

  /* ── 1b. Tugma ichini chizish: bootstrap-icon yoki emoji ──
     data-theme-icon="bi" bo'lsa (dashboard) ikonka, aks holda emoji
     (landing/login/signup sahifalarida hech narsa o'zgarmaydi). */
  function setToggleIcon(btn, dark) {
    if (btn.hasAttribute("data-theme-icon")) {
      btn.innerHTML = dark
        ? '<i class="bi bi-sun" aria-hidden="true"></i>'
        : '<i class="bi bi-moon-stars" aria-hidden="true"></i>';
    } else {
      btn.textContent = dark ? "\u2600\uFE0F" : "\uD83C\uDF19";
    }
  }

  /* ── 2. Mavzuni almashtirish funksiyasi ── */
  function toggleTheme() {
    var current = document.documentElement.classList.contains("dark-mode");
    var next = !current;

    document.documentElement.classList.toggle("dark-mode", next);
    localStorage.setItem("theme", next ? "dark" : "light");

    // Barcha toggle tugmalarini yangilash
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      setToggleIcon(btn, next);
      btn.setAttribute("aria-label", next ? "Kunduzgi rejimga o'tish" : "Tungi rejimga o'tish");
    });

    // Sozlamalar sahifasidagi toggle (agar bo'lsa)
    syncSettingsToggle(next);

    // Oddiy animatsiya
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.style.transform = "scale(0.85)";
      setTimeout(function () {
        btn.style.transform = "";
      }, 150);
    });
  }

  function syncSettingsToggle(dark) {
    var darkToggle = document.getElementById("darkModeToggle");
    if (darkToggle) darkToggle.checked = dark;
  }

  // Global qilish
  window.toggleTheme = toggleTheme;

  /* ── 3. DOM yuklangandan keyin ── */
  document.addEventListener("DOMContentLoaded", function () {
    var existingBtn = document.getElementById("themeToggleBtn");

    if (existingBtn) {
      // Index.html kabi sahifada — mavjud tugmani ishlatish
      existingBtn.setAttribute("data-theme-toggle", "");
      setToggleIcon(existingBtn, isDark);
      existingBtn.setAttribute("aria-label", isDark ? "Kunduzgi rejimga o'tish" : "Tungi rejimga o'tish");
      existingBtn.addEventListener("click", toggleTheme);
    } else {
      // Landing, Login, Signup — suzuvchi tugma yaratish
      createFloatingButton();
    }

    // Klaviatura qisqartmasi: Shift+T
    document.addEventListener("keydown", function (e) {
      if (e.shiftKey && e.key === "T" && !isInputFocused()) {
        e.preventDefault();
        toggleTheme();
      }
    });

    // Sozlamalar sahifasidagi darkModeToggle checkbox
    var settingsToggle = document.getElementById("darkModeToggle");
    if (settingsToggle) {
      settingsToggle.checked = isDark;
      settingsToggle.addEventListener("change", function (e) {
        var dark = e.target.checked;
        document.documentElement.classList.toggle("dark-mode", dark);
        localStorage.setItem("theme", dark ? "dark" : "light");
        isDark = dark;
        document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
          setToggleIcon(btn, dark);
          btn.setAttribute("aria-label", dark ? "Kunduzgi rejimga o'tish" : "Tungi rejimga o'tish");
        });
      });
    }

    // Tizim mavzusi o'zgarsa — yangilash
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
      if (!localStorage.getItem("theme")) {
        document.documentElement.classList.toggle("dark-mode", e.matches);
        isDark = e.matches;
        document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
          setToggleIcon(btn, isDark);
        });
        syncSettingsToggle(isDark);
      }
    });
  });

  /* ── 4. Suzuvchi tugma (landing, login, signup uchun) ── */
  function createFloatingButton() {
    var btn = document.createElement("button");
    btn.setAttribute("data-theme-toggle", "");
    // QA: emoji 🌙/☀️ o'rniga Bootstrap Icons (yagona ikonka tizimi)
    // Bootstrap Icons landing/login/signup sahifalarida yuklangan.
    btn.setAttribute("data-theme-icon", "bi");
    btn.setAttribute("aria-label", isDark ? "Kunduzgi rejimga o'tish" : "Tungi rejimga o'tish");
    btn.setAttribute("title", "Mavzuni almashtirish (Shift+T)");
    setToggleIcon(btn, isDark);

    // Stillar
    btn.style.cssText = [
      "position:fixed",
      "bottom:24px",
      "right:24px",
      "width:52px",
      "height:52px",
      "border-radius:50%",
      "border:1px solid rgba(255,255,255,0.12)",
      "box-shadow:0 4px 20px rgba(0,0,0,0.25), 0 0 0 0 rgba(91,106,240,0)",
      "background:rgba(20,24,40,0.85)",
      "backdrop-filter:blur(12px)",
      "-webkit-backdrop-filter:blur(12px)",
      "color:#fff",
      "font-size:22px",
      "cursor:pointer",
      "z-index:999999",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "transition:all 0.3s cubic-bezier(0.4,0,0.2,1)",
      "line-height:1"
    ].join(";");

    // Hover effekti
    btn.addEventListener("mouseenter", function () {
      btn.style.transform = "scale(1.1)";
      btn.style.boxShadow = "0 4px 20px rgba(0,0,0,0.25), 0 0 0 3px rgba(91,106,240,0.3)";
    });
    btn.addEventListener("mouseleave", function () {
      btn.style.transform = "";
      btn.style.boxShadow = "0 4px 20px rgba(0,0,0,0.25), 0 0 0 0 rgba(91,106,240,0)";
    });

    btn.addEventListener("click", toggleTheme);
    document.body.appendChild(btn);
  }

  /* ── 5. Yordamchi ── */
  function isInputFocused() {
    var el = document.activeElement;
    if (!el) return false;
    var tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  }
})();
