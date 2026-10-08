/**
 * CRM UX Enhancements
 * Keyboard shortcuts, focus management, accessibility, loading states
 */
(function () {
  'use strict';

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================
  document.addEventListener('keydown', function (e) {
    var target = e.target;
    var isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

    // "/" → Focus search (only when not in an input)
    if (e.key === '/' && !isInput) {
      e.preventDefault();
      var searchInput = document.getElementById('productSearch') ||
                        document.getElementById('searchInput') ||
                        document.getElementById('transactionSearch');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
      return;
    }

    // "Escape" → Close open modal or blur input
    if (e.key === 'Escape') {
      // Close any open custom modals (debtors, debt sale, etc.)
      var openModals = document.querySelectorAll('.modal-debtors.show, .modal.show');
      if (openModals.length > 0) {
        openModals.forEach(function (modal) {
          modal.classList.remove('show');
          modal.style.display = 'none';
        });
        return;
      }

      // Close profile dropdown
      var dropdown = document.getElementById('profileDropdown');
      var overlay = document.getElementById('dropdownOverlay');
      if (dropdown && dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
        return;
      }

      // Blur active input
      if (isInput) {
        target.blur();
        return;
      }
    }

    // "n" or "N" → New item (only when not in an input)
    if ((e.key === 'n' || e.key === 'N') && !isInput && !e.ctrlKey && !e.metaKey) {
      var addProductBtn = document.getElementById('openProductModal');
      if (addProductBtn) {
        e.preventDefault();
        addProductBtn.click();
        return;
      }
    }
  });

  // ============================================================
  // FOCUS TRAP FOR MODALS
  // ============================================================
  function trapFocus(modalElement) {
    var focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    var focusableElements = modalElement.querySelectorAll(focusableSelectors);
    if (focusableElements.length === 0) return;

    var firstElement = focusableElements[0];
    var lastElement = focusableElements[focusableElements.length - 1];

    modalElement.addEventListener('keydown', function handler(e) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }

      // Remove handler when modal is hidden
      if (!modalElement.classList.contains('show') && modalElement.style.display === 'none') {
        modalElement.removeEventListener('keydown', handler);
      }
    });

    // Focus first element when modal opens
    setTimeout(function () {
      if (firstElement && firstElement.focus) {
        firstElement.focus();
      }
    }, 100);
  }

  // Apply focus trap to all debtor modals
  var debtorModals = document.querySelectorAll('.modal-debtors');
  debtorModals.forEach(function (modal) {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
          if (modal.classList.contains('show') || modal.style.display === 'flex') {
            trapFocus(modal);
          }
        }
      });
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class', 'style'] });
  });

  // ============================================================
  // LOADING STATE HELPERS
  // ============================================================
  window.showTableLoading = function (tbodyId, colCount) {
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    var rows = '';
    for (var i = 0; i < 5; i++) {
      rows += '<tr class="skeleton-row-loading">';
      for (var j = 0; j < colCount; j++) {
        rows += '<td><div class="skeleton skeleton-text" style="width:' + (60 + Math.random() * 40) + '%"></div></td>';
      }
      rows += '</tr>';
    }
    tbody.innerHTML = rows;
  };

  window.hideTableLoading = function (tbodyId) {
    var tbody = document.getElementById(tbodyId);
    if (tbody) {
      var skeletons = tbody.querySelectorAll('.skeleton-row-loading');
      skeletons.forEach(function (row) { row.remove(); });
    }
  };

  // ============================================================
  // EMPTY STATE HELPERS
  // ============================================================
  window.showEmptyState = function (containerId, icon, title, desc, actionHtml) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-state-icon">' + icon + '</div>' +
        '<div class="empty-state-title">' + title + '</div>' +
        '<div class="empty-state-desc">' + desc + '</div>' +
        (actionHtml || '') +
      '</div>';
  };

  window.showErrorState = function (containerId, title, desc, retryFn) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var retryHtml = retryFn ?
      '<button class="btn btn-primary" onclick="(' + retryFn.name + ')()">Qayta urinish</button>' : '';
    container.innerHTML =
      '<div class="error-state">' +
        '<div class="error-state-icon">' +
          '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>' +
          '</svg>' +
        '</div>' +
        '<div class="error-state-title">' + title + '</div>' +
        '<div class="error-state-desc">' + desc + '</div>' +
        retryHtml +
      '</div>';
  };

  // ============================================================
  // PAGE TRANSITION ANIMATION
  // ============================================================
  var style = document.createElement('style');
  style.textContent =
    '.skeleton-row-loading td { padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-subtle); }' +
    '.skeleton-row-loading .skeleton { display: block; }';
  document.head.appendChild(style);

  // ============================================================
  // SMOOTH SCROLL TO TOP ON SECTION CHANGE
  // ============================================================
  var sections = document.querySelectorAll('.section');
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var section = entry.target;
        section.style.animation = 'none';
        section.offsetHeight; // trigger reflow
        section.style.animation = '';
      }
    });
  }, { threshold: 0.1 });
  sections.forEach(function (s) { observer.observe(s); });

  // ============================================================
  // ACCESSIBLE TOGGLE PASSWORD VISIBILITY
  // ============================================================
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.pw-toggle-btn');
    if (!btn) return;
    var targetId = btn.getAttribute('data-pw-toggle');
    var input = targetId ? document.getElementById(targetId) : null;
    if (!input) return;

    var isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    // QA: emoji o'rniga Bootstrap Icons (yagona ikonka tizimi)
    var icon = btn.querySelector('i');
    if (icon) {
      icon.className = isHidden ? 'bi bi-eye-slash' : 'bi bi-eye';
    } else {
      btn.innerHTML = isHidden
        ? '<i class="bi bi-eye-slash" aria-hidden="true"></i>'
        : '<i class="bi bi-eye" aria-hidden="true"></i>';
    }
    btn.setAttribute('aria-label', isHidden ? 'Parolni yashirish' : 'Parolni ko\'rsatish');
  });

  // ============================================================
  // SMOOTH SECTION NAVIGATION (scroll to top)
  // ============================================================
  var navItems = document.querySelectorAll('.nav-item[data-target]');
  navItems.forEach(function (item) {
    item.addEventListener('click', function () {
      var mainContent = document.querySelector('.content');
      if (mainContent) {
        mainContent.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    });
  });

})();

  // ============================================================
  // BUTTON LOADING STATE
  // ============================================================
  window.setBtnLoading = function(btn, isLoading) {
    if (typeof btn === 'string') btn = document.getElementById(btn) || document.querySelector(btn);
    if (!btn) return;
    
    if (isLoading) {
      if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="margin-right: 5px;"></span> Kutib turing...';
      btn.disabled = true;
      btn.style.opacity = '0.7';
    } else {
      if (btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
      }
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  };

  // ============================================================
  // PROMISE-BASED CONFIRM DIALOG
  // ============================================================
  window.showConfirm = function(message, title, confirmText, cancelText, isDanger) {
    return new Promise(function(resolve) {
      if (!window.Toastify) {
        var res = window.confirm(message);
        resolve(res);
        return;
      }
      
      var id = 'confirm-' + Math.random().toString(36).substr(2, 9);
      var colorClass = isDanger ? 'bg-danger' : 'bg-primary';
      var titleHtml = title ? '<strong>' + title + '</strong><br>' : '';
      
      var html = '<div id="' + id + '" style="display:flex; flex-direction:column; gap:10px;">' +
                 '<div>' + titleHtml + message + '</div>' +
                 '<div style="display:flex; gap:10px; justify-content:flex-end; margin-top:5px;">' +
                 '<button class="btn btn-sm btn-secondary" id="cancel-' + id + '">' + (cancelText || 'Bekor qilish') + '</button>' +
                 '<button class="btn btn-sm text-white ' + colorClass + '" id="ok-' + id + '">' + (confirmText || 'Tasdiqlash') + '</button>' +
                 '</div></div>';
                 
      var toast = Toastify({
        text: html,
        escapeMarkup: false,
        duration: -1,
        close: false,
        gravity: "top",
        position: "center",
        className: "confirm-toast",
        stopOnFocus: true,
        style: {
          background: "var(--mk-bg-elevated)",
          color: "var(--mk-fg)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          borderRadius: "12px",
          border: "1px solid var(--mk-border)",
          padding: "20px",
          minWidth: "300px"
        }
      }).showToast();
      
      setTimeout(function() {
        document.getElementById('cancel-' + id).addEventListener('click', function() {
          toast.hideToast();
          resolve(false);
        });
        document.getElementById('ok-' + id).addEventListener('click', function() {
          toast.hideToast();
          resolve(true);
        });
      }, 100);
    });
  };
