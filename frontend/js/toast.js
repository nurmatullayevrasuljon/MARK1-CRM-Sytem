// Toast Notification System to replace ugly window.alert
(function() {
  const style = document.createElement('style');
  style.textContent = `
    #toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .custom-toast {
      background: var(--bg-card, #fff);
      color: var(--text-primary, #111827);
      padding: 16px 24px;
      border-radius: var(--radius-lg, 12px);
      box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.1));
      border: 1px solid var(--border-subtle, rgba(0,0,0,0.05));
      font-family: var(--font-sans, system-ui);
      font-size: 14px;
      font-weight: 500;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 400px;
    }
    .custom-toast.show {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    .toast-icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    .toast-icon.error { background: #FEE2E2; color: #EF4444; }
    .toast-icon.success { background: #DCFCE7; color: #22C55E; }
    .toast-icon.info { background: #DBEAFE; color: #3B82F6; }
    
    /* Custom Modal/Prompt/Confirm */
    #custom-modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(4px);
      z-index: 9998;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; pointer-events: none; transition: opacity 0.2s;
    }
    #custom-modal-overlay.show { opacity: 1; pointer-events: auto; }
    .custom-modal {
      background: var(--bg-card, #fff);
      padding: 32px;
      border-radius: var(--radius-lg, 16px);
      box-shadow: var(--shadow-lg);
      width: 90%; max-width: 400px;
      transform: scale(0.95); transition: transform 0.2s;
    }
    #custom-modal-overlay.show .custom-modal { transform: scale(1); }
    .custom-modal h3 { margin-top: 0; margin-bottom: 8px; font-size: 18px; font-weight: 600; }
    .custom-modal p { margin-bottom: 24px; color: var(--text-secondary, #4B5563); font-size: 14px; }
    .custom-modal input {
      width: 100%; padding: 12px 16px; border-radius: 8px;
      border: 1px solid var(--border-subtle); margin-bottom: 24px;
      outline: none; font-size: 15px;
    }
    .custom-modal input:focus { border-color: var(--brand-accent); box-shadow: 0 0 0 3px rgba(37,99,235,0.2); }
    .custom-modal .btns { display: flex; gap: 12px; justify-content: flex-end; }
    .custom-modal button {
      padding: 10px 20px; border-radius: 8px; border: none; font-weight: 500; cursor: pointer;
      transition: all 0.2s;
    }
    .custom-modal .btn-cancel { background: #F3F4F6; color: #374151; }
    .custom-modal .btn-cancel:hover { background: #E5E7EB; }
    .custom-modal .btn-confirm { background: var(--brand-primary, #0F172A); color: #fff; }
    .custom-modal .btn-confirm:hover { background: var(--brand-hover, #1E293B); }
  `;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.id = 'toast-container';
  document.body.appendChild(container);

  window.showToast = function(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    
    let iconSvg = '';
    if (type === 'error') iconSvg = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
    else if (type === 'success') iconSvg = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
    else iconSvg = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

    toast.innerHTML = `<div class="toast-icon ${type}">${iconSvg}</div><div>${msg}</div>`;
    container.appendChild(toast);
    
    // trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  // OVERRIDE window.alert
  window.alert = function(msg) {
    if (!msg) return;
    const msgStr = msg.toString().toLowerCase();
    let type = 'info';
    if (msgStr.includes('xato') || msgStr.includes('error') || msgStr.includes('noto\'g\'ri') || msgStr.includes('❌')) type = 'error';
    if (msgStr.includes('muvaffaq') || msgStr.includes('yaratildi') || msgStr.includes('✅')) type = 'success';
    
    // Clean emojis from text
    const cleanMsg = msg.toString().replace(/[❌✅]/g, '').trim();
    window.showToast(cleanMsg, type);
  };

})();

  window.showConfirm = function(msg, title = 'Tasdiqlash', confirmText = 'Tasdiqlash', cancelText = 'Bekor qilish', danger = false) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.id = 'custom-modal-overlay';
      const btnClass = danger ? "btn-confirm btn-danger" : "btn-confirm";
      const iconHtml = danger ? '<div style="color: #ef4444; font-size: 3rem; margin-bottom: 1rem; text-align: center;"><i class="bi bi-exclamation-triangle-fill"></i></div>' : '';
      overlay.innerHTML = `
        <div class="custom-modal" style="text-align: center;">
          ${iconHtml}
          <h3>${title}</h3>
          <p>${msg.replace(/\n/g, '<br>')}</p>
          <div class="btns" style="display: flex; gap: 1rem; width: 100%;">
            <button class="btn-cancel" style="flex: 1;">${cancelText}</button>
            <button class="${btnClass}" style="flex: 1; ${danger ? 'background: #ef4444;' : ''}">${confirmText}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      setTimeout(() => overlay.classList.add('show'), 10);
      
      const close = (val) => {
        overlay.classList.remove('show');
        setTimeout(() => { overlay.remove(); resolve(val); }, 200);
      };
      
      overlay.querySelector('.btn-cancel').onclick = () => close(false);
      overlay.querySelector('.btn-confirm').onclick = () => close(true);
    });
  };

  window.showPrompt = function(msg) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.id = 'custom-modal-overlay';
      overlay.innerHTML = `
        <div class="custom-modal">
          <h3>Kiritish</h3>
          <p>${msg.replace(/\n/g, '<br>')}</p>
          <input type="text" id="prompt-input" autocomplete="off">
          <div class="btns">
            <button class="btn-cancel">Bekor qilish</button>
            <button class="btn-confirm">Tasdiqlash</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      setTimeout(() => {
        overlay.classList.add('show');
        document.getElementById('prompt-input').focus();
      }, 10);
      
      const close = (val) => {
        overlay.classList.remove('show');
        setTimeout(() => { overlay.remove(); resolve(val); }, 200);
      };
      
      overlay.querySelector('.btn-cancel').onclick = () => close(null);
      overlay.querySelector('.btn-confirm').onclick = () => {
        const val = document.getElementById('prompt-input').value;
        close(val === "" ? null : val);
      };
    });
  };
