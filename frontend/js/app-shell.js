/* ==========================================================================
   MARK1 CRM — APP SHELL
   Sidebar (collapse + mobile drawer), modal focus management, toast,
   confirm dialog va kichik UX yordamchilari.
   Hech qanday biznes logikasini o'zgartirmaydi.
   ========================================================================== */
(function () {
  "use strict";

  var body = document.body;
  var LS_COLLAPSE = "mk_sidebar_collapsed";

  /* ── 1. Sidebar collapse (desktop) ─────────────────────────────────────── */
  function initSidebarCollapse() {
    var sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    // data-label — collapsed holatda tooltip uchun
    sidebar.querySelectorAll(".nav-item").forEach(function (item) {
      if (!item.dataset.label) {
        item.dataset.label = (item.textContent || "").trim();
      }
      if (!item.getAttribute("role")) item.setAttribute("role", "button");
      if (!item.hasAttribute("tabindex")) item.setAttribute("tabindex", "0");
    });

    if (localStorage.getItem(LS_COLLAPSE) === "1") {
      body.classList.add("mk-sidebar-collapsed");
    }

    var toggle = document.querySelector("[data-mk-sidebar-toggle]");
    if (!toggle) return;
    toggle.addEventListener("click", function () {
      body.classList.toggle("mk-sidebar-collapsed");
      var collapsed = body.classList.contains("mk-sidebar-collapsed");
      localStorage.setItem(LS_COLLAPSE, collapsed ? "1" : "0");
      toggle.setAttribute("aria-expanded", String(!collapsed));
    });
  }

  /* ── 2. Mobile drawer ──────────────────────────────────────────────────── */
  function initMobileDrawer() {
    var sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    var backdrop = document.createElement("div");
    backdrop.className = "mk-nav-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    body.appendChild(backdrop);

    var openBtn = document.querySelector("[data-mk-menu]");
    var closeBtn = sidebar.querySelector("[data-mk-drawer-close]");
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      body.classList.add("mk-nav-open");
      if (openBtn) openBtn.setAttribute("aria-expanded", "true");
      var first = sidebar.querySelector(".nav-item");
      if (first) first.focus();
    }
    function close() {
      body.classList.remove("mk-nav-open");
      if (openBtn) openBtn.setAttribute("aria-expanded", "false");
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }
    function isOpen() {
      return body.classList.contains("mk-nav-open");
    }

    if (openBtn) openBtn.addEventListener("click", function () { isOpen() ? close() : open(); });
    if (closeBtn) closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) close();
    });

    // Navigatsiya tanlanganda drawerni yopish
    sidebar.addEventListener("click", function (e) {
      var item = e.target.closest(".nav-item");
      if (item && isOpen()) close();
    });
  }

  /* ── 3. Modal focus management ─────────────────────────────────────────── */
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var openModals = [];

  function activeModal() {
    return openModals.length ? openModals[openModals.length - 1] : null;
  }

  function syncModals() {
    var modals = Array.prototype.slice.call(
      document.querySelectorAll(".modal-debtors, .modal")
    );
    modals.forEach(function (m) {
      var visible = m.classList.contains("show") ||
        (m.classList.contains("modal") && getComputedStyle(m).display !== "none");
      var already = openModals.indexOf(m) !== -1;
      if (visible && !already) {
        openModals.push(m);
        m.setAttribute("aria-hidden", "false");
        m.dataset.mkReturnFocus = "1";
        var first = m.querySelector(FOCUSABLE);
        if (first) {
          setTimeout(function () { try { first.focus(); } catch (err) {} }, 30);
        }
      } else if (!visible && already) {
        openModals.splice(openModals.indexOf(m), 1);
        m.setAttribute("aria-hidden", "true");
      }
    });
    body.style.overflow = openModals.length ? "hidden" : "";
  }

  function initModals() {
    var observer = new MutationObserver(syncModals);
    document.querySelectorAll(".modal-debtors, .modal").forEach(function (m) {
      observer.observe(m, { attributes: true, attributeFilter: ["class", "style"] });
    });
    syncModals();

    document.addEventListener("keydown", function (e) {
      var modal = activeModal();
      if (!modal) return;

      if (e.key === "Escape") {
        var closeBtn = modal.querySelector(".close-modal-debtors, [data-bs-dismiss='modal'], .btn-close");
        if (closeBtn) {
          closeBtn.click();
          e.preventDefault();
        }
        return;
      }

      if (e.key !== "Tab") return;
      var items = Array.prototype.slice.call(modal.querySelectorAll(FOCUSABLE))
        .filter(function (el) { return el.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    });
  }

  /* ── 4. Toast ──────────────────────────────────────────────────────────── */
  function toastHost() {
    var host = document.getElementById("mk-toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "mk-toast-host";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    return host;
  }

  function toast(message, type) {
    if (!message) return;
    type = type || "info";
    var host = toastHost();
    var el = document.createElement("div");
    el.className = "mk-toast is-" + type;
    var icon = type === "success" ? "check-circle-fill"
      : type === "error" ? "exclamation-circle-fill"
      : "info-circle-fill";
    el.innerHTML =
      '<i class="bi bi-' + icon + '" aria-hidden="true"></i>' +
      '<div class="mk-grow"></div>';
    el.querySelector(".mk-grow").textContent = message;
    host.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      setTimeout(function () { el.remove(); }, 200);
    }, 3600);
  }

  /* ── 5. Confirm dialog ─────────────────────────────────────────────────── */
  function confirmDialog(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.className = "modal-debtors show";
      overlay.setAttribute("role", "alertdialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.style.cssText = "position:fixed;inset:0;z-index:1300;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(10,15,35,.55);";

      var title = opts.title || "Tasdiqlaysizmi?";
      var text = opts.text || "";
      var okText = opts.okText || "Tasdiqlash";
      var cancelText = opts.cancelText || "Bekor qilish";
      var danger = !!opts.danger;

      overlay.innerHTML =
        '<div class="modal-debtors-content" style="max-width:420px;width:100%;background:var(--bg-card);border-radius:16px;overflow:hidden;">' +
        '<div class="modal-debtors-header"><h2></h2></div>' +
        '<div class="mk-modal-body" style="padding:18px 20px;color:var(--text-secondary);font-size:14px;line-height:1.6"></div>' +
        '<div class="mk-modal-foot">' +
        '<button type="button" class="btn btn-outline-secondary" data-mk-cancel></button>' +
        '<button type="button" class="btn ' + (danger ? "btn-danger" : "btn-primary") + '" data-mk-ok></button>' +
        '</div></div>';

      overlay.querySelector("h2").textContent = title;
      overlay.querySelector(".mk-modal-body").textContent = text;
      overlay.querySelector("[data-mk-cancel]").textContent = cancelText;
      overlay.querySelector("[data-mk-ok]").textContent = okText;

      function done(value) {
        overlay.remove();
        document.removeEventListener("keydown", onKey);
        resolve(value);
      }
      function onKey(e) {
        if (e.key === "Escape") done(false);
      }
      overlay.querySelector("[data-mk-cancel]").onclick = function () { done(false); };
      overlay.querySelector("[data-mk-ok]").onclick = function () { done(true); };
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) done(false);
      });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(overlay);
      overlay.querySelector("[data-mk-ok]").focus();
    });
  }

  /* ── 6. Helpers ────────────────────────────────────────────────────────── */
  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait || 250);
    };
  }

  function formatSum(value) {
    var n = Number(value) || 0;
    return n.toLocaleString("ru-RU").replace(/,/g, " ");
  }

  // Barcha jadval kataklariga data-label (mobil karta ko'rinishi uchun)
  function labelTables() {
    document.querySelectorAll("table.table").forEach(function (table) {
      if (table.dataset.mkLabeled === "1") return;
      var headers = Array.prototype.map.call(
        table.querySelectorAll("thead th"),
        function (th) { return (th.textContent || "").trim(); }
      );
      if (!headers.length) return;
      table.querySelectorAll("tbody tr").forEach(function (row) {
        Array.prototype.forEach.call(row.children, function (cell, i) {
          if (!cell.dataset.label && headers[i]) cell.dataset.label = headers[i];
        });
      });
      table.dataset.mkLabeled = "1";
    });
  }

  var labelObserver = new MutationObserver(function () {
    labelTables();
  });

  /* ── 7. Boot ───────────────────────────────────────────────────────────── */
  function boot() {
    initSidebarCollapse();
    initMobileDrawer();
    initModals();
    labelTables();
    document.querySelectorAll("table.table tbody").forEach(function (tbody) {
      labelObserver.observe(tbody, { childList: true });
    });

    // Sidebar foydalanuvchi bloki — topbar profilidan sinxronlash
    var sidebarName = document.getElementById("sidebarUserName");
    var sidebarStore = document.getElementById("sidebarUserStore");
    var sidebarAvatar = document.getElementById("sidebarAvatar");

    function syncSidebarUser() {
      var nameEl = document.getElementById("profileName");
      var storeEl = document.getElementById("profileEmail") ||
        document.getElementById("companyName");
      var name = nameEl ? nameEl.textContent.trim() : "";
      var store = storeEl ? storeEl.textContent.trim() : "";

      if (sidebarName && name && name !== "Foydalanuvchi") {
        sidebarName.textContent = name;
      }
      if (sidebarStore && store) {
        sidebarStore.textContent = store;
      }
      if (sidebarAvatar && name) {
        var parts = name.split(/\s+/).filter(Boolean);
        var initials = (parts[0] ? parts[0][0] : "") +
          (parts[1] ? parts[1][0] : "");
        sidebarAvatar.textContent = initials.toUpperCase() || "M";
      }
    }

    syncSidebarUser();
    var userObserver = new MutationObserver(syncSidebarUser);
    ["profileName", "profileEmail"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) userObserver.observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.MK = {
    toast: toast,
    confirm: confirmDialog,
    debounce: debounce,
    formatSum: formatSum,
    labelTables: labelTables
  };
})();
