const API_URL = "https://mark1-crm-sytem.onrender.com";
// ============================================================
// 📦 USER DATA LOADING (SODDALASHTIRILGAN)
// ============================================================
// function loadUserData() {
//   const Auth = window.AuthSystem;

//   if (!Auth || typeof Auth.getCurrentUser !== "function") {
//     return false;
//   }

//   const userData =
//     typeof Auth.getCurrentUserFullData === "function"
//       ? Auth.getCurrentUserFullData()
//       : Auth.getCurrentUser();

//   if (!userData) {
//     return false;
//   }

//   products = chooseUserArray(userData.products, products, []);
//   categories = chooseUserArray(userData.categories, categories, ['Electronics']);
//   sales = chooseUserArray(userData.sales, sales, []);
//   debtors = chooseUserArray(userData.debtors, debtors, []);
//   paidDebtors = chooseUserArray(userData.paidDebtors, paidDebtors, []);
//   smsHistory = chooseUserArray(userData.smsHistory, smsHistory, []);

//   persistUserData({
//     products,
//     categories,
//     sales,
//     debtors,
//     paidDebtors,
//     smsHistory
//   });

//   console.log('✅ User data loaded:', userData.email);
//   return true;
// }


// KEYIN SIZNING BARCHA ESKI KODINGIZ...


// Welcome text animation
const items = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
      }
    });
  },
  { threshold: 0.15 }
);

items.forEach(el => observer.observe(el));

/* ===============================================
   BUGUNGI DAROMAD COUNTER (dailySales ichida)
=============================================== */
// function updateDailySalesPageCounter(){

async function updateDailySalesPageCounter() {
  const counterEl = document.getElementById("dailySalesPageCounter");
  const changeEl = document.getElementById("dailySalesPageChange");

  if (!counterEl || !changeEl) return;

  try {
    const today = getToday();

    const stats = await getDailySalesStats();

    if (!stats || typeof stats.today_revenue !== "number") {
      console.warn("⚠️ DAILY SALES STATS noto'g'ri:", stats);
      return;
    }

    const todayTotal = Number(stats.today_revenue) || 0;
    const yesterdayTotal =
      Number(localStorage.getItem("yesterdaySalesTotal")) || 0;

    const lastShown =
      Number(counterEl.dataset.lastValue || 0);

    if (todayTotal !== lastShown) {
      animateCounter(counterEl, lastShown, todayTotal);
      counterEl.dataset.lastValue = todayTotal;
    } else {
      counterEl.innerText =
        todayTotal.toLocaleString("uz-UZ");
    }

    setTimeout(() => {
      counterEl.innerHTML = `
        ${todayTotal.toLocaleString("uz-UZ")}
        <small style="
          font-size:0.6em;
          color:#94a3b8;
          font-weight:400;
          margin-left:4px
        ">UZS</small>
      `;
    }, 1200);

    if (todayTotal === 0 && yesterdayTotal === 0) {
      changeEl.innerText = "Bugun savdo yo'q";
      changeEl.className = "counter-change text-muted";
    }

    else if (yesterdayTotal === 0 && todayTotal > 0) {
      changeEl.innerText = "▲ Yangi savdolar boshlandi";
      changeEl.className = "counter-change text-success";
    }

    else if (todayTotal === 0 && yesterdayTotal > 0) {
      changeEl.innerText =
        "▼ 100% kamaydi (kechaga nisbatan)";
      changeEl.className = "counter-change text-danger";
    }

    else {
      const percent =
        ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;

      if (percent > 0) {
        changeEl.innerText =
          `▲ ${percent.toFixed(1)}% kechaga nisbatan`;
        changeEl.className =
          "counter-change text-success";
      }

      else if (percent < 0) {
        changeEl.innerText =
          `▼ ${Math.abs(percent).toFixed(1)}% kechaga nisbatan`;
        changeEl.className =
          "counter-change text-danger";
      }

      else {
        changeEl.innerText = "Kecha bilan teng";
        changeEl.className =
          "counter-change text-muted";
      }
    }

    console.log("✅ DAILY SALES COUNTER UPDATED:", todayTotal);

  } catch (error) {
    console.error(
      "❌ updateDailySalesPageCounter ERROR:",
      error
    );
  }
}

// Dashboard'dagi umumiy qarzdorlik counterini yangilash (SUM + COUNT)
function updateTotalDebtCounter() {
  const counterEl = document.querySelector('.counter[data-key="totalDebt"]');
  const countEl = document.querySelector('.debt-count-badge');

  if (!counterEl) return;

  // Barcha qarzdorlarning umumiy qarzini hisoblash
  const totalDebt = debtors.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const debtorCount = debtors.length;
  const lastShown = Number(counterEl.dataset.lastValue || 0);

  // Counter animatsiya
  if (totalDebt !== lastShown) {
    let current = lastShown;
    const step = Math.ceil(Math.abs(totalDebt - lastShown) / 60);

    const interval = setInterval(() => {
      if (totalDebt > lastShown) {
        current += step;
        if (current >= totalDebt) {
          counterEl.innerHTML = `${totalDebt.toLocaleString()} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
          clearInterval(interval);
        } else {
          counterEl.innerHTML = `${Math.floor(current).toLocaleString()} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
        }
      } else {
        current -= step;
        if (current <= totalDebt) {
          counterEl.innerHTML = `${totalDebt.toLocaleString()} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
          clearInterval(interval);
        } else {
          counterEl.innerHTML = `${Math.floor(current).toLocaleString()} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
        }
      }
    }, 20);

    counterEl.dataset.lastValue = totalDebt;
  } else {
    counterEl.innerHTML = `${totalDebt.toLocaleString()} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
  }

  // Qarzdorlar sonini ko'rsatish
  if (countEl) {
    countEl.textContent = `${debtorCount} ta qarzdordan`;
  }
}

/* ===============================================
   NAVIGATION (Active sahifa saqlanadi)
=============================================== */
const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".section");
const pageTitle = document.getElementById("pageTitle");

function openPage(pageId, titleText) {
  const targetSection = document.getElementById(pageId) || document.getElementById("dashboard");
  if (!targetSection) return;

  const safePageId = targetSection.id;
  const activeNav = document.querySelector(`.nav-item[data-target="${safePageId}"]`);
  const activeMobileNav = document.querySelector(`.mobile-bottom-nav button[data-target="${safePageId}"]`);
  const safeTitle = titleText || activeNav?.innerText.trim() || activeMobileNav?.innerText.trim() || "Dashboard";

  navItems.forEach(n => n.classList.remove("active"));
  activeNav?.classList.add("active");

  document.querySelectorAll(".mobile-bottom-nav button").forEach(n => n.classList.remove("active"));
  activeMobileNav?.classList.add("active");

  sections.forEach(s => s.classList.remove("active"));
  targetSection.classList.add("active");

  if (pageTitle) {
    pageTitle.innerText = safeTitle;
  }

  localStorage.setItem("activePage", safePageId);
  localStorage.setItem("activePageTitle", safeTitle);
}

navItems.forEach(item => {
  item.addEventListener("click", () => {
    openPage(item.dataset.target, item.innerText.trim());
  });
});

/* ===============================================
   SANA VA VAQT
=============================================== */
function toLocalDate(value = new Date()) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(value);
}

function getDateKey(value = new Date()) {
  const date = toLocalDate(value);
  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentLocalDateTime() {
  const date = new Date();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

  return `${getDateKey(date)}T${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function getToday() {
  return getDateKey(new Date());
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getDateKey(d);
}

function getCurrentTimestamp() {
  return new Date().getTime();
}

function isToday(dateStr) {
  return getDateKey(dateStr) === getToday();
}

/* ===============================================
   STORAGE
=============================================== */
function parseStoredArray(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : fallback;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (err) {
    console.warn(`Saqlangan ${key} ma'lumoti o'qilmadi:`, err);
    return fallback;
  }
}

function chooseUserArray(userValue, legacyValue, fallback) {
  if (Array.isArray(userValue) && userValue.length > 0) {
    return [...userValue];
  }

  if (Array.isArray(legacyValue) && legacyValue.length > 0) {
    return [...legacyValue];
  }

  if (Array.isArray(userValue)) {
    return [...userValue];
  }

  return [...fallback];
}

function persistUserData(updates) {
  const Auth = window.AuthSystem;

  if (
    Auth &&
    typeof Auth.updateCurrentUserData === "function" &&
    typeof Auth.isSessionValid === "function" &&
    Auth.isSessionValid()
  ) {
    Auth.updateCurrentUserData(updates);
  }
}

let products = parseStoredArray("products", []);
let categories = parseStoredArray("categories", ["Electronics"]);
let sales = parseStoredArray("sales", []);
let debtors = parseStoredArray("crmDebtors", []);
let paidDebtors = parseStoredArray("crmPaidDebtors", []);
let smsHistory = parseStoredArray("smsHistory", []);
let editingId = null;
let currentFilter = 'all';
let currentSmsDebtorId = null;
let transactionFilter = "daily";
let transactionSearchQuery = "";

// OFFLINE DATA MODE START
let OFFLINE_DATA_MODE = false;

// ✅ Tekshiruvni sahifa yuklanishi bilanoq boshlaymiz
let backendCheckPromise = detectBackendAvailability();

async function detectBackendAvailability() {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔌 Backend tekshirilmoqda (${attempt}/${maxAttempts})...`);

      await window.crmApi.get("/store/profile/get", {
        timeout: 45000
      });

      OFFLINE_DATA_MODE = false;

      console.log("✅ Backend mavjud — ONLINE rejim");

      return true;

    } catch (error) {
      const status = error?.response?.status;

      // 401/403 — server ishlayapti, faqat authorization muammosi
      if (status === 401 || status === 403) {
        OFFLINE_DATA_MODE = false;

        console.warn(
          `⚠️ Backend ONLINE, authorization muammosi: ${status}`
        );

        return true;
      }

      console.warn(
        `⚠️ Backend javob bermadi (${attempt}/${maxAttempts}):`,
        error?.message
      );

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  OFFLINE_DATA_MODE = true;

  console.warn(
    "⚠️ Backend 3 marta tekshirildi va javob bermadi — OFFLINE rejim"
  );

  return false;
}

const OFFLINE_CATEGORIES_KEY = "crm_offline_categories";

function offlineGenId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function loadOfflineCategories() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(OFFLINE_CATEGORIES_KEY) || "null"
    );

    if (Array.isArray(stored) && stored.length) {
      return stored;
    }
  } catch {}

  return categories.map(name => ({
    id: offlineGenId(),
    name
  }));
}

function saveOfflineCategories() {
  localStorage.setItem(
    OFFLINE_CATEGORIES_KEY,
    JSON.stringify(globalCategories)
  );

  categories = globalCategories.map(c => c.name);
  saveCategories();
}

// loadUserData();

// Chart instances
let chartInstances = {
  weekly: null,
  daily: null
};

let dashboardBootstrapped = false;
// function getApiBaseUrl() {
//   // return window.CRM_API_URL || "https://backend-api-production-87e9.up.railway.app";
//   return window.CRM_API_URL || "https://z3wax.pythonanywhere.com";
// }
function getApiBaseUrl() {
    return window.crmApi.defaults.baseURL;
}

function getApiErrorMessage(error, fallback) {
  const detail = error && error.response && error.response.data && error.response.data.detail;

  if (Array.isArray(detail) && detail.length) {
    return detail.map(item => item.msg || item.message || String(item)).join("\n");
  }

  if (typeof detail === "string") {
    return detail;
  }

  return fallback || "Server bilan bog'lanishda xatolik yuz berdi.";
}

function normalizeApiAssetUrl(url) {
  if (
    !url ||
    url === "null" ||
    url === "undefined" ||
    String(url).trim() === ""
  ) {
    return "img/product.jpg";
  }

  const value = String(url).trim();

  if (
    /^https?:\/\//i.test(value) ||
    value.startsWith("data:")
  ) {
    return value;
  }

  return (
    getApiBaseUrl().replace(/\/$/, "") +
    "/" +
    value.replace(/^\//, "")
  );
}

function mapApiProduct(product) {
  const id = product._id || product.id;
  const existing = products.find(item => item.id === id) || {};
  const quantity = Number(product.quantity) || 0;
  // Backend "category_id" ni .populate("category_id", "category_name") bilan qaytaradi,
  // shuning uchun bu maydon aslida to'liq kategoriya obyekti bo'ladi ({_id, category_name})
  const category = product.category_id && typeof product.category_id === "object"
    ? product.category_id
    : null;

  return {
    id: id,
    name: product.product_name || product.name || "",
    barcode: product.product_barcode || "",
    categoryId: category ? category._id : (typeof product.category_id === "string" ? product.category_id : null),
    category: category ? category.category_name : "Kategoriyasiz",
    image: normalizeApiAssetUrl((product.images && product.images[0]) || product.image_url),
    imageUrl: normalizeApiAssetUrl((product.images && product.images[0]) || product.image_url),
    costPrice: Number(product.purchase_price) || 0,
    price: Number(product.selling_price) || 0,
    currency: "UZS",
    stock: quantity,
    minStock: Number(product.minimum_quantity) || 0,
    initialStock: Math.max(Number(existing.initialStock) || 0, quantity),
    unit: "dona",
    isLowStock: quantity <= (Number(product.minimum_quantity) || 0),
    createdAt: product.createdAt || product.created_at || null
  };
}

function mapApiSale(sale, item) {

  const product =
    item.product ||
    products.find(
      p => String(p.id) === String(item.product_id)
    ) ||
    null;

  const category =
    product && product.category
      ? (
          typeof product.category === "string"
            ? product.category
            : product.category.name
        )
      : "Kategoriyasiz";

  const qty =
    Number(item.quantity) || 0;

  const unitPrice =
    Number(
      item.unit_price ??
      item.selling_price ??
      sale.unit_price ??
      product?.price ??
      0
    );

  const unitCost =
    Number(
      item.unit_cost ??
      item.cost_price ??
      item.purchase_price ??
      sale.unit_cost ??
      product?.costPrice ??
      0
    );

  const total =
    Number(
      item.total_price ??
      sale.total_amount ??
      unitPrice * qty
    ) || 0;

  const profit =
    Number(
      item.profit ??
      sale.profit ??
      ((unitPrice - unitCost) * qty)
    ) || 0;

  return {

    id: sale.id,

    itemId: item.id,

    sessionId:
      sale.notes || "api",

    productId:
      item.product_id,

    name:
      product
        ? product.name
        : item.product_name || "Mahsulot",

    category,

    qty,

    unit:
      product?.unit ||
      item.unit ||
      "dona",

    // Sotuv paytidagi narx
    price: unitPrice,

    // Sotuv paytidagi tannarx
    costPrice: unitCost,

    // Shu sotuvning foydasi
    profit,

    total,

    currency:
      sale.currency ||
      "UZS",

    status:
      sale.status ||
      "sold",

    paymentType:
      sale.payment_type ||
      "cash",

    date:
      sale.sold_at ||
      sale.created_at ||
      getCurrentLocalDateTime(),

    timestamp:
      new Date(
        sale.sold_at ||
        sale.created_at ||
        Date.now()
      ).getTime()
  };
}

// NOTE: mapDebtor() was an unused, duplicate mapper producing an incompatible
// shape (fullName/debtAmount/remainingAmount/dueDate). It was only ever called
// by the duplicate apiLoadDebtors() removed above. Removed as dead code; the
// canonical mapper is mapApiDebtor() below (used by the real apiLoadDebtors()).

/* ===============================================
   ✅ TRANSACTIONS API → LOCAL ROW MAPPER
   Backend /api/v1/transactions/ does NOT return the
   old local `sales` shape ({id, customer, items, amount,
   paymentType, date}). It returns its own transaction
   object. This function normalizes ANY reasonable backend
   shape into the row shape renderTransactions() draws
   (name, category, qty, unit, price, currency, paymentType, date).
   Field names are defensive (multiple fallbacks) because the
   exact backend key names were not pinned down in the task.
=============================================== */
function mapTransaction(apiTransaction) {
  if (!apiTransaction || typeof apiTransaction !== "object") {
    return {
      id: null,
      name: "Noma'lum mahsulot",
      category: "Kategoriyasiz",
      qty: 0,
      unit: "dona",
      price: 0,
      currency: "UZS",
      paymentType: "cash",
      date: getCurrentLocalDateTime()
    };
  }

  const t = apiTransaction;

  // product / item can come as nested object, flat fields, or first item of an items[] array
  const firstItem = Array.isArray(t.items) && t.items.length ? t.items[0] : null;
  const productObj = t.product || (firstItem && firstItem.product) || null;

  const name =
    t.product_name ||
    t.productName ||
    (productObj && productObj.name) ||
    t.name ||
    (firstItem && (firstItem.product_name || firstItem.name)) ||
    "Mahsulot";

  const category =
    t.category_name ||
    t.categoryName ||
    (productObj && productObj.category &&
      (typeof productObj.category === "string" ? productObj.category : productObj.category.name)) ||
    t.category ||
    "Kategoriyasiz";

  const qty = Number(
    t.quantity ?? t.qty ?? (firstItem && firstItem.quantity) ?? 0
  ) || 0;

  const unit =
    t.unit ||
    (productObj && productObj.unit) ||
    (firstItem && firstItem.unit) ||
    "dona";

  const price = Number(
    t.unit_price ?? t.price ?? (firstItem && firstItem.unit_price) ?? 0
  ) || 0;

  const total = Number(
    t.total_price ?? t.total_amount ?? t.amount ?? price * qty
  ) || 0;

  const paymentType = t.payment_type || t.paymentType || "cash";

  const date =
    t.sold_at || t.created_at || t.date || t.timestamp || getCurrentLocalDateTime();

  return {
    id: t.id ?? null,
    name,
    category,
    qty,
    unit,
    price,
    total,
    currency: t.currency || "UZS",
    status: t.status || "sold",
    paymentType,
    date
  };
}

function mapApiDebtor(debtor) {
  // Yangi backend'da "qarzdor" alohida obyekt emas — bu total_remaining > 0
  // bo'lgan Sale (sotuv) hujjati, client_id va products.product_id populate qilingan holda
  const client = debtor.client_id && typeof debtor.client_id === "object" ? debtor.client_id : null;

  return {
    id: debtor._id || debtor.id,
    saleId: debtor._id || debtor.id,
    // BUG FIX: backend Client modeli client_name/client_phone maydonlarini
    // ishlatadi (full_name/name/phone emas — Client Schema'da bunday
    // maydonlar yo'q). Eski nomlar bilan bu doim "Noma'lum mijoz" va bo'sh
    // telefon ko'rsatardi, garchi backend to'g'ri ma'lumot qaytargan bo'lsa ham.
    name: client?.client_name || debtor.note || "Noma'lum mijoz",
    phone: client?.client_phone || "",
    amount: Number(debtor.total_remaining) || 0,
    originalAmount: Number(debtor.total_price) || 0,
    paidAmount: Number(debtor.total_paid) || 0,
    debtDate: debtor.createdAt || getCurrentLocalDateTime(),
    returnDate: debtor.due_date || null,
    notes: debtor.note || "",
    status: debtor.status || "active",
    isActive: debtor.status === "active"
  };
}

function toApiDateTime(dateValue) {
  if (!dateValue) return new Date().toISOString();
  if (String(dateValue).includes("T")) return new Date(dateValue).toISOString();
  return new Date(`${dateValue}T00:00:00`).toISOString();
}

function saveProducts() {
  localStorage.setItem("products", JSON.stringify(products));
  persistUserData({ products });
}

function saveCategories() {
  localStorage.setItem("categories", JSON.stringify(categories));
  persistUserData({ categories });
}

function saveSales() {
  localStorage.setItem("sales", JSON.stringify(sales));
  persistUserData({ sales });
}

function saveDebtors() {
  localStorage.setItem('crmDebtors', JSON.stringify(debtors));
  localStorage.setItem('crmPaidDebtors', JSON.stringify(paidDebtors));
  persistUserData({ debtors, paidDebtors });
}

function saveSmsHistory() {
  localStorage.setItem('smsHistory', JSON.stringify(smsHistory));
  persistUserData({ smsHistory });
}

/* ===============================================
   COUNTER ANIMATION
=============================================== */
function animateCounter(element, fromValue, toValue) {
  let current = fromValue;
  const step = Math.ceil(Math.abs(toValue - fromValue) / 60);

  const interval = setInterval(() => {
    if (toValue > fromValue) {
      current += step;
      if (current >= toValue) {
        element.innerText = toValue.toLocaleString();
        clearInterval(interval);
      } else {
        element.innerText = Math.floor(current).toLocaleString();
      }
    } else {
      current -= step;
      if (current <= toValue) {
        element.innerText = toValue.toLocaleString();
        clearInterval(interval);
      } else {
        element.innerText = Math.floor(current).toLocaleString();
      }
    }
  }, 20);
}

/* ===============================================
   KUN O'ZGARISHINI TEKSHIRISH (00:00 da reset)
=============================================== */
function checkAndResetDailyIfNeeded() {
  const savedDate = localStorage.getItem("currentSalesDate");
  const today = getToday();

  if (savedDate !== today) {
    const todayTotal = calculateTodayRevenue(savedDate || getYesterday());
    localStorage.setItem("yesterdaySalesTotal", todayTotal);
    localStorage.setItem("currentSalesDate", today);

    const oldSales = sales.filter(s => getDateKey(s.date) !== today);
    console.log(`Kun o'zgardi! Kechagi savdo: ${todayTotal} UZS`);
    console.log(`${oldSales.length} ta eski sotuv o'chirildi`);

    return true;
  }

  return false;
}

/* ===============================================
   KUNLIK SAVDO HISOBLASH (FAQAT BUGUN)
=============================================== */
function calculateTodayRevenue(date = getToday()) {
  return sales
    .filter(s => s.status === "sold" && getDateKey(s.date) === date)
    .reduce((sum, s) => sum + Number(s.total), 0);
}

function calculateYesterdayRevenue() {
    const yesterday = new Date();

    yesterday.setDate(yesterday.getDate() - 1);

    return sales
        .filter(sale => {
            const date = new Date(
                sale.createdAt ||
                sale.created_at ||
                sale.date
            );

            return (
                !Number.isNaN(date.getTime()) &&
                date.toDateString() === yesterday.toDateString()
            );
        })
        .reduce(
            (sum, sale) =>
                sum + (Number(sale.total) || 0),
            0
        );
}
/* ===============================================
   OYLIK DAROMAD HISOBLASH
=============================================== */
function getFirstSaleDate() {
  if (sales.length === 0) return null;

  const sortedSales = [...sales].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return getDateKey(sortedSales[0].date);
}

function calculateMonthlyRevenue(date = getToday()) {
  const [year, month] = date.split('-');

  return sales
    .filter(s => {
      if (s.status !== "sold") return false;
      const [sYear, sMonth] = getDateKey(s.date).split('-');
      return sYear === year && sMonth === month;
    })
    .reduce((sum, s) => sum + Number(s.total), 0);
}

function getPreviousMonthRevenue() {
  const today = new Date();
  today.setMonth(today.getMonth() - 1);
  const prevMonth = getDateKey(today);

  return calculateMonthlyRevenue(prevMonth);
}

/* ===============================================
   OYLIK DAROMAD COUNTER (UZS ni saqlab qolish - FIXED)
=============================================== */
function updateMonthlyRevenueUI() {
  const counterEl = document.querySelector('.counter[data-key="totalRevenue"]');
  const changeEl = document.getElementById("monthlyRevenueChange");

  if (!counterEl) return;

  const firstSaleDate = getFirstSaleDate();

  if (!firstSaleDate) {
    counterEl.innerHTML = `0 <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
    counterEl.dataset.lastValue = 0;

    if (changeEl) {
      changeEl.innerText = "Hali sotuv boshlanmagan";
      changeEl.className = "counter-change text-muted";
    }
    return;
  }

  const firstDate = new Date(firstSaleDate);
  const today = new Date();

  const monthsDiff = (today.getFullYear() - firstDate.getFullYear()) * 12 +
    (today.getMonth() - firstDate.getMonth());

  const currentMonth = calculateMonthlyRevenue();
  const lastShown = Number(counterEl.dataset.lastValue || 0);

  if (currentMonth !== lastShown) {
    let current = lastShown;
    const step = Math.ceil(Math.abs(currentMonth - lastShown) / 60);

    const interval = setInterval(() => {
      if (currentMonth > lastShown) {
        current += step;
        if (current >= currentMonth) {
          counterEl.innerHTML = `${currentMonth.toLocaleString()} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
          clearInterval(interval);
        } else {
          counterEl.innerHTML = `${Math.floor(current).toLocaleString()} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
        }
      } else {
        current -= step;
        if (current <= currentMonth) {
          counterEl.innerHTML = `${currentMonth.toLocaleString()} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
          clearInterval(interval);
        } else {
          counterEl.innerHTML = `${Math.floor(current).toLocaleString()} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
        }
      }
    }, 20);

    counterEl.dataset.lastValue = currentMonth;
  } else {
    counterEl.innerHTML = `${currentMonth.toLocaleString()} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
  }

  if (changeEl) {
    if (monthsDiff === 0) {
      changeEl.innerText = "📊 Birinchi oy (0%)";
      changeEl.className = "counter-change text-info";
    }
    else {
      const previousMonth = getPreviousMonthRevenue();

      if (previousMonth === 0 && currentMonth > 0) {
        changeEl.innerText = "▲ Yangi oylik savdo boshlandi";
        changeEl.className = "counter-change text-success";
      }
      else if (previousMonth === 0) {
        changeEl.innerText = "O'tgan oy savdo bo'lmagan";
        changeEl.className = "counter-change text-muted";
      }
      else {
        const percent = ((currentMonth - previousMonth) / previousMonth) * 100;

        if (percent > 0) {
          changeEl.innerText = `▲ ${percent.toFixed(1)}% o'tgan oyga nisbatan`;
          changeEl.className = "counter-change text-success";
        }
        else if (percent < 0) {
          changeEl.innerText = `▼ ${Math.abs(percent).toFixed(1)}% o'tgan oyga nisbatan`;
          changeEl.className = "counter-change text-danger";
        }
        else {
          changeEl.innerText = "O'tgan oy bilan teng (0%)";
          changeEl.className = "counter-change text-muted";
        }
      }
    }
  }
}

/* ===============================================
   HAFTALIK DAROMAD (Oxirgi 7 kun)
=============================================== */
function calculateWeeklyRevenue() {
  const weekData = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = getDateKey(date);

    const dayRevenue = sales
      .filter(s => s.status === "sold" && getDateKey(s.date) === dateStr)
      .reduce((sum, s) => sum + Number(s.total), 0);

    weekData.push(dayRevenue);
  }

  return weekData;
}

/* ===============================================
   BUGUNGI DAROMAD COUNTER (Real animation)
=============================================== */
function updateDailySalesCounter() {
  const counterEl = document.getElementById("dailySalesCounter");
  const changeEl = document.getElementById("dailySalesChange");

  if (!counterEl || !changeEl) return;

  const dayChanged = checkAndResetDailyIfNeeded();

  const today = getToday();
  const todayTotal = calculateTodayRevenue(today);

  const yesterdayTotal = Number(localStorage.getItem("yesterdaySalesTotal")) || 0;

  const lastShown = Number(counterEl.dataset.lastValue || 0);

  if (dayChanged) {
    counterEl.innerHTML = `0 <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
    counterEl.dataset.lastValue = 0;
    animateCounter(counterEl, 0, todayTotal);
  }
  else if (todayTotal !== lastShown) {
    animateCounter(counterEl, lastShown, todayTotal);
  }
  else {
    counterEl.innerText = todayTotal.toLocaleString();
  }

  counterEl.dataset.lastValue = todayTotal;

  setTimeout(() => {
    counterEl.innerHTML = `${todayTotal.toLocaleString()} <small style="font-size:0.6em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
  }, 1200);

  if (todayTotal === 0 && yesterdayTotal === 0) {
    changeEl.innerText = "Bugun savdo yo'q";
    changeEl.className = "counter-change text-muted";
  }
  else if (yesterdayTotal === 0 && todayTotal > 0) {
    changeEl.innerText = "▲ Yangi savdolar boshlandi";
    changeEl.className = "counter-change text-success";
  }
  else if (todayTotal === 0 && yesterdayTotal > 0) {
    changeEl.innerText = "▼ 100% kamaydi (kechaga nisbatan)";
    changeEl.className = "counter-change text-danger";
  }
  else {
    const percent = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;

    if (percent > 0) {
      changeEl.innerText = `▲ ${percent.toFixed(1)}% kechaga nisbatan`;
      changeEl.className = "counter-change text-success";
    } else if (percent < 0) {
      changeEl.innerText = `▼ ${Math.abs(percent).toFixed(1)}% kechaga nisbatan`;
      changeEl.className = "counter-change text-danger";
    } else {
      changeEl.innerText = "Kecha bilan teng";
      changeEl.className = "counter-change text-muted";
    }
  }
}

/* ===============================================
   SOTUV HOLATI (7 kunlik real trend)
=============================================== */
function getSalesStatus(product) {
  if (!product) {
    return `<span class="badge badge-secondary">Ma'lumot yo'q</span>`;
  }

  const baseStock = Number(product.initialStock ?? product.stock);

  if (!baseStock || isNaN(baseStock) || baseStock <= 0) {
    return `<span class="badge badge-secondary">Stok noto'g'ri</span>`;
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let sold = 0;

  sales.forEach(s => {
    if (s.productId === product.id && s.status === "sold") {
      const qty = Number(s.qty);
      const date = toLocalDate(s.date);

      if (!isNaN(qty) && date >= sevenDaysAgo) {
        sold += qty;
      }
    }
  });

  if (sold === 0) {
    return `<span class="badge badge-dark">0% – Sotilmayapti</span>`;
  }

  const percent = Math.round((sold / baseStock) * 100);

  if (percent <= 10) {
    return `<span class="badge badge-danger">${percent}% – Kam sotilgan</span>`;
  }

  if (percent <= 50) {
    return `<span class="badge badge-warning">${percent}% – O'rtacha</span>`;
  }

  return `<span class="badge badge-success">${percent}% – Ko'p sotilgan</span>`;
}

/* ===============================================
   KATEGORIYALAR
=============================================== */
const productCategory = document.getElementById("productCategory");

function renderCategories(selected = null) {
  if (!productCategory) return;

  if (globalCategories.length) {
    productCategory.innerHTML = globalCategories
      .map(c => `<option value="${c.id}">${c.name}</option>`)
      .join("");
  } else {
    productCategory.innerHTML = categories
      .map(c => `<option value="">${c}</option>`)
      .join("");
  }

  if (selected !== null && selected !== undefined) {
    const selectedCategory = globalCategories.find(c => c.id == selected || c.name === selected);
    productCategory.value = selectedCategory ? String(selectedCategory.id) : String(selected);
  }
}

// /* ===============================================
//    MAHSULOTLAR - RENDER (data-label bilan)
// =============================================== */
// const productTable = document.getElementById("productTable");

// function renderProducts(list = products) {
//   if (!productTable) return;
//   productTable.innerHTML = "";

//   if (list.length === 0) {
//     productTable.innerHTML = `
//       <tr>
//         <td colspan="7" class="text-center text-muted py-3">
//           Mahsulotlar topilmadi
//         </td>
//       </tr>
//     `;
//     return;
//   }

//   list.forEach(p => {
//     const stockUI = getStockUI(p);

//     productTable.innerHTML += `
//       <tr class="${stockUI.color === "danger" ? "table-danger" : ""}">
//         <td data-label="Rasm">
//           <img src="${p.image}" class="product-img">
//         </td>
//         <td data-label="Nomi">${p.name}</td>
//         <td data-label="Kategoriya">${p.category}</td>
//         <td data-label="Narx">${p.price.toLocaleString()} ${p.currency}</td>

//         <!-- ZAXIRA DIZAYNI -->
//         <td data-label="Zaxira">
//           <div class="stock-cell">
//             <div class="stock-text">
//               ${p.stock} / ${p.initialStock} ${p.unit}
//             </div>

//             <div class="progress stock-progress">
//               <div class="progress-bar bg-${stockUI.color}"
//                    style="width:${stockUI.percent}%">
//               </div>
//             </div>
//           </div>
//         </td>

//         <td data-label="Holat">${getSalesStatus(p)}</td>

//         <td data-label="Harakatlar">
//           <a href="#" onclick="editProduct(${p.id})">Edit</a>
//           <a href="index.html" class="text-danger ml-2"
//              onclick="deleteProduct(${p.id})">Delete</a>
//         </td>
//       </tr>
//     `;
//   });
// }
/* ===============================================
   MAHSULOTLAR - RENDER (data-label bilan)
=============================================== */

const productTable = document.getElementById("productTable");

function renderProducts(list = products) {
  if (!productTable) return;

  productTable.innerHTML = "";

  // Agar mahsulot bo‘lmasa
  if (list.length === 0) {
    productTable.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-3">
          Mahsulotlar topilmadi
        </td>
      </tr>
    `;
    if (typeof renderLowStockAlerts === "function") renderLowStockAlerts(products);
    if (typeof updateInventoryBalanceUI === "function") updateInventoryBalanceUI();
    return;
  }

  // Mahsulotlarni chiqarish
  list.forEach((p) => {
    const stockUI = getStockUI(p);

    productTable.innerHTML += `
      <tr class="${stockUI.color === "danger" ? "table-danger" : ""}">
        
        <!-- Rasm -->
        <td data-label="Rasm">
          <img src="${p.image}" class="product-img">
        </td>

        <!-- Nomi -->
        <td data-label="Nomi">${p.name}</td>

        <!-- Kategoriya -->
        <td data-label="Kategoriya">${p.category}</td>

        <!-- Narx -->
        <td data-label="Narx">
          ${p.price.toLocaleString()} ${p.currency}
        </td>

        <!-- Zaxira -->
        <td data-label="Zaxira">
          <div class="stock-cell">

            <div class="stock-text">
              ${p.stock} / ${p.initialStock} ${p.unit}
            </div>

            <div class="progress stock-progress">
              <div 
                class="progress-bar bg-${stockUI.color}"
                style="width:${stockUI.percent}%">
              </div>
            </div>

          </div>
        </td>

        <!-- Holat -->
        <td data-label="Holat">
          ${getSalesStatus(p)}
        </td>

        <!-- Harakatlar -->
        <td data-label="Harakatlar">

          <!-- EDIT -->
          <button 
            class="btn btn-sm btn-edit"
            onclick="editProduct('${p.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>

          </button>

          <!-- DELETE -->
          <button 
            class="btn btn-sm btn-danger ms-2"
            onclick="deleteProduct('${p.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>

          </button>

        </td>
      </tr>
    `;
  });

  if (typeof renderLowStockAlerts === "function") renderLowStockAlerts(products);
  if (typeof updateInventoryBalanceUI === "function") updateInventoryBalanceUI();
}

// Zaxirani HIsoblash
function getStockUI(product) {
  const initial = Number(product.initialStock) || 0;
  const current = Number(product.stock) || 0;

  const percent = initial > 0
    ? Math.min(100, Math.round((current / initial) * 100))
    : 0;

  if (current <= 0) {
    return {
      percent: 0,
      color: "danger"
    };
  }

  if (percent <= 20) {
    return {
      percent,
      color: "warning"
    };
  }

  return {
    percent,
    color: "success"
  };
}

/* ===============================================
   MAHSULOT BOSHQARUVI
=============================================== */
const productForm = document.getElementById("productForm");
const productName = document.getElementById("productName");
const productImage = document.getElementById("productImage");
const productPrice = document.getElementById("productPrice");
const productCurrency = document.getElementById("productCurrency");
const productStock = document.getElementById("productStock");
const productUnit = document.getElementById("productUnit");
const openProductModal = document.getElementById("openProductModal");

function imageToBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

if (openProductModal) {
  openProductModal.addEventListener("click", () => {
    editingId = null;
    productForm.reset();
    renderCategories();
    productUnit.value = "ta";
    productStock.value = "";
    $("#productModal").modal("show");
  });
}

if (productForm) {
  productForm.addEventListener("submit", async e => {
    e.preventDefault();

    const stockValue = Number(productStock.value);
    const costPriceValue = Number(document.getElementById("productCostPrice").value);
    const salePriceValue = Number(productPrice.value);
    const categoryId = productCategory.value;

    if (!productName.value.trim()) {
      alert("Mahsulot nomini kiriting");
      return;
    }

    if (stockValue < 0 || costPriceValue < 0 || salePriceValue < 0) {
      alert("Narx va miqdor manfiy bo'lishi mumkin emas");
      return;
    }

    if (!categoryId) {
      alert("Kategoriya tanlang yoki yangi kategoriya qo'shing");
      return;
    }

    try {
      // OFFLINE DATA MODE START
      if (OFFLINE_DATA_MODE) {
        const categoryMeta = globalCategories.find(c => c.id == categoryId);
        const unitValue = productUnit.value === "ta" ? "dona" : productUnit.value;

        if (editingId) {
          const existing = products.find(p => p.id === editingId);
          if (existing) {
            existing.name = productName.value.trim();
            existing.categoryId = categoryId;
            existing.category = categoryMeta ? categoryMeta.name : existing.category;
            existing.costPrice = costPriceValue;
            existing.price = salePriceValue;
            existing.stock = stockValue;
            existing.unit = unitValue;
          }
          showSaleAlert("Mahsulot yangilandi! (OFFLINE)", "success");
          editingId = null;
        } else {
          products.push({
            id: offlineGenId(),
            name: productName.value.trim(),
            categoryId: categoryId,
            category: categoryMeta ? categoryMeta.name : "Kategoriyasiz",
            image: "img/product.jpg",
            imageUrl: "img/product.jpg",
            costPrice: costPriceValue,
            price: salePriceValue,
            currency: "UZS",
            stock: stockValue,
            initialStock: stockValue,
            unit: unitValue,
            isLowStock: false,
            createdAt: new Date().toISOString()
          });
          showSaleAlert("Mahsulot qo'shildi! (OFFLINE)", "success");
        }

        saveProducts();
        await apiLoadProducts();
        $("#productModal").modal("hide");
        productForm.reset();
        return;
      }
      // OFFLINE DATA MODE END

      // Rasm tanlangan bo'lsa, avval /file/create orqali yuklaymiz va URL olamiz
      let imageUrl = null;
      if (productImage.files[0]) {
        try {
          const fileForm = new FormData();
          fileForm.append("file", productImage.files[0]);
          const fileRes = await window.crmApi.post("/file/create", fileForm, {
            headers: { "Content-Type": "multipart/form-data" }
          });
          imageUrl = fileRes?.data?.file?.file_url || null;
        } catch (imgErr) {
          console.error("Rasm yuklashda xatolik:", imgErr);
          // Rasm yuklanmasa ham mahsulotni saqlashda davom etamiz
        }
      }

      const payload = {
        product_name: productName.value.trim(),
        category_id: categoryId,
        purchase_price: costPriceValue,
        selling_price: salePriceValue,
        quantity: stockValue
      };

      if (imageUrl) {
        payload.images = [imageUrl];
      }

      if (editingId) {
        const result = await AuthSystem.updateProduct(editingId, payload);

        if (!result || !result.success) {
          alert(result?.backendMessage || "Mahsulotni saqlashda xatolik yuz berdi");
          return;
        }

        showSaleAlert("Mahsulot yangilandi!", "success");
        editingId = null;
      } else {
        const result = await AuthSystem.createProduct(payload);

        if (!result || !result.success) {
          alert(result?.backendMessage || "Mahsulotni saqlashda xatolik yuz berdi");
          return;
        }

        showSaleAlert("Mahsulot qo'shildi!", "success");
      }

      await apiLoadProducts();
      $("#productModal").modal("hide");
      productForm.reset();
    } catch (error) {
      console.error(error);
      alert(getApiErrorMessage(error, "Mahsulotni saqlashda xatolik yuz berdi"));
    }
  });
}

function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  editingId = id;
  productName.value = p.name;
  document.getElementById("productCostPrice").value = p.costPrice || 0;
  productPrice.value = p.price;
  productCurrency.value = p.currency;
  productStock.value = p.stock;
  productUnit.value = p.unit === "dona" ? "ta" : p.unit;

  renderCategories(p.categoryId || p.category);
  $("#productModal").modal("show");
}

async function deleteProduct(id) {
  if (!confirm("O'chirishni xohlaysizmi?")) return;

  // OFFLINE DATA MODE START
  if (OFFLINE_DATA_MODE) {
    products = products.filter(p => p.id !== id);
    saveProducts();
    showSaleAlert("Mahsulot o'chirildi! (OFFLINE)", "success");
    await apiLoadProducts();
    return;
  }
  // OFFLINE DATA MODE END

  try {
    const result = await AuthSystem.deleteProduct(id);

    if (!result || !result.success) {
      alert(result?.backendMessage || "Mahsulotni o'chirishda xatolik yuz berdi");
      return;
    }

    showSaleAlert("Mahsulot o'chirildi!", "success");
    await apiLoadProducts();
  } catch (error) {
    console.error(error);
    alert(getApiErrorMessage(error, "Mahsulotni o'chirishda xatolik yuz berdi"));
  }
}

/* ===============================================
   MAHSULOT QIDIRISH
=============================================== */
const productSearch = document.getElementById("productSearch");
if (productSearch) {
  productSearch.addEventListener("input", () => {
    const v = productSearch.value.toLowerCase();
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(v) ||
      p.category.toLowerCase().includes(v)
    );
    renderProducts(filtered);
  });
}

// MAHSULOT HOLATINI HISOBLASH //
function getStockStatus(product) {
  if (product.stock <= 0) {
    return {
      text: "❌ Tugagan",
      class: "status-danger"
    };
  }

  const percentLeft = product.stock / product.initialStock;

  if (percentLeft <= 0.2) {
    return {
      text: "⚠️ Kam qoldi",
      class: "status-warning"
    };
  }

  return {
    text: "✅ Yetarli",
    class: "status-success"
  };
}


/* ===============================================
   KATEGORIYA BOSHQARUVI
=============================================== */
const openCategoryModal = document.getElementById("openCategoryModal");
const categoryList = document.getElementById("categoryList");
const newCategory = document.getElementById("newCategory");
const saveCategory = document.getElementById("saveCategory");
const updateCategoryBtn = document.getElementById("updateCategory");
const deleteCategoryBtn = document.getElementById("deleteCategory");

let globalCategories = [];

async function apiLoadProducts() {

  // OFFLINE DATA MODE START
  if (OFFLINE_DATA_MODE) {
    renderProducts();
    renderSaleProducts();
    console.log("✅ Products loaded from OFFLINE storage:", products.length);
    return;
  }
  // OFFLINE DATA MODE END

  try {

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━"
    );

    console.log(
      "📦 PRODUCTS API"
    );

    const result = await AuthSystem.getProducts();

    if (!result || !result.success) {
      console.error(
        "❌ PRODUCTS API XATO:",
        result?.backendMessage || result?.responseData
      );

      showSaleAlert(
        result?.backendMessage || "Mahsulotlarni yuklashda xatolik yuz berdi",
        "error"
      );

      return;
    }

    console.log(
      "✅ STATUS: SUCCESS"
    );

    console.log(
      "📊 PRODUCTS COUNT:",
      result.products.length
    );

    console.table(
      result.products
    );

    products =
      (result.products || [])
        .map(mapApiProduct);

    console.log(
      "🔄 MAPPED PRODUCTS:"
    );

    console.table(
      products
    );

    saveProducts();

    renderProducts();

    renderSaleProducts();

    console.log(
      "✅ PRODUCTS RENDERED"
    );

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━"
    );

  } catch (error) {

    console.error(
      "❌ PRODUCTS API ERROR"
    );

    console.error(
      error
    );

    showSaleAlert(
      getApiErrorMessage(
        error,
        "Mahsulotlarni yuklashda xatolik yuz berdi"
      ),
      "error"
    );
  }
}

async function apiLoadCategories() {
  // OFFLINE DATA MODE START
  if (OFFLINE_DATA_MODE) {
    globalCategories = loadOfflineCategories();
    saveOfflineCategories();
    renderCategories();
    renderCategoryList();
    console.log("✅ Categories loaded from OFFLINE storage:", globalCategories.length);
    return;
  }
  // OFFLINE DATA MODE END
  try {
    const result = await AuthSystem.getCategories();

    if (!result || !result.success) {
      console.error(
        "❌ CATEGORIES API XATO:",
        result?.backendMessage || result?.responseData
      );
      return;
    }

    globalCategories = (result.categories || []).map(c => ({
      id: c._id || c.id,
      name: c.category_name || c.name || ""
    }));
    categories = globalCategories.map(c => c.name);
    saveCategories();
    renderCategories();
    renderCategoryList();
    console.log("✅ Categories loaded from API:", globalCategories.length);
  } catch (error) {
    console.error("❌ Error loading categories from API:", error);
  }
}

function renderCategoryList() {
  if (!categoryList) return;

  categoryList.innerHTML = globalCategories
    .map(c => `<option value="${c.id}">${c.name}</option>`)
    .join("");

  if (globalCategories.length) {
    categoryList.value = globalCategories[0].id;
    newCategory.value = globalCategories[0].name;
  }
}

if (openCategoryModal) {
  // openCategoryModal.addEventListener("click", () => {
  //   newCategory.value = "";
  //   renderCategoryList();
  //   $("#categoryModal").modal("show");
  // });
  openCategoryModal.addEventListener("click", () => {

    newCategory.value = "";

    renderCategoryList();

    saveCategory.style.display = "inline-block";
    updateCategoryBtn.style.display = "inline-block";

    $("#categoryModal").modal("show");
  });
}

if (categoryList) {
  // categoryList.addEventListener("change", () => {
  //   const found = globalCategories.find(c => c.id == categoryList.value);
  //   if (found) {
  //     newCategory.value = found.name;
  //   }
  // });
  categoryList.addEventListener("change", () => {

    const found = globalCategories.find(
      c => c.id == categoryList.value
    );

    if (!found) return;

    newCategory.value = found.name;

    updateCategoryBtn.disabled = false;
  });
}

if (saveCategory) {
  saveCategory.addEventListener("click", async () => {
    const value = newCategory.value.trim();
    if (!value) return alert("Kategoriya nomini kiriting");
    // if (categories.includes(value)) return alert("Bu kategoriya mavjud");
    if (
      globalCategories.some(
        c => c.name.toLowerCase() === value.toLowerCase()
      )
    ) {
      return alert("Bu kategoriya mavjud");
    }

    try {
      // OFFLINE DATA MODE START
      if (OFFLINE_DATA_MODE) {
        globalCategories.push({ id: offlineGenId(), name: value });
        saveOfflineCategories();
        showSaleAlert("Kategoriya qo'shildi! (OFFLINE)", "success");
        renderCategories();
        renderCategoryList();
        newCategory.value = "";
        $("#categoryModal").modal("hide");
        return;
      }
      // OFFLINE DATA MODE END

      const result = await AuthSystem.createCategory({
        category_name: value
      });

      if (!result || !result.success) {
        alert(result?.backendMessage || "Kategoriya qo'shishda xatolik yuz berdi");
        return;
      }

      showSaleAlert("Kategoriya qo'shildi!", "success");
      await apiLoadCategories();
      newCategory.value = "";
      $("#categoryModal").modal("hide");
    } catch (error) {
      console.error(error);
      alert("Kategoriya qo'shishda xatolik yuz berdi");
    }
  });
}

if (updateCategoryBtn) {
  updateCategoryBtn.addEventListener("click", async () => {

    const catId = categoryList.value;
    const newName = newCategory.value.trim();

    if (!catId) return alert("Tahrirlash uchun kategoriya tanlang");
    if (!newName) return alert("Kategoriya nomini kiriting");

    const current = globalCategories.find(c => c.id == catId);
    if (current && current.name === newName) return alert("Nom o'zgartirilmadi");

    const duplicate = globalCategories.find(
      c => c.name.toLowerCase() === newName.toLowerCase() && c.id != catId
    );
    if (duplicate) return alert("Bu nom boshqa kategoriyada mavjud");

    try {
      // OFFLINE DATA MODE START
      if (OFFLINE_DATA_MODE) {
        if (current) current.name = newName;
        saveOfflineCategories();
        showSaleAlert("Kategoriya tahrirlandi! (OFFLINE)", "success");
        renderCategories();
        renderCategoryList();
        $("#categoryModal").modal("hide");
        return;
      }
      // OFFLINE DATA MODE END

      const result = await AuthSystem.updateCategory(catId, { category_name: newName });

      if (!result || !result.success) {
        alert(result?.backendMessage || "Kategoriyani tahrirlashda xatolik yuz berdi");
        return;
      }

      showSaleAlert("Kategoriya tahrirlandi!", "success");
      await apiLoadCategories();
      $("#categoryModal").modal("hide");
    } catch (error) {
      console.error(error);
      alert(getApiErrorMessage(error, "Kategoriyani tahrirlashda xatolik yuz berdi"));
    }
  });

  // updateCategoryBtn.style.display = "none";
}

if (deleteCategoryBtn) {
  deleteCategoryBtn.addEventListener("click", async () => {
    const catId = categoryList.value;
    if (!catId) return;

    if (!confirm("Kategoriyani o'chirmoqchimisiz?")) return;

    try {
      // OFFLINE DATA MODE START
      if (OFFLINE_DATA_MODE) {
        globalCategories = globalCategories.filter(c => c.id != catId);
        saveOfflineCategories();
        showSaleAlert("Kategoriya o'chirildi! (OFFLINE)", "success");
        renderCategories();
        renderCategoryList();
        newCategory.value = "";
        $("#categoryModal").modal("hide");
        return;
      }
      // OFFLINE DATA MODE END

      const result = await AuthSystem.deleteCategory(catId);

      if (!result || !result.success) {
        alert(result?.backendMessage || "Kategoriyani o'chirishda xatolik yuz berdi");
        return;
      }

      showSaleAlert("Kategoriya o'chirildi!", "success");
      await apiLoadCategories();
      newCategory.value = "";
      $("#categoryModal").modal("hide");
    } catch (error) {
      console.error(error);
      alert(getApiErrorMessage(error, "Kategoriyani o'chirishda xatolik yuz berdi"));
    }
  });
}

/* ===============================================
   SOTUV
=============================================== */
// //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const saleProduct = document.getElementById("saleProduct");
const saleQty = document.getElementById("saleQty");
const salePrice = document.getElementById("salePrice");
const saleQtyLabel = document.getElementById("saleQtyLabel");
const salesTable = document.getElementById("salesTable");
const totalSum = document.getElementById("totalSum");
const saleSearch = document.getElementById("saleSearch");
const saleAlert = document.getElementById("saleAlert");

// Session ID
let currentSaleSessionId = localStorage.getItem("currentSaleSessionId");
if (!currentSaleSessionId) {
  currentSaleSessionId = String(Date.now());
  localStorage.setItem("currentSaleSessionId", currentSaleSessionId);
}

// Bildirishnoma ko'rsatish funksiyasi
function showSaleAlert(message, type = "success") {
  if (!saleAlert) return;

  saleAlert.className = `sale-alert ${type}`;
  saleAlert.textContent = message;
  saleAlert.classList.remove("hidden");

  setTimeout(() => {
    saleAlert.classList.add("hidden");
  }, 3000);
}

function renderSaleProducts(list = products) {
  if (!saleProduct) return;

  saleProduct.innerHTML = "";
  list.forEach(p => {
    saleProduct.innerHTML += `
      <option value="${p.id}">
        ${p.name} (${p.stock} ${p.unit})
      </option>
    `;
  });

  if (list.length) {
    saleProduct.value = list[0].id;
    updateSaleFields();
  }
}

function updateSaleFields() {
  const p = products.find(x => x.id == saleProduct.value);
  if (!p) return;

  saleQtyLabel.innerText = `Miqdor (${p.unit})`;

  if (p.unit === "kg") {
    saleQty.step = "0.01";
    saleQty.min = "0.01";
    saleQty.placeholder = "0.5 yoki 1.3";
  } else {
    saleQty.step = "1";
    saleQty.min = "1";
    saleQty.placeholder = "1, 2, 3...";
  }

  saleQty.value = "";
  salePrice.value = `${p.price.toLocaleString()} ${p.currency} / ${p.unit}`;
}

if (saleProduct) {
  saleProduct.addEventListener("change", updateSaleFields);
}

if (saleSearch) {
  saleSearch.addEventListener("input", () => {
    const value = saleSearch.value.toLowerCase();
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(value)
    );
    renderSaleProducts(filtered);
  });
}

/* ===============================================
   TO'LOV TURI
=============================================== */
/* ===============================================
   ✅ TRANSACTIONS API (verified working endpoints)
   GET /api/v1/transactions/        -> list
   GET /api/v1/transactions/stats   -> stats
   GET /api/v1/transactions/export  -> export
=============================================== */
// NOTE: bu ikkita funksiya endi hech qayerdan chaqirilmaydi — ularning ishi
// endi loadAndRenderTransactions() ichida to'g'ridan-to'g'ri renderTransactions()
// orqali local `sales` massividan (apiLoadSales() /sale/get orqali to'ldiradi)
// bajariladi. Backendda alohida /transactions endpointi yo'q edi, shu sabab
// bu funksiyalar har doim 404 qaytarardi. Kelajakda tasodifan chaqirilib
// qolmasligi uchun ularni ham xavfsiz (local sales'ga asoslangan) qilib qo'ydik.
async function getTransactions(params = {}) {
  try {
    const items = sales.filter(s => s.status === "sold");
    return { items, total: items.length };
  } catch (error) {
    console.error("❌ TRANSACTIONS ERROR:", error);
    return { items: [], total: 0 };
  }
}

async function getTransactionsStats(params = {}) {
  try {
    const items = sales.filter(s => s.status === "sold");
    const total = items.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    return { count: items.length, total };
  } catch (error) {
    console.error("❌ TRANSACTIONS STATS ERROR:", error);
    return null;
  }
}

async function loadAndRenderTransactions(period = transactionFilter) {
  // OFFLINE DATA MODE START
  if (OFFLINE_DATA_MODE) {
    // renderTransactions() called with no args already falls back to
    // filtering the local `sales` array by transactionFilter (daily/weekly/monthly).
    renderTransactions();
    return;
  }
  // OFFLINE DATA MODE END

  // Backendda alohida /transactions endpointi yo'q. `sales` massivi
  // allaqachon apiLoadSales() orqali haqiqiy backend (/sale/get) ma'lumoti
  // bilan to'ldirilgan, shuning uchun argumentsiz chaqirilganda
  // renderTransactions() shu local `sales`ni transactionFilter bo'yicha
  // filtrlaydi — bu haqiqiy backend ma'lumoti, taxminiy emas.
  transactionFilter = period;
  renderTransactions();
}

async function apiLoadSales() {
  // ===============================================
  // SALES LOAD — YANGI /sale/get API
  // ===============================================

  if (OFFLINE_DATA_MODE) {
    renderSales();

    if (typeof updateDailySalesCounter === "function") {
      updateDailySalesCounter();
    }

    if (typeof updateDailySalesPageCounter === "function") {
      updateDailySalesPageCounter();
    }

    if (typeof updateTotalTransactions === "function") {
      updateTotalTransactions();
    }

    if (typeof updateMonthlyRevenueUI === "function") {
      updateMonthlyRevenueUI();
    }

    if (typeof updateProfitUI === "function") {
      updateProfitUI();
    }

    if (typeof updateCharts === "function") {
      await updateCharts();
    }

    console.log(
      "✅ SALES — OFFLINE:",
      sales.length
    );

    return;
  }

  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🛒 SALES LOAD — NEW API");
    console.log("📤 GET /sale/get");

    // Yangi tekshirilgan API
    const result = await AuthSystem.getSales({
      status: "active",
      sort_order: "descending"
    });

    console.log("📥 SALE API RESULT:", result);

    if (!result || !result.success) {
      console.error(
        "❌ SALES API XATO:",
        result?.backendMessage || result?.responseData
      );

      return;
    }

    const rawSales = Array.isArray(result.data)
      ? result.data
      : [];

    console.log(
      "✅ BACKEND SALES:",
      rawSales.length
    );

    // ===============================================
    // YANGI SALE FORMAT → ESKI UI FORMAT
    // ===============================================

    const mappedSales = [];

    rawSales.forEach(sale => {
      if (
        !sale ||
        !Array.isArray(sale.products)
      ) {
        return;
      }

      sale.products.forEach(item => {
        // BUG FIX: backend GET /sale/get so'rovida "products.product_id"ni
        // to'liq mahsulot hujjati bilan populate qiladi (ID string emas,
        // {_id, product_name, ...} obyekt). Shu sabab quyidagi taqqoslash
        // hech qachon String(p.id) bilan mos kelmasdi — natijada:
        //  1) mahsulot nomi doim "Mahsulot" bo'lib chiqardi,
        //  2) productId noto'g'ri (butun obyekt) saqlanardi, shu sabab
        //     "Sotuv holati (hafta)" doim 0% – Sotilmayapti ko'rsatardi,
        //     chunki getSalesStatus() s.productId === product.id ni solishtiradi.
        const isPopulated = item.product_id && typeof item.product_id === "object";
        const realProductId = isPopulated
          ? String(item.product_id._id)
          : String(item.product_id);

        const product = products.find(
          p => String(p.id) === realProductId
        );

        const quantity =
          Number(item.quantity) || 0;

        const sellingPrice =
          Number(item.selling_price) || 0;

          const total =
          sellingPrice * quantity;

        const purchasePrice =
          Number(item.purchase_price) || 0;

        const profit =
          (sellingPrice - purchasePrice) * quantity;

        mappedSales.push({
          id: sale._id,

          itemId:
            `${sale._id}_${realProductId}`,

          sessionId:
            sale.note || "api",

          productId:
            realProductId,

          name:
            product?.name ||
            (isPopulated ? item.product_id.product_name : null) ||
            "Mahsulot",

          category:
            product?.category || "Kategoriyasiz",

          qty:
            quantity,

          unit:
            product?.unit || "dona",

          price:
            sellingPrice,

                    total:
            total,

          costPrice:
            purchasePrice,

          profit:
            profit,

          currency:
            "UZS",

          // Muhim:
          // yangi backend statuslari:
          // active / cancelled / returned
          //
          // eski UI esa "sold" kutadi
          status:
            sale.status === "active"
              ? "sold"
              : sale.status,

          paymentType:
            "cash",

          date:
            sale.createdAt ||
            sale.updatedAt ||
            new Date().toISOString(),

          timestamp:
            new Date(
              sale.createdAt ||
              sale.updatedAt ||
              Date.now()
            ).getTime()
        });
      });
    });

    // ===============================================
    // LOCAL SALESNI YANGI BACKEND MA'LUMOTI BILAN
    // ALMASHTIRAMIZ
    // ===============================================

    sales = mappedSales;

    saveSales();

    console.log(
      "✅ SALES MAPPED:",
      sales.length
    );

    // ===============================================
    // ESKI UI YANGILANISHI
    // ===============================================

    renderSales();

    if (
      typeof updateDailySalesCounter ===
      "function"
    ) {
      updateDailySalesCounter();
    }

    if (
      typeof updateDailySalesPageCounter ===
      "function"
    ) {
      updateDailySalesPageCounter();
    }

    if (
      typeof updateTotalTransactions ===
      "function"
    ) {
      updateTotalTransactions();
    }

    if (
      typeof updateMonthlyRevenueUI ===
      "function"
    ) {
      updateMonthlyRevenueUI();
    }

    if (
      typeof updateProfitUI ===
      "function"
    ) {
      updateProfitUI();
    }

    // CHARTNI ENG OXIRIDA YANGILAYMIZ
    if (
      typeof updateCharts ===
      "function"
    ) {
      await updateCharts();
    }

    console.log(
      "✅ SALES LOADED FROM /sale/get:",
      sales.length
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  } catch (error) {
    console.error(
      "❌ SALES LOAD ERROR:",
      error?.response?.data ||
      error?.message ||
      error
    );
  }
}

async function handleSale(paymentType) {
  const product = products.find(p => p.id == saleProduct.value);
  if (!product) {
    showSaleAlert("❌ Mahsulot tanlanmagan!", "error");
    return;
  }

  const qty = parseFloat(saleQty.value);
  if (isNaN(qty) || qty <= 0) {
    showSaleAlert("❌ Miqdorni to'g'ri kiriting!", "error");
    saleQty.focus();
    return;
  }

  if (qty > product.stock) {
    showSaleAlert(`❌ Yetarli mahsulot yo'q! (Mavjud: ${product.stock} ${product.unit})`, "error");
    saleQty.value = "";
    saleQty.focus();
    return;
  }

  try {
    // OFFLINE DATA MODE START
    if (OFFLINE_DATA_MODE) {
      const total = product.price * qty;

      sales.push({
        id: offlineGenId(),
        itemId: offlineGenId(),
        sessionId: currentSaleSessionId.toString(),
        productId: product.id,
        name: product.name,
        category: product.category,
        qty: qty,
        unit: product.unit,
        price: product.price,
        total: total,
        currency: product.currency || "UZS",
        status: "sold",
        paymentType: paymentType,
        date: getCurrentLocalDateTime(),
        timestamp: Date.now()
      });

      product.stock -= qty;
      saveProducts();
      saveSales();

      showSaleAlert(`✅ ${product.name} sotildi! (OFFLINE)`, "success");
      saleQty.value = "";
      saleQty.focus();

      await apiLoadProducts();
      await apiLoadSales();

      if (typeof DashboardStatisticsManager !== 'undefined') {
        DashboardStatisticsManager.init();
      }
      return;
    }
    // OFFLINE DATA MODE END

    const totalAmount = product.price * qty;

    const result = await AuthSystem.createSale({
      products: [
        {
          product_id: product.id,
          purchase_price: product.costPrice,
          selling_price: product.price,
          quantity: qty
        }
      ],
      note: currentSaleSessionId.toString(),
      paid_by_cash: paymentType === "cash" ? totalAmount : 0,
      paid_by_card: paymentType === "card" ? totalAmount : 0
    });

    if (!result || !result.success) {
      showSaleAlert(
        result?.backendMessage || "❌ Sotuv amalga oshirilmadi!",
        "error"
      );
      return;
    }

    showSaleAlert(`✅ ${product.name} sotildi!`, "success");
    saleQty.value = "";
    saleQty.focus();

    // Reload products and sales from API
    await apiLoadProducts();
    await apiLoadSales();

    // Update stats
    if (typeof DashboardStatisticsManager !== 'undefined') {
      DashboardStatisticsManager.init();
    }
  } catch (error) {
    console.error(error);
    showSaleAlert("❌ Sotuv amalga oshirilmadi!", "error");
  }
}

const addSaleCash = document.getElementById("addSaleCash");
if (addSaleCash) {
  addSaleCash.addEventListener("click", () => {
    handleSale("cash");
  });
}

const addSaleCard = document.getElementById("addSaleCard");
if (addSaleCard) {
  addSaleCard.addEventListener("click", () => {
    handleSale("card");
  });
}

function renderSales() {
  if (!salesTable || !totalSum) return;

  const today = getToday();

  salesTable.innerHTML = "";
  let sum = 0;

  const todaySales = sales.filter(s =>
    getDateKey(s.date) === today &&
    s.status === "sold" &&
    s.sessionId == currentSaleSessionId
  );

  if (todaySales.length === 0) {
    salesTable.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-3">
          Bugun hali sotuv bo'lmadi
        </td>
      </tr>
    `;
    totalSum.innerHTML = `0 <span>UZS</span>`;
    return;
  }

  todaySales.reverse().forEach(s => {
    sum += Number(s.total);

    const time = new Date(s.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    salesTable.innerHTML += `
      <tr>
        <td>${s.name}</td>
        <td>${s.qty} ${s.unit}</td>
        <td>${s.price.toLocaleString()} ${s.currency}</td>
        <td>${s.total.toLocaleString()} ${s.currency}</td>
        <td>${time}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="cancelSale('${s.id}')" title="Bekor qilish">
            ✖
          </button>
        </td>
      </tr>
    `;
  });

  totalSum.innerHTML = `${sum.toLocaleString()} <span>UZS</span>`;
}

function startNewSale() {
  if (!confirm(
    "Yangi sotuvni boshlaysizmi?\n\n" +
    "Oldingi sotuvlar saqlanadi, lekin yangi hisob ochiladi."
  )) return;

  currentSaleSessionId = Date.now();
  localStorage.setItem("currentSaleSessionId", currentSaleSessionId);

  if (salesTable) {
    salesTable.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-3">
          Yangi sotuv uchun tayyor
        </td>
      </tr>
    `;
  }

  if (totalSum) {
    totalSum.innerHTML = `0 <span>UZS</span>`;
  }

  if (saleQty) saleQty.value = "";
  if (saleProduct) renderSaleProducts();

  showSaleAlert("🆕 Yangi sotuv boshlandi!", "success");
}

async function cancelSale(id) {
  if (!confirm("Bu sotuvni bekor qilmoqchimisiz?\nMahsulot stokga qaytariladi.")) return;

  // OFFLINE DATA MODE START
  if (OFFLINE_DATA_MODE) {
    const sale = sales.find(s => String(s.id) === String(id));
    if (sale && sale.status === "sold") {
      const product = products.find(p => p.id === sale.productId);
      if (product) product.stock += sale.qty;
      sale.status = "returned";
      saveProducts();
      saveSales();
    }

    showSaleAlert("✅ Sotuv bekor qilindi! (OFFLINE)", "success");
    await apiLoadProducts();
    await apiLoadSales();

    if (typeof DashboardStatisticsManager !== 'undefined') {
      DashboardStatisticsManager.init();
    }
    return;
  }
  // OFFLINE DATA MODE END

  try {
    // "Bekor qilish" = returnSale (mahsulot omborga qaytadi, sale statusi "returned")
    const result = await AuthSystem.returnSale(id);

    if (!result || !result.success) {
      alert(result?.backendMessage || "Sotuvni bekor qilishda xatolik yuz berdi");
      return;
    }

    showSaleAlert("✅ Sotuv bekor qilindi!", "success");
    await apiLoadProducts();
    await apiLoadSales();

    if (typeof DashboardStatisticsManager !== 'undefined') {
      DashboardStatisticsManager.init();
    }
  } catch (error) {
    console.error(error);
    alert("Sotuvni bekor qilishda xatolik yuz berdi");
  }
}

async function deleteSale(id) {
  if (!confirm("Bu sotuvni butunlay o'chirmoqchimisiz?\nMahsulot stokga qaytariladi.")) return;

  // OFFLINE DATA MODE START
  if (OFFLINE_DATA_MODE) {
    const sale = sales.find(s => String(s.id) === String(id));
    if (sale && sale.status === "sold") {
      const product = products.find(p => p.id === sale.productId);
      if (product) product.stock += sale.qty;
      saveProducts();
    }
    sales = sales.filter(s => s.id !== id);
    saveSales();

    showSaleAlert("✅ Sotuv bekor qilindi! (OFFLINE)", "success");
    await apiLoadProducts();
    await apiLoadSales();

    if (typeof DashboardStatisticsManager !== 'undefined') {
      DashboardStatisticsManager.init();
    }
    return;
  }
  // OFFLINE DATA MODE END

  try {
    // "O'chirish" = cancelSale (sale bekor qilinadi va mahsulot omborga qaytadi)
    const result = await AuthSystem.cancelSale(id);

    if (!result || !result.success) {
      alert(result?.backendMessage || "Sotuvni o'chirishda xatolik yuz berdi");
      return;
    }

    showSaleAlert("✅ Sotuv bekor qilindi!", "success");
    await apiLoadProducts();
    await apiLoadSales();

    if (typeof DashboardStatisticsManager !== 'undefined') {
      DashboardStatisticsManager.init();
    }
  } catch (error) {
    console.error(error);
    alert("Sotuvni o'chirishda xatolik yuz berdi");
  }
}
// //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/* ===============================================
   FOYDA HISOBLASH (Professional - Oylik real foyda)
=============================================== */
// ===============================================
// MONTHLY PROFIT — PROFESSIONAL
// Sale snapshot → profit
// ===============================================
function calculateMonthlyProfit(date = getToday()) {

  const [year, month] =
    String(date).split("-");

  let totalProfit = 0;

  if (!Array.isArray(sales)) {
    return 0;
  }

  sales.forEach(sale => {

    if (!sale) return;

    if (sale.status !== "sold") {
      return;
    }

    if (!sale.date) {
      return;
    }

    const saleDate =
      getDateKey(sale.date);

    const [saleYear, saleMonth] =
      String(saleDate).split("-");

    if (
      saleYear !== year ||
      saleMonth !== month
    ) {
      return;
    }

    const qty =
      Number(
        sale.qty ??
        sale.quantity ??
        0
      );

    if (qty <= 0) return;

    // 1. Eng yaxshi variant:
    // backend sale ichida tayyor profit yuborsa
    if (
      sale.profit !== undefined &&
      sale.profit !== null
    ) {
      totalProfit +=
        Number(sale.profit) || 0;

      return;
    }

    // 2. Sale snapshot tannarxi
    const unitCost =
      Number(
        sale.costPrice ??
        sale.unitCost ??
        sale.unit_cost ??
        0
      );

    const unitPrice =
      Number(
        sale.price ??
        sale.unitPrice ??
        sale.unit_price ??
        0
      );

    // 3. Eski sale'lar uchun
    // productdan fallback
    if (unitCost > 0 && unitPrice > 0) {

      totalProfit +=
        (unitPrice - unitCost) * qty;
    }

  });

  return Math.round(totalProfit);
}

function updateProfitUI() {
  const counterEl = document.querySelector('.counter[data-key="totalProfit"]');
  if (!counterEl) return;

  const currentProfit = calculateMonthlyProfit();
  const lastShown = Number(counterEl.dataset.lastValue || 0);

  if (currentProfit !== lastShown) {
    let current = lastShown;
    const step = Math.ceil(Math.abs(currentProfit - lastShown) / 60);

    const interval = setInterval(() => {
      if (currentProfit > lastShown) {
        current += step;
        if (current >= currentProfit) {
          counterEl.innerHTML = `${currentProfit.toLocaleString()} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
          clearInterval(interval);
        } else {
          counterEl.innerHTML = `${Math.floor(current).toLocaleString()} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
        }
      } else {
        current -= step;
        if (current <= currentProfit) {
          counterEl.innerHTML = `${currentProfit.toLocaleString()} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
          clearInterval(interval);
        } else {
          counterEl.innerHTML = `${Math.floor(current).toLocaleString()} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
        }
      }
    }, 20);

    counterEl.dataset.lastValue = currentProfit;
  } else {
    counterEl.innerHTML = `${currentProfit.toLocaleString()} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
  }
}

function calculateInventoryBalance() {
  return products.reduce((sum, product) => {
    const stock = Number(product.stock) || 0;
    const costPrice = Number(product.costPrice);

    if (!Number.isFinite(costPrice) || costPrice < 0) {
      return sum;
    }

    return sum + (stock * costPrice);
  }, 0);
}

function updateInventoryBalanceUI() {
  const counterEl = document.querySelector(
    '.counter[data-key="inventoryBalance"]'
  );

  if (!counterEl) return;

  const balance = Math.round(calculateInventoryBalance());

  counterEl.dataset.lastValue = balance;

  counterEl.innerHTML = `
    ${balance.toLocaleString("uz-UZ")}
    <small style="
      font-size:0.55em;
      color:#94a3b8;
      font-weight:400;
      margin-left:4px
    ">UZS</small>
  `;
}

function updateInventoryBalanceUI() {
  const counterEl = document.querySelector('.counter[data-key="inventoryBalance"]');
  if (!counterEl) return;

  const balance = Math.round(calculateInventoryBalance());
  counterEl.dataset.lastValue = balance;
  counterEl.innerHTML = `${balance.toLocaleString()} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">UZS</small>`;
}

// showNotification — 3910-qatordagi unified versiyaga ko'chirildi (FIX 4)

/* ===============================================
   TRANSACTIONS TABLE (Filter bilan)
=============================================== */
/* ===============================================
   ✅ TRANSACTIONS TABLE (Minimalistik & Professional)
=============================================== */
function renderTransactions(apiTransactions) {
  const tbody = document.getElementById("transactionsTableBody");

  const logHeader = () => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🛒 TRANSACTIONS UI");
  };

  if (!tbody) {
    logHeader();
    console.log("Rows rendered: 0");
    console.log('❌ REASON: #transactionsTableBody element not found in DOM');
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    return;
  }

  // ================================
  // ✅ DATA SOURCE
  // - If apiTransactions array was passed in (from getTransactions()/the API),
  //   map + use it directly.
  // - Otherwise fall back to the legacy local `sales` array (old behavior),
  //   so existing callers like renderTransactions() with no args keep working.
  // ================================
  const usingApiData = Array.isArray(apiTransactions);
  let filteredSales = [];
  let reason = "";

  if (usingApiData) {
    filteredSales = apiTransactions.map(mapTransaction);

    // ✅ Bekor qilingan / qaytarilgan sotuvlarni jurnaldan chiqarib tashlash
    // (loyihaning boshqa joylarida ham ishlatiladigan status === "sold" qoidasi)
    filteredSales = filteredSales.filter(s => s.status === "sold");

    if (transactionSearchQuery) {
      filteredSales = filteredSales.filter(s =>
        (s.name || "").toLowerCase().includes(transactionSearchQuery)
      );
    }

    if (apiTransactions.length === 0) {
      reason = "API returned 0 items for the selected period/filter";
    } else if (filteredSales.length === 0) {
      reason = `Search query "${transactionSearchQuery}" matched 0 of ${apiTransactions.length} API items`;
    }
  } else {
    // ================================
    // ✅ 1 OYDAN ESKI SAVDOLARNI TOZALASH (legacy local-array path)
    // ================================
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(now.getDate() - 30);

    const cleanedSales = sales.filter(s => toLocalDate(s.date) >= oneMonthAgo);
    if (cleanedSales.length !== sales.length) {
      sales = cleanedSales;
      saveSales();
    }

    const today = getToday();

    if (transactionFilter === "daily") {
      filteredSales = sales.filter(s => getDateKey(s.date) === today);
    }
    else if (transactionFilter === "weekly") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filteredSales = sales.filter(s => toLocalDate(s.date) >= sevenDaysAgo);
    }
    else if (transactionFilter === "monthly") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filteredSales = sales.filter(s => toLocalDate(s.date) >= thirtyDaysAgo);
    }
    else {
      filteredSales = sales.slice();
    }

    // ✅ Bekor qilingan / qaytarilgan sotuvlarni jurnaldan chiqarib tashlash
    // (loyihaning boshqa joylarida ham ishlatiladigan status === "sold" qoidasi)
    filteredSales = filteredSales.filter(s => s.status === "sold");

    if (sales.length === 0) {
      reason = "Local `sales` array is empty (no data loaded yet)";
    } else if (filteredSales.length === 0) {
      reason = `No local sales match filter "${transactionFilter}"`;
    }

    if (transactionSearchQuery) {
      const beforeSearch = filteredSales.length;
      filteredSales = filteredSales.filter(s =>
        (s.name || "").toLowerCase().includes(transactionSearchQuery)
      );
      if (beforeSearch > 0 && filteredSales.length === 0) {
        reason = `Search query "${transactionSearchQuery}" matched 0 of ${beforeSearch} rows`;
      }
    }
  }

  tbody.innerHTML = "";

  const reversedSales = filteredSales.slice().reverse();

  logHeader();
  console.log("Rows rendered:", reversedSales.length);
  if (reversedSales.length === 0) {
    console.log("❌ REASON:", reason || "Unknown - filtered data set is empty");
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━");

  if (reversedSales.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <div class="empty-icon">📦</div>
          <div class="empty-title">Tranzaksiya topilmadi</div>
          <div class="empty-subtitle">Tanlangan filtr bo'yicha ma'lumot mavjud emas</div>
        </td>
      </tr>
    `;
    return;
  }

  reversedSales.forEach((s, index) => {
    const saleDate = toLocalDate(s.date);

    const formattedDate = saleDate.toLocaleDateString('en-GB');
    const formattedTime = saleDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const paymentBadge = s.paymentType === "card"
      ? `<span class="payment-badge payment-card"><i class="bi bi-credit-card"></i> Karta</span>`
      : `<span class="payment-badge payment-cash"><i class="bi bi-cash"></i> Naqd</span>`;

    const animationDelay = `style="animation-delay: ${index * 0.05}s"`;

    // ✅ HAR BIR TD GA data-label ATTRIBUTINI TO'G'RIDAN-TO'G'RI QO'SHAMIZ
    tbody.innerHTML += `
      <tr class="transaction-row" ${animationDelay}>
        <td data-label="Mahsulot">
          <div class="product-info">
            <div class="product-name">${s.name}</div>
            <div class="product-category">${s.category}</div>
          </div>
        </td>
        <td data-label="Miqdor">
          <div class="quantity-info">
            <span class="qty-value">${s.qty}</span>
            <span class="qty-unit">${s.unit}</span>
          </div>
        </td>
        <td data-label="Narx">
          <div class="price-info">
            ${s.price.toLocaleString()}
            <span class="currency">${s.currency}</span>
          </div>
        </td>
        <td data-label="Sana">
          <div class="datetime-info">
            <div class="date-text">${formattedDate}</div>
            <div class="time-text">${formattedTime}</div>
          </div>
        </td>
        <td data-label="To'lov">${paymentBadge}</td>
        <td data-label="Holat">
          <span class="status-badge status-sold">
            <i class="bi bi-check-circle-fill"></i> Sotildi
          </span>
        </td>
      </tr>
    `;
  });
}


const transactionSearchInput = document.getElementById("transactionSearch");

if (transactionSearchInput) {
  transactionSearchInput.addEventListener("input", (e) => {
    transactionSearchQuery = e.target.value.trim().toLowerCase();
    renderTransactions();
  });
}

const transactionFilterSelect = document.getElementById("transactionFilter");
if (transactionFilterSelect) {
  transactionFilterSelect.addEventListener("change", async (e) => {
    transactionFilter = e.target.value;
    await loadAndRenderTransactions(transactionFilter);
  });
}

function calculateTotalRevenue() {
  return sales
    .filter(s => s.status === "sold")
    .reduce((sum, s) => sum + Number(s.total || 0), 0);
}

function updateTotalTransactions() {
  const el = document.getElementById("totalTransactionsCounter");
  if (!el) return;

  const today = getToday();
  const todayTransactions = sales.filter(s =>
    s.status === "sold" && getDateKey(s.date) === today
  ).length;

  const lastShown = Number(el.dataset.lastValue || 0);

  if (todayTransactions !== lastShown) {
    animateCounter(el, lastShown, todayTransactions);
    el.dataset.lastValue = todayTransactions;

    setTimeout(() => {
      el.innerHTML = `${todayTransactions} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">ta</small>`;
    }, 1200);
  } else {
    el.innerHTML = `${todayTransactions} <small style="font-size:0.55em;color:#94a3b8;font-weight:400;margin-left:4px">ta</small>`;
  }
}

function updateTotalRevenueUI() {
  const counterEl = document.querySelector('.counter[data-key="totalRevenue"]');
  if (counterEl) {
    const totalRevenue = calculateTotalRevenue();
    const lastValue = Number(counterEl.dataset.lastValue || 0);

    if (totalRevenue !== lastValue) {
      animateCounter(counterEl, lastValue, totalRevenue);
      counterEl.dataset.lastValue = totalRevenue;
    } else {
      counterEl.innerText = totalRevenue.toLocaleString();
    }
  }
}

document.querySelectorAll(".counter").forEach(counter => {
  const target = Number(counter.dataset.count);
  animateCounter(counter, 0, target);
});

/* ===============================================
   ✅ CHARTS (REAL DATA + AUTO UPDATE)
=============================================== */
async function updateCharts() {

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 UPDATING DASHBOARD CHARTS");

  try {

    if (typeof Chart === "undefined") {

      console.error(
        "❌ Chart.js topilmadi"
      );

      return;
    }

    // ===============================================
    // DAILY
    // ===============================================

    const dailyData =
      await getDailyRevenue();

    const dailySales =
      Number(
        dailyData?.daily_revenue
      ) || 0;

    // ===============================================
    // WEEKLY
    // ===============================================

    const trendData =
      await getWeeklyTrend();

    const safeTrend =
      Array.isArray(trendData)
        ? trendData
        : [];

    const weekDays =
      safeTrend.map(
        item => item.day
      );

    const weeklyData =
      safeTrend.map(
        item =>
          Number(item.amount) || 0
      );

    console.log(
      "📅 WEEK DAYS:",
      weekDays
    );

    console.log(
      "📈 WEEKLY DATA:",
      weeklyData
    );

    console.log(
      "📊 DAILY DATA:",
      dailySales
    );

    // ===============================================
    // WEEKLY CHART
    // ===============================================

    const weeklyCanvas =
      document.getElementById(
        "weeklyChart"
      );

    if (
      weeklyCanvas &&
      weekDays.length
    ) {

      if (
        chartInstances.weekly
      ) {

        chartInstances.weekly.destroy();

        chartInstances.weekly =
          null;
      }

      chartInstances.weekly =
        new Chart(
          weeklyCanvas,
          {
            type: "line",

            data: {

              labels:
                weekDays,

              datasets: [

                {
                  label:
                    "Daromad (UZS)",

                  data:
                    weeklyData,

                  borderColor:
                    "#06b6d4",

                  backgroundColor:
                    "rgba(6,182,212,0.15)",

                  fill:
                    true,

                  tension:
                    0.4,

                  pointRadius:
                    5,

                  pointBackgroundColor:
                    "#06b6d4",

                  pointBorderColor:
                    "#fff",

                  pointBorderWidth:
                    2
                }

              ]
            },

            options: {

              responsive:
                true,

              maintainAspectRatio:
                true,

              animation: {

                duration:
                  750,

                easing:
                  "easeInOutQuart"
              },

              plugins: {

                legend: {
                  display:
                    false
                },

                tooltip: {

                  callbacks: {

                    label:
                      function(context) {

                        return (
                          Number(
                            context.parsed.y
                          ).toLocaleString()
                          +
                          " UZS"
                        );

                      }

                  }

                }

              },

              scales: {

                y: {

                  beginAtZero:
                    true,

                  ticks: {

                    callback:
                      function(value) {

                        return Number(
                          value
                        ).toLocaleString();

                      }

                  }

                }

              }

            }

          }
        );

    }

    // ===============================================
    // DAILY CHART
    // ===============================================

    const dailyCanvas =
      document.getElementById(
        "dailyChart"
      );

    if (dailyCanvas) {

      if (
        chartInstances.daily
      ) {

        chartInstances.daily.destroy();

        chartInstances.daily =
          null;
      }

      chartInstances.daily =
        new Chart(
          dailyCanvas,
          {

            type:
              "bar",

            data: {

              labels:
                ["Bugun"],

              datasets: [

                {

                  label:
                    "Kunlik daromad",

                  data:
                    [dailySales],

                  backgroundColor:
                    "#22c55e",

                  borderRadius:
                    8
                }

              ]

            },

            options: {

              responsive:
                true,

              maintainAspectRatio:
                true,

              animation: {

                duration:
                  750,

                easing:
                  "easeInOutQuart"
              },

              plugins: {

                legend: {

                  display:
                    false
                },

                tooltip: {

                  callbacks: {

                    label:
                      function(context) {

                        return (
                          Number(
                            context.parsed.y
                          ).toLocaleString()
                          +
                          " UZS"
                        );

                      }

                  }

                }

              },

              scales: {

                y: {

                  beginAtZero:
                    true,

                  ticks: {

                    callback:
                      function(value) {

                        return Number(
                          value
                        ).toLocaleString();

                      }

                  }

                }

              }

            }

          }
        );

    }

    console.log(
      "✅ CHARTS SUCCESSFULLY UPDATED"
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  } catch (error) {

    console.error(
      "❌ UPDATE CHARTS ERROR:",
      error
    );

  }
}

function calculateProfitPreview() {
  const cost = Number(document.getElementById("productCostPrice").value) || 0;
  const price = Number(document.getElementById("productPrice").value) || 0;
  const profit = price - cost;

  const preview = document.getElementById("profitPreview");
  if (!preview) return;

  if (profit > 0) {
    preview.innerHTML = `<span style="color:#22c55e;font-weight:600">+${profit.toLocaleString()} UZS</span>`;
  } else if (profit < 0) {
    preview.innerHTML = `<span style="color:#ef4444;font-weight:600">${profit.toLocaleString()} UZS (Zarar!)</span>`;
  } else {
    preview.innerHTML = `<span style="color:#94a3b8">0 UZS</span>`;
  }
}

/* ===============================================
   ✅ QARZDORLAR BOSHQARUVI (SMS TIZIMI BILAN)
=============================================== */
function getDaysOverdue(returnDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = toLocalDate(returnDate);
  dueDate.setHours(0, 0, 0, 0);
  return Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
}

function getStatus(returnDate) {
  const days = getDaysOverdue(returnDate);
  if (days > 0) return { class: 'overdue', text: 'Muddati o\'tgan', days };
  if (days >= -7) return { class: 'upcoming', text: 'Yaqinlashmoqda', days: Math.abs(days) };
  return { class: 'normal', text: 'Oddiy', days: Math.abs(days) };
}

function formatDate(dateString) {
  const date = toLocalDate(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function normalizeDebtPhone(value) {
  let phone = String(value || "").replace(/[^\d+]/g, "");

  if (phone.startsWith("998")) {
    phone = "+" + phone;
  }

  if (/^\d{9}$/.test(phone)) {
    phone = "+998" + phone;
  }

  if (phone.startsWith("+998") && phone.length > 13) {
    phone = phone.slice(0, 13);
  }

  return phone;
}

async function apiLoadDebtors() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 LIST DEBTORS API");
  console.log("📤 REQUEST: GET /debt/get");

  // OFFLINE DATA MODE START
  if (OFFLINE_DATA_MODE) {
    debtors = debtors.filter(d => d.isActive !== false && d.amount > 0);
    saveDebtors();
    renderDebtors();
    updateStatistics();
    updateTotalDebtCounter();
    console.log("✅ Debtors loaded from OFFLINE storage:", debtors.length);
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    return;
  }
  // OFFLINE DATA MODE END

  try {
    const result = await AuthSystem.getDebts();

    if (!result || !result.success) {
      console.error("❌ ERROR:", result?.backendMessage || result?.responseData);
      console.log("━━━━━━━━━━━━━━━━━━━━━━");
      showNotification(result?.backendMessage || "Qarzdorlarni yuklashda xatolik yuz berdi", "error");
      return;
    }

    const rawDebts = result.data?.debts || [];

    debtors = rawDebts.map(mapApiDebtor).filter(d => d.isActive && d.amount > 0);
    saveDebtors();
    renderDebtors();
    updateStatistics();
    updateTotalDebtCounter();

    console.log("✅ SUCCESS — Jami:", debtors.length, "ta qarzdor yuklandi");
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("❌ ERROR:", error?.response?.status, error?.response?.data || error.message);
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    showNotification(getApiErrorMessage(error, "Qarzdorlarni yuklashda xatolik yuz berdi"), "error");
  }
}

function openModal() {
  document.getElementById('debtorModal').classList.add('show');
  document.getElementById('debtorForm').reset();
  document.getElementById('debtDate').value = getToday();
}

function closeModal() {
  document.getElementById('debtorModal').classList.remove('show');
}

function openAdjustModal(id, type) {
  const debtor = debtors.find(d => d.id === id);
  if (!debtor) return;

  document.getElementById('adjustDebtorId').value = id;
  document.getElementById('adjustType').value = type;
  document.getElementById('adjustDebtorName').value = debtor.name;
  document.getElementById('adjustCurrentDebt').value = `${debtor.amount.toLocaleString()} so'm`;
  document.getElementById('adjustAmount').value = '';

  if (type === 'add') {
    document.getElementById('adjustModalTitle').textContent = 'Qarz qo\'shish';
    document.getElementById('adjustAmountLabel').textContent = 'Qo\'shiladigan summa (so\'m)';
    document.getElementById('adjustSubmitBtn').innerHTML = '<i class="bi bi-plus-circle"></i> Qarz qo\'shish';
  } else {
    document.getElementById('adjustModalTitle').textContent = 'Qarzni kamaytirish';
    document.getElementById('adjustAmountLabel').textContent = 'To\'lanadigan summa (so\'m)';
    document.getElementById('adjustSubmitBtn').innerHTML = '<i class="bi bi-dash-circle"></i> Qarzni kamaytirish';
  }

  document.getElementById('adjustDebtModal').classList.add('show');
}

function closeAdjustModal() {
  document.getElementById('adjustDebtModal').classList.remove('show');
}

async function handleAdjustDebt(event) {
  event.preventDefault();

  const id = document.getElementById("adjustDebtorId").value;
  const type = document.getElementById("adjustType").value;
  const amount = parseFloat(document.getElementById("adjustAmount").value);

  const debtor = debtors.find(d => d.id === id);
  if (!debtor) return;

  if (isNaN(amount) || amount <= 0) {
    alert("Summani to'g'ri kiriting!");
    return;
  }

  try {
    // OFFLINE DATA MODE START
    if (OFFLINE_DATA_MODE) {
      if (type === "add") {
        debtor.amount += amount;
        debtor.originalAmount = (debtor.originalAmount || debtor.amount) + amount;
        showSuccessMessage(`${debtor.name}ga ${amount.toLocaleString()} so'm qarz qo'shildi! (OFFLINE)`);
      } else {
        if (amount > debtor.amount) {
          alert("To'lanadigan summa qarzdan katta bo'lishi mumkin emas!");
          return;
        }

        debtor.amount -= amount;
        debtor.paidAmount = (debtor.paidAmount || 0) + amount;

        paidDebtors.push({
          debtorId: id,
          debtorName: debtor.name,
          amount: amount,
          date: getCurrentLocalDateTime(),
          previousDebt: debtor.amount + amount
        });

        showSuccessMessage(`💰 ${amount.toLocaleString()} so'm to'lov qabul qilindi! (OFFLINE)`);
      }

      saveDebtors();
      closeAdjustModal();
      await apiLoadDebtors();
      return;
    }
    // OFFLINE DATA MODE END

    if (type === "add") {
      // ⚠️ Yangi backend'da qarzni mahsulot/sotuvsiz, ixtiyoriy summa bilan
      // to'g'ridan-to'g'ri "qo'shish" imkoni yo'q — backendda "qarz" alohida
      // obyekt emas, balki total_remaining > 0 bo'lgan Sale hisoblanadi.
      // Shuning uchun bu amalni backendga yubormaymiz (404 bo'lardi);
      // buning o'rniga foydalanuvchini Sotish sahifasiga yo'naltiramiz.
      alert(
        "Yangi backend'da qarzni alohida qo'shib bo'lmaydi — qarz faqat Sotish sahifasida " +
        "mijoz tanlab, to'liq to'lovsiz (yoki qisman to'lov bilan) sotuv amalga oshirilganda avtomatik yaratiladi. " +
        "Iltimos, \"Sotish\" bo'limidan foydalaning."
      );
      return;
    } else {
      // ✅ To'lov qabul qilish — POST /sale/payment/add?sale_id=...
      if (amount > debtor.amount) {
        alert("To'lanadigan summa qarzdan katta bo'lishi mumkin emas!");
        return;
      }

      const result = await AuthSystem.addPayment(debtor.saleId || id, amount, "cash");

      if (!result || !result.success) {
        alert(result?.backendMessage || "To'lovni saqlashda xatolik yuz berdi");
        return;
      }

      paidDebtors.push({
        debtorId: id,
        debtorName: debtor.name,
        amount: amount,
        date: getCurrentLocalDateTime(),
        previousDebt: debtor.amount
      });

      showSuccessMessage(`💰 ${amount.toLocaleString()} so'm to'lov qabul qilindi!`);
    }

    closeAdjustModal();
    await apiLoadDebtors();
  } catch (error) {
    console.error("❌ ERROR:", error?.response?.status, error?.response?.data || error.message);
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    alert(getApiErrorMessage(error, "Qarzni o'zgartirishda xatolik yuz berdi"));
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  // ✅ DUPLICATE CHECK - Qarzdor allaqachon mavjudmi?
  const phone = normalizeDebtPhone(document.getElementById('debtorPhone').value);
  const existingDebtor = debtors.find(d => d.phone === phone);

  if (existingDebtor) {
    alert(`❌ Bu telefon raqami allaqachon mavjud!\n\nQarzdor: ${existingDebtor.name}\nQarz: ${existingDebtor.amount.toLocaleString()} so'm`);
    return;
  }

  const newDebtor = {
    name: document.getElementById('debtorName').value.trim(),
    phone: phone,
    amount: parseFloat(document.getElementById('debtAmount').value),
    debtDate: document.getElementById('debtDate').value,
    returnDate: document.getElementById('returnDate').value,
    notes: document.getElementById('debtNotes').value.trim() || ''
  };

  if (!newDebtor.name || !newDebtor.phone || !/^\+998\d{9}$/.test(newDebtor.phone)) {
    alert("Qarzdor ismi va telefon raqamini to'g'ri kiriting!");
    return;
  }

  if (isNaN(newDebtor.amount) || newDebtor.amount <= 0) {
    alert("Qarz summasini to'g'ri kiriting!");
    return;
  }

  try {
    // OFFLINE DATA MODE START
    if (OFFLINE_DATA_MODE) {
      debtors.push({
        id: offlineGenId(),
        name: newDebtor.name,
        phone: newDebtor.phone,
        amount: newDebtor.amount,
        originalAmount: newDebtor.amount,
        paidAmount: 0,
        debtDate: newDebtor.debtDate,
        returnDate: newDebtor.returnDate,
        notes: newDebtor.notes,
        status: "normal",
        isActive: true
      });
      saveDebtors();

      closeModal();
      showSuccessMessage(`✅ ${newDebtor.name} muvaffaqiyatli qo'shildi! (OFFLINE)`);
      await apiLoadDebtors();
      return;
    }
    // OFFLINE DATA MODE END

    // ⚠️ Yangi backend'da qarzni mahsulot/sotuvsiz, ixtiyoriy summa bilan
    // to'g'ridan-to'g'ri "qo'shish" imkoni yo'q — backendda "qarz" alohida
    // obyekt emas, balki total_remaining > 0 bo'lgan Sale hisoblanadi.
    // Shuning uchun bu amalni backendga yubormaymiz (404 bo'lardi);
    // buning o'rniga foydalanuvchini Sotish sahifasiga yo'naltiramiz.
    alert(
      "Yangi backend'da qarzni alohida qo'shib bo'lmaydi — qarz faqat Sotish sahifasida " +
      "mijoz tanlab, to'liq to'lovsiz (yoki qisman to'lov bilan) sotuv amalga oshirilganda avtomatik yaratiladi. " +
      "Iltimos, \"Sotish\" bo'limidan foydalaning."
    );
    return;
  } catch (error) {
    console.error(error);
    alert(getApiErrorMessage(error, "Qarzdorni qo'shishda xatolik yuz berdi"));
  }
}

function contactDebtor(id) {
  const debtor = debtors.find(d => d.id === id);
  if (debtor) window.open(`tel:${debtor.phone}`);
}

// async function deleteDebtor(id) {
//   const debtor = debtors.find(d => d.id === id);
//   if (debtor && confirm(`${debtor.name}ni o'chirish?`)) {
//     try {
//       await window.crmApi.delete(`/api/v1/debtors/${id}`);
//       await apiLoadDebtors();
//       showSuccessMessage('O\'chirildi!');
//     } catch (error) {
//       console.error(error);
//       alert(getApiErrorMessage(error, "Qarzdorni o'chirishda xatolik yuz berdi"));
//     }
//   }
// }
async function deleteDebtor(id) {
  const debtor = debtors.find(d => d.id === id);
  const name = debtor ? debtor.name : `#${id}`;

  if (!confirm(`"${name}" — bog'liq sotuvni bekor qilib, qarzni o'chirish? (Mahsulot omborga qaytariladi)`)) return;

  console.log("━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🗑 DELETE DEBTOR API (via cancelSale)");
  console.log(`📤 REQUEST: DELETE /sale/cancel?sale_id=${id}`);

  try {
    // OFFLINE DATA MODE START
    if (OFFLINE_DATA_MODE) {
      debtors = debtors.filter(d => d.id !== id);
      saveDebtors();
      showSuccessMessage(`🗑 ${name} muvaffaqiyatli o'chirildi! (OFFLINE)`);
      await apiLoadDebtors();
      return;
    }
    // OFFLINE DATA MODE END

    // ⚠️ Yangi backend'da alohida "qarzdorni o'chirish" endpoint'i yo'q —
    // qarz aslida to'liq to'lanmagan Sale bo'lgani uchun, uni "o'chirish"
    // shu sotuvni bekor qilish (cancelSale) orqali amalga oshiriladi;
    // bu mahsulot miqdorini omborga qaytaradi.
    const result = await AuthSystem.cancelSale(debtor?.saleId || id);

    if (!result || !result.success) {
      alert(result?.backendMessage || "Qarzdorni o'chirishda xatolik yuz berdi");
      return;
    }

    console.log("✅ SUCCESS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━");

    showSuccessMessage(`🗑 ${name} muvaffaqiyatli o'chirildi!`);
    await apiLoadDebtors();
  } catch (err) {
    console.error("❌ ERROR:", err?.response?.status, err?.response?.data || err.message);
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    alert(getApiErrorMessage(err, "Qarzdorni o'chirishda xatolik yuz berdi"));
  }
}

// ✅ GET DEBTOR BY ID — to'liq professional versiya
async function getDebtor(id) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👤 GET DEBTOR API");
  console.log(`📤 REQUEST: GET /api/v1/debtors/${id}`);

  try {
    const res = await window.crmApi.get(`/api/v1/debtors/${id}`);

    console.log("📥 RESPONSE:", res.status, res.data);
    console.table([res.data]);
    console.log("✅ SUCCESS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━");

    return mapApiDebtor(res.data);
  } catch (e) {
    console.error("❌ ERROR:", e?.response?.status, e?.response?.data || e.message);
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    showNotification(getApiErrorMessage(e, "Qarzdor ma'lumotlarini yuklashda xatolik"), "error");
    return null;
  }
}

// ✅ UPDATE DEBTOR — PUT /api/v1/debtors/{id}
async function updateDebtor(id, data) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✏️ UPDATE DEBTOR API");
  console.log(`📤 REQUEST: PUT /api/v1/debtors/${id}`);
  console.log("📦 PAYLOAD:", data);

  try {
    // OFFLINE DATA MODE START
    if (OFFLINE_DATA_MODE) {
      const debtor = debtors.find(d => d.id === id);
      if (debtor) {
        const paid = (debtor.originalAmount || debtor.amount) - debtor.amount;
        debtor.name = data.name;
        debtor.phone = data.phone;
        debtor.originalAmount = data.originalAmount;
        debtor.amount = Math.max(data.originalAmount - paid, 0);
        debtor.debtDate = data.debtDate;
        debtor.returnDate = data.returnDate;
        debtor.notes = data.notes || "";
        saveDebtors();
      }

      showSuccessMessage(`✅ ${data.name} ma'lumotlari yangilandi! (OFFLINE)`);
      closeEditDebtorModal();
      await apiLoadDebtors();
      return;
    }
    // OFFLINE DATA MODE END

    // ⚠️ Yangi backend'da mavjud Sale (qarz)ning mijoz ismi/telefoni/muddatini
    // alohida tahrirlash imkoni yo'q — sale.routes.js'da faqat create/cancel/
    // return/payment/get bor, umumiy "update" yo'q. Shuning uchun bu amalni
    // backendga yubormaymiz (404 bo'lardi).
    alert(
      "Yangi backend'da mavjud qarz (sotuv) ma'lumotlarini tahrirlash imkoni hali yo'q — " +
      "faqat to'lov qabul qilish (\"Qarzni kamaytirish\") yoki uni butunlay bekor qilish " +
      "(\"O'chirish\") mumkin."
    );
    closeEditDebtorModal();
  } catch (e) {
    console.error("❌ ERROR:", e?.response?.status, e?.response?.data || e.message);
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    alert(getApiErrorMessage(e, "Qarzdorni yangilashda xatolik yuz berdi"));
  }
}

// ✅ EDIT DEBTOR MODAL — UI boshqaruvi
function openEditDebtorModal(id) {
  const debtor = debtors.find(d => d.id === id);
  if (!debtor) {
    showNotification("Qarzdor topilmadi", "error");
    return;
  }

  // Modal maydonlarini to'ldirish
  document.getElementById("editDebtorId").value = id;
  document.getElementById("editDebtorName").value = debtor.name;
  document.getElementById("editDebtorPhone").value = debtor.phone;
  document.getElementById("editDebtAmount").value = debtor.originalAmount || debtor.amount;
  document.getElementById("editDebtDate").value = debtor.debtDate
    ? debtor.debtDate.split("T")[0]
    : "";
  document.getElementById("editReturnDate").value = debtor.returnDate
    ? debtor.returnDate.split("T")[0]
    : "";
  document.getElementById("editDebtNotes").value = debtor.notes || "";

  document.getElementById("editDebtorModal").classList.add("show");
}

function closeEditDebtorModal() {
  document.getElementById("editDebtorModal").classList.remove("show");
}

async function handleEditDebtorSubmit(event) {
  event.preventDefault();

  const id = parseInt(document.getElementById("editDebtorId").value);
  const name = document.getElementById("editDebtorName").value.trim();
  const phone = normalizeDebtPhone(document.getElementById("editDebtorPhone").value);
  const originalAmount = parseFloat(document.getElementById("editDebtAmount").value);
  const debtDate = document.getElementById("editDebtDate").value;
  const returnDate = document.getElementById("editReturnDate").value;
  const notes = document.getElementById("editDebtNotes").value.trim();

  if (!name || !phone || !/^\+998\d{9}$/.test(phone)) {
    alert("Ism va telefon raqamni to'g'ri kiriting!");
    return;
  }

  if (isNaN(originalAmount) || originalAmount <= 0) {
    alert("Qarz summasini to'g'ri kiriting!");
    return;
  }

  await updateDebtor(id, { name, phone, originalAmount, debtDate, returnDate, notes });
}

/* ===============================================
   ✅ SMS YUBORISH TIZIMI (PROFESSIONAL)
=============================================== */
function openSmsModal(id) {
  const debtor = debtors.find(d => d.id === id);
  if (!debtor) return;

  currentSmsDebtorId = id;
  const daysLeft = -getDaysOverdue(debtor.returnDate);

  let smsMessage = `Hurmatli ${debtor.name}!\n\n`;

  if (daysLeft === 1) {
    smsMessage += `⚠️ ESLATMA: Ertaga to'lov muddati!\n\n`;
  } else if (daysLeft < 0) {
    smsMessage += `🚨 MUHIM: To'lov muddati ${Math.abs(daysLeft)} kun oldin o'tgan!\n\n`;
  } else if (daysLeft === 0) {
    smsMessage += `🔴 DIQQAT: Bugun to'lov muddati!\n\n`;
  }

  smsMessage += `Qarzingiz: ${debtor.amount.toLocaleString()} so'm\n`;
  smsMessage += `To'lov sanasi: ${formatDate(debtor.returnDate)}\n\n`;
  smsMessage += `Iltimos, imkon qadar tezroq to'lovni amalga oshiring.\n\n`;
  smsMessage += `Hurmat bilan,\nBoshqaruv jamoasi`;

  document.getElementById('smsRecipient').value = debtor.name;
  document.getElementById('smsPhone').value = debtor.phone;
  document.getElementById('smsMessage').value = smsMessage;
  document.getElementById('smsPreview').textContent = smsMessage;

  document.getElementById('smsModal').classList.add('show');
}

function closeSmsModal() {
  document.getElementById('smsModal').classList.remove('show');
}

async function sendSms(event) {
  event.preventDefault();

  const debtor = debtors.find(d => d.id === currentSmsDebtorId);
  if (!debtor) return;

  // ⚠️ Yangi backend'da SMS yuborish uchun umuman route yo'q (SMS provayder
  // integratsiyasi hali qo'shilmagan). Eski /api/v1/debtors/{id}/sms-reminder
  // doim 404 qaytarardi va foydalanuvchi buni "SMS yuborildi" deb noto'g'ri
  // tushunardi (chunki xato faqat konsolda ko'rinardi). Endi buning o'rniga
  // ochiq-oydin xabar beramiz — soxta so'rov yubormaymiz.
  alert(
    "SMS yuborish funksiyasi hali backend'da ulanmagan (SMS provayder integratsiyasi yo'q). " +
    "Bu funksiya ishlashi uchun backend tomonda alohida SMS route qo'shilishi kerak."
  );
  closeSmsModal();
}

function sendAutoSms(debtor) {
  const smsMessage = `Hurmatli ${debtor.name}!\n\n` +
    `⚠️ ESLATMA: Ertaga to'lov muddati!\n\n` +
    `Qarzingiz: ${debtor.amount.toLocaleString()} so'm\n` +
    `To'lov sanasi: ${formatDate(debtor.returnDate)}\n\n` +
    `Iltimos, ertaga to'lovni amalga oshiring.\n\n` +
    `Hurmat bilan,\nBoshqaruv jamoasi`;

  const smsData = {
    id: Date.now(),
    debtorId: debtor.id,
    debtorName: debtor.name,
    phone: debtor.phone,
    message: smsMessage,
    date: getCurrentLocalDateTime(),
    type: 'auto_reminder',
    status: 'sent'
  };

  smsHistory.push(smsData);
  saveSmsHistory();

  localStorage.setItem(`last_auto_sms_${debtor.id}`, getToday());

  console.log('═══════════════════════════════════');
  console.log('📱 AVTOMATIK SMS YUBORILDI');
  console.log('═══════════════════════════════════');
  console.log('Qabul qiluvchi:', debtor.name);
  console.log('Telefon:', debtor.phone);
  console.log('Sana:', new Date().toLocaleString('uz-UZ'));
  console.log('───────────────────────────────────');
  console.log(smsMessage);
  console.log('═══════════════════════════════════\n');

  renderSmsHistory();
  showSuccessMessage(`📱 ${debtor.name}ga avtomatik SMS yuborildi!`);
}

function sendOverdueSms(debtor, daysOverdue) {
  const smsMessage = `Hurmatli ${debtor.name}!\n\n` +
    `🚨 MUHIM: To'lov muddati ${daysOverdue} kun oldin o'tgan!\n\n` +
    `Qarzingiz: ${debtor.amount.toLocaleString()} so'm\n` +
    `To'lov sanasi edi: ${formatDate(debtor.returnDate)}\n\n` +
    `Iltimos, imkon qadar tezroq to'lovni amalga oshiring.\n\n` +
    `Savol bo'lsa bog'laning.\n\n` +
    `Hurmat bilan,\nBoshqaruv jamoasi`;

  const smsData = {
    id: Date.now(),
    debtorId: debtor.id,
    debtorName: debtor.name,
    phone: debtor.phone,
    message: smsMessage,
    date: getCurrentLocalDateTime(),
    type: 'overdue_reminder',
    status: 'sent',
    daysOverdue: daysOverdue
  };

  smsHistory.push(smsData);
  saveSmsHistory();

  localStorage.setItem(`last_overdue_sms_${debtor.id}`, getToday());

  console.log('═══════════════════════════════════');
  console.log('🚨 KECHIKKAN ESLATMA SMS');
  console.log('═══════════════════════════════════');
  console.log('Qabul qiluvchi:', debtor.name);
  console.log('Telefon:', debtor.phone);
  console.log('Kechikish:', daysOverdue, 'kun');
  console.log('Sana:', new Date().toLocaleString('uz-UZ'));
  console.log('───────────────────────────────────');
  console.log(smsMessage);
  console.log('═══════════════════════════════════\n');

  renderSmsHistory();
  showSuccessMessage(`🚨 ${debtor.name}ga kechikish eslatmasi yuborildi!`);
}

function renderSmsHistory() {
  const tbody = document.getElementById('smsHistoryTableBody');
  if (!tbody) return;

  if (smsHistory.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:3rem;">
          <div style="font-size:3.5rem; margin-bottom:1rem; opacity:0.5;">📱</div>
          <div style="font-size:1.2rem; font-weight:600; color:#64748b; margin-bottom:0.5rem;">SMS tarixi bo'sh</div>
          <div style="font-size:0.95rem; color:#94a3b8;">Birinchi SMS yuborilgandan keyin bu yerda ko'rinadi</div>
        </td>
      </tr>
    `;
    return;
  }

  const sortedHistory = [...smsHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

  tbody.innerHTML = sortedHistory.map(sms => {
    const date = toLocalDate(sms.date);
    const formattedDate = date.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
    const formattedTime = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

    let typeIcon = '';
    let typeText = '';
    let typeBadgeClass = '';

    if (sms.type === 'manual') {
      typeIcon = '<i class="bi bi-person-fill"></i>';
      typeText = 'Qo\'lda yuborilgan';
      typeBadgeClass = 'badge-manual';
    } else if (sms.type === 'auto_reminder') {
      typeIcon = '<i class="bi bi-robot"></i>';
      typeText = 'Avtomatik eslatma';
      typeBadgeClass = 'badge-auto';
    } else if (sms.type === 'overdue_reminder') {
      typeIcon = '<i class="bi bi-exclamation-triangle-fill"></i>';
      typeText = 'Muddati o\'tgan';
      typeBadgeClass = 'badge-overdue';
    }

    // Debtor info
    const debtor = debtors.find(d => d.id === sms.debtorId);
    const debtorStatus = debtor ?
      `<small style="color:#10b981; font-weight:600;">✓ Faol</small>` :
      `<small style="color:#94a3b8;">✓ To'langan</small>`;

    return `
      <tr>
        <td>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <strong style="font-size:1.05rem;">${sms.debtorName}</strong>
            ${debtorStatus}
          </div>
        </td>
        <td>
          <a href="tel:${sms.phone}" style="color:#3b82f6; text-decoration:none; font-weight:500;">
            <i class="bi bi-telephone"></i> ${sms.phone}
          </a>
        </td>
        <td>
          <span class="sms-type-badge ${typeBadgeClass}">
            ${typeIcon}
            <span>${typeText}</span>
          </span>
        </td>
        <td>
          <div style="display:flex; flex-direction:column; gap:2px;">
            <strong style="font-size:0.95rem;">${formattedDate}</strong>
            <span style="color:#64748b; font-size:0.85rem;">${formattedTime}</span>
          </div>
        </td>
        <td>
          <span class="sms-status-sent">
            <i class="bi bi-check-circle-fill"></i>
            Yuborildi
          </span>
        </td>
        <td>
          <button class="btn-view-sms" onclick="viewSmsDetails(${sms.id})" title="SMS matnini ko'rish">
            <i class="bi bi-eye-fill"></i>
            Ko'rish
          </button>
        </td>
      </tr>
    `;
  }).join('');

  updateSmsStatistics();
}

function viewSmsDetails(smsId) {
  const sms = smsHistory.find(s => s.id === smsId);
  if (!sms) return;

  const date = toLocalDate(sms.date);
  const formattedDate = date.toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  alert(
    `📱 SMS Tafsilotlari\n\n` +
    `Qabul qiluvchi: ${sms.debtorName}\n` +
    `Telefon: ${sms.phone}\n` +
    `Sana: ${formattedDate}\n` +
    `Turi: ${sms.type === 'manual' ? 'Qo\'lda' : 'Avtomatik'}\n\n` +
    `Xabar:\n${sms.message}`
  );
}

function updateSmsStatistics() {
  const today = getToday();

  const todaySms = smsHistory.filter(sms =>
    getDateKey(sms.date) === today
  ).length;

  const autoSms = smsHistory.filter(sms =>
    sms.type === 'auto_reminder' || sms.type === 'overdue_reminder'
  ).length;

  const manualSms = smsHistory.filter(sms =>
    sms.type === 'manual'
  ).length;

  const todayCountEl = document.getElementById('todaySmsCount');
  const autoCountEl = document.getElementById('autoSmsCount');
  const manualCountEl = document.getElementById('manualSmsCount');

  if (todayCountEl) todayCountEl.textContent = todaySms;
  if (autoCountEl) autoCountEl.textContent = autoSms;
  if (manualCountEl) manualCountEl.textContent = manualSms;
}

/* ===============================================
   ✅ AVTOMATIK SMS YUBORISH (Har kuni 08:00 da)
=============================================== */
function checkAndSendAutoSms() {
  const now = new Date();
  const currentHour = now.getHours();
  const todayStr = getDateKey(now);

  // ✅ FAQAT 08:00 DA ISHLAYDI
  if (currentHour !== 8) {
    console.log(`⏰ Hozir soat ${currentHour}:00. SMS 08:00 da yuboriladi.`);
    return;
  }

  console.log('🔔 08:00 - Avtomatik SMS tekshirilmoqda...');

  debtors.forEach(debtor => {
    const daysLeft = -getDaysOverdue(debtor.returnDate);

    // 1 kun qolganda SMS yuborish
    if (daysLeft === 1) {
      const lastSmsDate = localStorage.getItem(`last_auto_sms_${debtor.id}`);

      if (lastSmsDate !== todayStr) {
        sendAutoSms(debtor);
      }
    }

    // Muddati o'tgan bo'lsa (har 3 kunda)
    if (daysLeft < 0 && Math.abs(daysLeft) % 3 === 0) {
      const lastOverdueSms = localStorage.getItem(`last_overdue_sms_${debtor.id}`);

      if (lastOverdueSms !== todayStr) {
        sendOverdueSms(debtor, Math.abs(daysLeft));
      }
    }
  });

  renderDebtors();
  renderSmsHistory();
}

/* ===============================================
   ✅ VAQT TEKSHIRISH (Har 1 minutda)
=============================================== */
function startAutoSmsScheduler() {
  // Dastlab tekshirish
  checkAndSendAutoSms();

  // Har 1 minutda tekshirish
  setInterval(() => {
    checkAndSendAutoSms();
  }, 60000); // 60 sekund = 1 minut

  console.log('✅ Avtomatik SMS tizimi ishga tushdi (08:00 da yuborish)');
}

// 🔒 RESPONSIVE TD SAFETY FIX (FILTERLAR UCHUN)
if (window.innerWidth <= 767) {
  document.querySelectorAll('#debtorTableBody td').forEach(td => {
    const content = td.firstElementChild;
    if (content) {
      content.style.flex = '1';
      content.style.minWidth = '0';
    }
  });
}

function renderDebtors() {
  const tbody = document.getElementById('debtorTableBody');
  if (!tbody) return;

  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || "";

  let filtered = debtors.filter(d => {
    const matchSearch =
      (d.name || "").toLowerCase().includes(searchTerm) ||
      (d.phone || "").includes(searchTerm);
    if (currentFilter === 'all') return matchSearch;
    const status = getStatus(d.returnDate);
    return matchSearch && status.class === currentFilter;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:2rem; color:#94a3b8;">
          <div style="font-size:3rem; margin-bottom:1rem;">📭</div>
          <div style="font-size:1.1rem; font-weight:600; margin-bottom:0.5rem;">Qarzdor topilmadi</div>
          <div style="font-size:0.9rem;">Yangi qarzdor qo'shish uchun yuqoridagi tugmani bosing</div>
        </td>
      </tr>
    `;
    if (typeof renderOverdueCards === "function") renderOverdueCards();
    return;
  }

  tbody.innerHTML = filtered.map(d => {
    const status = getStatus(d.returnDate);
    const daysLeft = -getDaysOverdue(d.returnDate);
    const daysOverdue = getDaysOverdue(d.returnDate);

    let overdueText = daysOverdue > 0 ? `${daysOverdue} kun kechikdi` :
      daysOverdue === 0 ? 'Bugun' : `${Math.abs(daysOverdue)} kun qoldi`;

    const today = getToday();
    const lastAutoSms = localStorage.getItem(`last_auto_sms_${d.id}`);
    const lastOverdueSms = localStorage.getItem(`last_overdue_sms_${d.id}`);
    const lastManualSms = localStorage.getItem(`last_sms_${d.id}`);

    // ✅ PROFESSIONAL SMS STATUS BADGES
    let smsBadge = '';

    if (lastManualSms === today) {
      smsBadge = `
        <div class="sms-status-badge sms-sent">
          <i class="bi bi-check-circle-fill"></i>
          <span>Bugun qo'lda SMS yuborilgan</span>
        </div>
      `;
    } else if (lastAutoSms === today) {
      smsBadge = `
        <div class="sms-status-badge sms-sent">
          <i class="bi bi-robot"></i>
          <span>Bugun avtomatik eslatma yuborilgan</span>
        </div>
      `;
    } else if (lastOverdueSms === today) {
      smsBadge = `
        <div class="sms-status-badge sms-sent sms-overdue">
          <i class="bi bi-exclamation-triangle-fill"></i>
          <span>Bugun muddati o'tgan eslatma yuborilgan</span>
        </div>
      `;
    } else if (daysLeft === 1) {
      smsBadge = `
        <div class="sms-status-badge sms-pending">
          <i class="bi bi-clock-fill"></i>
          <span>Ertaga avtomatik SMS yuboriladi</span>
        </div>
      `;
    } else if (daysOverdue > 0 && daysOverdue % 3 === 0) {
      smsBadge = `
        <div class="sms-status-badge sms-pending sms-overdue">
          <i class="bi bi-bell-fill"></i>
          <span>Bugun eslatma yuboriladi</span>
        </div>
      `;
    } else {
      smsBadge = `
        <div class="sms-status-badge sms-no-action">
          <i class="bi bi-dash-circle"></i>
          <span>SMS yuborilmagan</span>
        </div>
      `;
    }

    return `
      <tr>
        <td data-label="Ism">
          <div style="display:flex; flex-direction:column; gap:8px;">
            <strong style="font-size:1.05rem; color:#1e293b;text-transform: capitalize;">${d.name}</strong>
            ${smsBadge}
          </div>
        </td>
        <td data-label="Telefon">
          <a href="tel:${d.phone}" style="color:#3b82f6; text-decoration:none; font-weight:500;">
            <i class="bi bi-telephone"></i> ${d.phone}
          </a>
        </td>
        <td data-label="Qarz">
          <strong style="font-size:1.1rem; color:#dc2626;">${d.amount.toLocaleString()} so'm</strong>
        </td>
        <td data-label="Qaytarish sanasi">
          <div style="display:flex; flex-direction:column;font-size:0.9rem; gap:4px;">
            <strong>${formatDate(d.returnDate)}</strong>
            <span class="status-badge ${status.class}">${overdueText}</span>
          </div>
        </td>
        <td data-label="Holat">
          <span class="status-badge-large ${status.class}">${status.text}</span>
        </td>
        <td data-label="Amallar">
          <div class="action-buttons-grid">
            <button class="action-btn action-btn-call" onclick="contactDebtor(${d.id})" title="Qo'ng'iroq qilish">
              <i class="bi bi-telephone-fill"></i>
            </button>
            <button class="action-btn action-btn-sms" onclick="openSmsModal(${d.id})" title="SMS yuborish">
              <i class="bi bi-chat-dots-fill"></i>
            </button>
            <button class="action-btn action-btn-add" onclick="openAdjustModal('${d.id}', 'add')" title="Qarz qo'shish">
              <i class="bi bi-plus-circle-fill"></i>
            </button>
            <button class="action-btn action-btn-reduce" onclick="openAdjustModal('${d.id}', 'reduce')" title="To'lov qabul qilish">
              <i class="bi bi-dash-circle-fill"></i>
            </button>
            <button class="action-btn action-btn-edit" onclick="openEditDebtorModal(${d.id})" title="Tahrirlash" style="background:#f59e0b; color:#fff;">
              <i class="bi bi-pencil-fill"></i>
            </button>
            <button class="action-btn action-btn-delete" onclick="deleteDebtor('${d.id}')" title="O'chirish">
              <i class="bi bi-trash-fill"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (typeof renderOverdueCards === "function") renderOverdueCards();

}

function updateStatistics() {
  let overdueCount = 0, overdueAmount = 0;
  let upcomingCount = 0, upcomingAmount = 0;

  debtors.forEach(d => {
    const status = getStatus(d.returnDate);
    if (status.class === 'overdue') {
      overdueCount++;
      overdueAmount += Number(d.amount || 0);
    } else if (status.class === 'upcoming') {
      upcomingCount++;
      upcomingAmount += Number(d.amount || 0);
    }
  });

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const monthlyPayments = paidDebtors.filter(p => new Date(p.date) >= oneMonthAgo);
  const monthlyTotal = monthlyPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const uniqueDebtors = new Set(monthlyPayments.map(p => p.debtorName)).size;

  const overdueAmountEl = document.getElementById('overdueAmount');
  const overdueCountEl = document.getElementById('overdueCount');
  const upcomingAmountEl = document.getElementById('upcomingAmount');
  const upcomingCountEl = document.getElementById('upcomingCount');
  const totalAmountEl = document.getElementById('totalAmount');
  const totalCountEl = document.getElementById('totalCount');

  if (overdueAmountEl) overdueAmountEl.textContent = `${overdueAmount.toLocaleString()} so'm`;
  if (overdueCountEl) overdueCountEl.textContent = overdueCount;
  if (upcomingAmountEl) upcomingAmountEl.textContent = `${upcomingAmount.toLocaleString()} so'm`;
  if (upcomingCountEl) upcomingCountEl.textContent = upcomingCount;
  if (totalAmountEl) totalAmountEl.textContent = `${monthlyTotal.toLocaleString()} so'm`;
  if (totalCountEl) totalCountEl.textContent = uniqueDebtors;
}

function showSuccessMessage(message) {
  const div = document.createElement('div');
  div.className = 'success-message';
  div.innerHTML = `<i class="bi bi-check-circle"></i> ${message}`;
  document.body.appendChild(div);

  setTimeout(() => {
    div.remove();
  }, 3000);
}

// async function syncAllApiData() {
//   if (!window.crmApi) return;

//   try {
//     await apiLoadCategories();
//     await apiLoadProducts();
//     await apiLoadSales();
//     await apiLoadDebtors();
//     await loadProfileSettings();

//     if (typeof getDashboardStatistics === "function") {
//       await getDashboardStatistics();
//     }

//     renderLowStockAlerts(products);
//     renderOverdueCards();
//   } catch (error) {
//     console.error("API sync error:", error);
//   }
// }
async function syncAllApiData() {
  await detectBackendAvailability();
  await apiLoadCategories();
  await apiLoadProducts();
  await apiLoadSales();
  await apiLoadDebtors();
  await loadProfile();
  await loadAndRenderTransactions(transactionFilter);
  const lowStockProducts = await getLowStockAlerts();
  renderLowStockAlerts(lowStockProducts);
}

/* ===============================================
   ✅ SAHIFA YUKLANGANDA (INITIALIZATION)
=============================================== */
document.addEventListener("DOMContentLoaded",
  () => {
    const savedPage = localStorage.getItem("activePage") || "dashboard";
    const savedTitle = localStorage.getItem("activePageTitle") || "Dashboard";

    openPage(savedPage, savedTitle);

    // if (checkAndResetDailyIfNeeded()) {
    //   renderTransactions();
    // }

    renderCategories();
    renderProducts();
    renderSaleProducts();
    renderSales();
    // renderTransactions();
    updateDailySalesCounter();
    updateDailySalesPageCounter();
    updateTotalTransactions();
    updateMonthlyRevenueUI();
    updateProfitUI();
    updateInventoryBalanceUI();
    updateTotalDebtCounter();
    updateCharts();

    // SMS tizimi
    renderSmsHistory();
    renderDebtors();
    updateStatistics();
    bindSystemSettings();

    syncAllApiData();

    // ✅ Avtomatik SMS tizimini ishga tushirish (08:00 da)
    startAutoSmsScheduler();

    // Har daqiqada kun o'zgarganini tekshirish
    setInterval(() => {
      if (checkAndResetDailyIfNeeded()) {
        updateDailySalesCounter();
        updateDailySalesPageCounter();
        renderSales();
        // renderTransactions();
        updateTotalTransactions();
        updateMonthlyRevenueUI();
        updateProfitUI();
        updateInventoryBalanceUI();
        updateCharts();
      }
    }, 60000);

    // Event listeners
    // const debtorForm = document.getElementById('debtorForm');
    // if (debtorForm) {
    //   debtorForm.addEventListener('submit', handleSubmit);
    // }

    const adjustForm = document.getElementById('adjustDebtForm');
    if (adjustForm && !adjustForm.hasAttribute('onsubmit')) {
      adjustForm.addEventListener('submit', handleAdjustDebt);
    }

    const smsForm = document.getElementById('smsForm');
    if (smsForm && !smsForm.hasAttribute('onsubmit')) {
      smsForm.addEventListener('submit', sendSms);
    }

    const smsMessage = document.getElementById('smsMessage');
    if (smsMessage) {
      smsMessage.addEventListener('input', function () {
        const preview = document.getElementById('smsPreview');
        if (preview) {
          preview.textContent = this.value;
        }
      });
    }

    document.querySelectorAll('.filter-tabs button').forEach(button => {
      button.addEventListener('click', function () {
        document.querySelectorAll('.filter-tabs button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        renderDebtors();
      });
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        renderDebtors();
      });
    }

    const debtorPhoneInput = document.getElementById('debtorPhone');
    if (debtorPhoneInput) {
      debtorPhoneInput.addEventListener('input', function () {
        this.value = normalizeDebtPhone(this.value);
      });
    }

    const debtorModal = document.getElementById('debtorModal');
    if (debtorModal) {
      debtorModal.addEventListener('click', function (e) {
        if (e.target === this) closeModal();
      });
    }

    const smsModal = document.getElementById('smsModal');
    if (smsModal) {
      smsModal.addEventListener('click', function (e) {
        if (e.target === this) closeSmsModal();
      });
    }

    const adjustDebtModal = document.getElementById('adjustDebtModal');
    if (adjustDebtModal) {
      adjustDebtModal.addEventListener('click', function (e) {
        if (e.target === this) closeAdjustModal();
      });
    }
  });
// ✅ FIX 5: Bu IIFE o'chirildi — DOMContentLoaded kutmay ishlardi (DOM tayyor bo'lmasdi)
// va syncAllApiData() → loadAndRenderTransactions() bilan race condition yaratardi.
// Transactions syncAllApiData() ichida to'g'ri yuklanadi.
// Kam qolgan tavarlar 
function getStockMeta(product) {
  const initial = Number(product.initialStock) || 0;
  const current = Number(product.stock) || 0;

  const percent = initial > 0
    ? Math.min(100, Math.round((current / initial) * 100))
    : 0;

  if (current <= 0) {
    return { percent: 0, status: "danger", label: "TUGAGAN" };
  }

  if (percent <= 20) {
    return { percent, status: "warning", label: "KAM QOLGAN" };
  }

  return null; // kam zaxira emas
}
// Alert cardlarni render qilish
function renderLowStockAlerts(products) {
  const container = document.getElementById("lowStockContainer");
  if (!container) return;

  container.innerHTML = "";

  products.forEach(product => {
    const meta = getStockMeta(product);
    if (!meta) return;

    container.innerHTML += `
      <div class="stock-card ${meta.status}">
        <div class="stock-card-header">
          <div>
            <div class="stock-title">${product.name}</div>
            <div class="stock-category">${product.category}</div>
          </div>
        </div>

        <div class="stock-values">
          <span>Boshlang‘ich:</span>
          <strong>${product.initialStock} ${product.unit}</strong>
        </div>

        <div class="stock-values">
          <span>Hozirgi:</span>
          <strong>${product.stock} ${product.unit}</strong>
        </div>

        <div class="progress">
          <div class="progress-bar ${meta.status}"
               style="width:${meta.percent}%"></div>
        </div>

        <div class="stock-status ${meta.status}">
          ${meta.label} — ${meta.percent}% qolgan
        </div>
      </div>
    `;
  });
}
renderLowStockAlerts(products);

// Card Debtors//

/* ===============================================
   MUDDATI O'TGAN QARZDORLAR CARDLARI (debtorTableBody dan)
=============================================== */
function renderOverdueCards() {
  const container = document.getElementById("overdueCards");
  if (!container) return;

  // debtors massividan muddati o'tganlarni filtrlash
  const overdueDebtors = debtors
    .map(d => {
      const overdueDays = getDaysOverdue(d.returnDate);
      return {
        id: d.id,
        name: d.name,
        amount: d.amount,
        overdueDays: overdueDays
      };
    })
    .filter(d => d.overdueDays > 0) // faqat muddati o'tganlar
    .sort((a, b) => b.overdueDays - a.overdueDays); // ko'p kechikkan birinchi

  // Agar muddati o'tganlar bo'lmasa
  if (overdueDebtors.length === 0) {
    container.innerHTML = `
      <div class="overdue-empty">
        <div class="overdue-empty-icon">✓</div>
        <div class="overdue-empty-text">Muddati o'tgan qarzdorlar yo'q</div>
      </div>
    `;
    return;
  }

  // Cardlarni chiqarish
  container.innerHTML = overdueDebtors.map((d, index) => {
    // Rangni aniqlash
    const urgencyClass = d.overdueDays >= 7 ? 'critical' :
      d.overdueDays >= 3 ? 'warning' : 'mild';

    return `
      <div class="overdue-card-mini ${urgencyClass}" 
           style="animation-delay: ${index * 0.05}s"
           onclick="highlightDebtor(${d.id})">
        <div class="overdue-mini-left">
          <div class="overdue-mini-name">${d.name}</div>
          <div class="overdue-mini-amount">${d.amount.toLocaleString()} so'm</div>
        </div>
        <div class="overdue-mini-right">
          <div class="overdue-mini-days ${urgencyClass}">
            ${d.overdueDays} kun
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ===============================================
   QARZDORNI JADVALDA HIGHLIGHT QILISH (bonus)
=============================================== */
function highlightDebtor(debtorId) {
  // Agar Qarzdorlar sahifasiga o'tkazish kerak bo'lsa
  openPage('debtors', 'Qarzdorlar');

  // Bir oz kutib, qarzdorni highlight qilish
  setTimeout(() => {
    const rows = document.querySelectorAll('#debtorTableBody tr');
    rows.forEach(row => {
      row.style.background = '';
    });

    // Kerakli qarzdorni topish va highlight qilish
    const targetRow = Array.from(rows).find(row => {
      return row.innerHTML.includes(`onclick="contactDebtor(${debtorId})"`);
    });

    if (targetRow) {
      targetRow.style.background = '#fef2f2';
      targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });

      setTimeout(() => {
        targetRow.style.background = '';
      }, 3000);
    }
  }, 300);
}
document.addEventListener("DOMContentLoaded", () => {

  renderDebtors();
  updateStatistics(); // bu avtomatik renderOverdueCards() ni chaqiradi
  renderOverdueCards();

});


//---------------------------------------- Admin Profile ----------------------------------------//
// Tab Switching
function switchTab(tabName, tabEl) {
  // Hide all content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });

  // Remove active class from all tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });

  // Show selected content
  const content = document.getElementById(tabName + '-content');
  if (content) {
    content.classList.remove('hidden');
  }

  // Add active class to selected tab
  const activeTab =
    tabEl ||
    (typeof event !== 'undefined' ? event.target : null) ||
    Array.from(document.querySelectorAll('.tab')).find(tab =>
      (tab.getAttribute('onclick') || '').includes(`'${tabName}'`)
    );

  activeTab?.classList.add('active');
}

// Form Validation
function validateForm() {
  let isValid = true;
  const errors = {};

  // Full Name
  const fullName = document.getElementById('fullName').value.trim();
  if (!fullName) {
    errors.fullName = "To'liq ism kiritish majburiy";
    isValid = false;
  }

  // Email
  const email = document.getElementById('email').value.trim();
  if (!email) {
    errors.email = "E-pochta manzili kiritish majburiy";
    isValid = false;
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.email = "Noto'g'ri e-pochta manzili";
    isValid = false;
  }

  // Phone
  const phone = document.getElementById('phone').value.trim();
  if (!phone) {
    errors.phone = "Telefon raqami kiritish majburiy";
    isValid = false;
  }

  // Company
  const company = document.getElementById('company').value.trim();
  if (!company) {
    errors.company = "Kompaniya nomi kiritish majburiy";
    isValid = false;
  }

  // Display errors
  ['fullName', 'email', 'phone', 'company'].forEach(field => {
    const errorElement = document.getElementById(field + 'Error');
    const inputElement = document.getElementById(field);

    if (errors[field]) {
      errorElement.textContent = errors[field];
      errorElement.classList.remove('hidden');
      inputElement.classList.add('error');
    } else {
      errorElement.classList.add('hidden');
      inputElement.classList.remove('error');
    }
  });

  return isValid;
}

function mapDepartmentToApi(value) {
  const map = {
    savdo: "Savdo",
    it: "IT",
    moliya: "Moliya",
    marketing: "Marketing"
  };
  return map[String(value || "").toLowerCase()] || null;
}

function mapDepartmentFromApi(value) {
  const map = {
    Savdo: "savdo",
    IT: "it",
    Moliya: "moliya",
    Marketing: "marketing"
  };
  return map[value] || "boshqaruv";
}

// async function loadProfileSettings() {
//   if (!window.crmApi) return;

//   try {
//     const response = await window.crmApi.get("/api/v1/settings/profile");
//     const user = response.data;

//     const fullNameEl = document.getElementById("fullName");
//     const emailEl = document.getElementById("email");
//     const phoneEl = document.getElementById("phone");
//     const companyEl = document.getElementById("company");
//     const departmentEl = document.getElementById("department");

//     if (fullNameEl) fullNameEl.value = user.full_name || "";
//     if (emailEl) emailEl.value = user.email || "";
//     if (phoneEl) phoneEl.value = user.phone || "";
//     if (companyEl) companyEl.value = user.company_name || "";
//     if (departmentEl) departmentEl.value = mapDepartmentFromApi(user.department);

//     const settingToggles = document.querySelectorAll("#settings-content .toggle-switch input");
//     if (settingToggles[0]) settingToggles[0].checked = user.email_notifications !== false;
//     if (settingToggles[1]) settingToggles[1].checked = !!user.dark_mode;

//     if (window.AuthSystem && typeof window.AuthSystem.updateCurrentUserData === "function") {
//       window.AuthSystem.updateCurrentUserData(user);
//     }

//     window.dispatchEvent(new CustomEvent("profileUpdated", {
//       detail: {
//         fullName: user.full_name,
//         email: user.email,
//         phone: user.phone,
//         company: user.company_name,
//         department: user.department || user.role,
//         avatar: user.avatar_url
//       }
//     }));
//   } catch (error) {
//     console.error("Profile load error:", error);
//   }
// }
async function loadProfile() {
  try {
    const res = await window.crmApi.get("/store/profile/get");
    const p = res.data;

    const mapped = {
      fullName: p.ceo_name || "",
      phone: p.ceo_phone || "",
      company: p.store_name || "",
      avatarUrl: p.profile_picture || ""
    };

    if (window.CRMTopbar) {
      window.CRMTopbar.updateProfile({
        full_name: mapped.fullName,
        phone: mapped.phone,
        company_name: mapped.company,
        avatar_url: mapped.avatarUrl
      });
    }

    if (window.AuthSystem) window.AuthSystem.updateCurrentUserData(mapped);

    return mapped;
  } catch (error) {
    console.error("❌ Profil yuklashda xatolik:", error);
    return null;
  }
}

function bindSystemSettings() {
  const settingToggles = document.querySelectorAll("#settings-content .toggle-switch input");
  const emailToggle = settingToggles[0];
  const darkToggle = settingToggles[1];

  if (!emailToggle || !darkToggle || emailToggle.dataset.apiBound === "true") return;

  emailToggle.dataset.apiBound = "true";
  darkToggle.dataset.apiBound = "true";

  async function saveSystemSettings() {
    try {
      await window.crmApi.put("/api/v1/settings/system", {
        email_notifications: emailToggle.checked,
        dark_mode: darkToggle.checked
      });
      showNotification("Sozlamalar saqlandi!", "success");
    } catch (error) {
      console.error(error);
      showNotification(getApiErrorMessage(error, "Sozlamalarni saqlashda xatolik yuz berdi"), "error");
      loadProfileSettings();
    }
  }

  emailToggle.addEventListener("change", saveSystemSettings);
  darkToggle.addEventListener("change", saveSystemSettings);
}

// Save Changes
async function saveChanges() {
  if (validateForm()) {
    const data = {
      fullName: document.getElementById("fullName").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      company: document.getElementById("company").value.trim(),
      department: document.getElementById("department").value
    };

    try {
      // BUG FIX: /api/v1/settings/profile mavjud emas (backendda bunday
      // endpoint yo'q — natijada baseURL bilan qo'shilganda 404 qaytardi).
      // Haqiqiy, backend routes.js'da tasdiqlangan endpoint:
      //   POST /store/profile/update  body: { ceo_name, store_name, profile_picture }
      // Backend Store modeli faqat shu uch maydonni saqlaydi — email/phone/department
      // uchun ustunlar mavjud emas, shuning uchun ular hamon faqat localStorage'da
      // (UI cache sifatida) saqlanadi, lekin bu ular backend ma'lumotining o'rnini
      // bosadi degani emas: ceo_name va store_name endi haqiqatan backendga yoziladi.
      const existingUser = (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === "function")
        ? (window.AuthSystem.getCurrentUser() || {})
        : {};

      const result = await window.AuthSystem.updateStoreProfile({
        ceo_name: data.fullName,
        store_name: data.company,
        profile_picture: existingUser.profile_picture || null
      });
      // const result = await window.AuthSystem.updateStoreProfile({
      //   ceo_name: data.fullName,
      //   store_name: data.company,
      //   profile_picture: existingUser.profile_picture || existingUser.avatar_url || null
      // });

      if (!result || !result.success) {
        showNotification(result?.backendMessage || result?.message || "Profilni saqlashda xatolik yuz berdi", "error");
        return;
      }

      const store = result.data?.data || result.data;
      localStorage.setItem("profile_data", JSON.stringify(data));

      if (window.AuthSystem && typeof window.AuthSystem.updateCurrentUserData === "function") {
        window.AuthSystem.updateCurrentUserData({
          full_name: store.ceo_name,
          company_name: store.store_name,
          avatar_url: store.profile_picture,
          // Backend qo'llab-quvvatlamaydigan maydonlar — faqat local cache:
          email: data.email,
          phone: data.phone,
          department: data.department
        });
      }

      window.dispatchEvent(new CustomEvent("profileUpdated", {
        detail: {
          fullName: store.ceo_name || data.fullName,
          email: data.email,
          phone: data.phone,
          company: store.store_name || data.company,
          department: data.department,
          avatar: store.profile_picture || null
        }
      }));

      showNotification("O'zgarishlar muvaffaqiyatli saqlandi!", "success");
    } catch (error) {
      console.error(error);
      showNotification(getApiErrorMessage(error, "Profilni saqlashda xatolik yuz berdi"), "error");
    }
  } else {
    showNotification("Qaytarib bo'lmaydigan xatolar!", "error");
  }
}

// ✅ FIX 4: showNotification ikkinchi versiyasi (statik element) birinchisini
// override qilib barcha sahifalarda null.className → TypeError crash berardi.
// Yagona universal versiya: statik element bo'lsa ishlatadi, yo'qsa dinamik yaratadi.
function showNotification(message, type) {
  type = type || "info";
  var notification = document.getElementById("notification");
  var notificationText = document.getElementById("notificationText");

  if (notification && notificationText) {
    notification.className = "notification show " + type;
    notificationText.textContent = message;
    setTimeout(function() { notification.classList.remove("show"); }, 3000);
    return;
  }

  if (!notification) {
    notification = document.createElement("div");
    notification.id = "notification";
    notification.style.cssText = "position:fixed;top:20px;right:20px;padding:15px 20px;" +
      "border-radius:8px;color:white;font-weight:500;z-index:9999;" +
      "box-shadow:0 4px 12px rgba(0,0,0,0.15);";
    document.body.appendChild(notification);
  }
  var colors = {success:"#22c55e",error:"#ef4444",warning:"#f59e0b",info:"#3b82f6"};
  notification.style.background = colors[type] || colors.info;
  notification.innerText = message;
  notification.style.display = "block";
  setTimeout(function() { notification.style.display = "none"; }, 3000);
}

// Clear errors on input
document.querySelectorAll('.form-input, .form-select').forEach(input => {
  input.addEventListener('input', function () {
    const errorElement = document.getElementById(this.id + 'Error');
    if (errorElement) {
      errorElement.classList.add('hidden');
      this.classList.remove('error');
    }
  });
});

// Profile avatar
const avatarInput = document.getElementById("avatarInput");
const avatarImg = document.getElementById("profileAvatar");
const avatarFallback = document.getElementById("avatarFallback");

// Fayl tanlashni ochish
function triggerAvatarUpload() {
  if (avatarInput) {
    avatarInput.click();
  }
}

// Yuklash
if (avatarInput && avatarImg && avatarFallback) {
  avatarInput.addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;

    // 🔒 Format tekshirish
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      alert("Faqat JPG, PNG yoki GIF ruxsat etiladi!");
      return;
    }

    // 🔒 Hajm tekshirish (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Rasm hajmi 2MB dan oshmasligi kerak!");
      return;
    }

    try {
      // BUG FIX: /api/v1/settings/profile/avatar backendda mavjud emas (404).
      // Backendda alohida avatar-upload endpointi yo'q — haqiqiy flow ikki
      // bosqichli: 1) POST /file/create orqali faylni yuklab URL olish
      // (xuddi mahsulot rasmi yuklashda ishlatilgan, tasdiqlangan yo'l bilan
      // bir xil), 2) shu URLni POST /store/profile/update orqali
      // profile_picture sifatida saqlash.
      const fileForm = new FormData();
      fileForm.append("file", file);

      const fileRes = await window.crmApi.post("/file/create", fileForm, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const uploadedUrl = fileRes?.data?.file?.file_url || null;

      if (!uploadedUrl) {
        alert("Rasm yuklanmadi. Qaytadan urinib ko'ring.");
        return;
      }

      const existingUser = (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === "function")
        ? (window.AuthSystem.getCurrentUser() || {})
        : {};

      const result = await window.AuthSystem.updateStoreProfile({
        ceo_name: data.fullName,
        store_name: data.company,
        profile_picture: existingUser.profile_picture || null
      });

      if (!result || !result.success) {
        alert(result?.backendMessage || result?.message || "Avatarni saqlashda xatolik yuz berdi");
        return;
      }

      const store = result.data?.data || result.data;
      const avatarUrl = normalizeApiAssetUrl(store.profile_picture || uploadedUrl);

      // UI
      avatarImg.src = avatarUrl;
      avatarImg.classList.remove("d-none");
      avatarFallback.style.display = "none";

      localStorage.setItem("profile_avatar", avatarUrl);

      if (window.AuthSystem && typeof window.AuthSystem.updateCurrentUserData === "function") {
        window.AuthSystem.updateCurrentUserData({ avatar_url: store.profile_picture });
      }

      window.dispatchEvent(
        new CustomEvent("profileUpdated", {
          detail: {
            avatar: store.profile_picture
          }
        })
      );

      showNotification("Avatar muvaffaqiyatli yangilandi!", "success");
    } catch (error) {
      console.error(error);
      alert(getApiErrorMessage(error, "Avatarni yuklashda xatolik yuz berdi"));
    }
  });
}

// Sahifa ochilganda avatarni yuklash
(function loadAvatarOnStart() {
  const savedAvatar = localStorage.getItem("profile_avatar");
  if (savedAvatar && avatarImg && avatarFallback) {
    avatarImg.src = savedAvatar;
    avatarImg.classList.remove("d-none");
    avatarFallback.style.display = "none";
  }
})();
/**
         * Professional Navigation System
         * Sahifalar orasida o'tish uchun markazlashgan tizim
         */
var NavigationManager = {
  // Konfiguratsiya - bu yerda sahifalar yo'llarini belgilang
  routes: {
    profile: '/profile.html',           // yoki '#profile' hash routing uchun
    settings: '/settings.html',         // yoki '#settings'
    notifications: '/notifications.html', // yoki '#notifications'
    help: '/help.html',                 // yoki '#help'
    dashboard: '/dashboard.html'        // yoki '#dashboard'
  },

  // Navigatsiya metodi
  navigateTo: function (page) {
    const sectionId = page === 'profile' ? 'settings' : page;
    const section = document.getElementById(sectionId);

    if (section && typeof openPage === "function") {
      openPage(sectionId, this.getPageTitle(page));
      return;
    }

    if (this.routes[page]) {
      window.location.href = this.routes[page].replace(/^\//, '');
    }

    console.log('Navigating to:', page);
  },

  // Sahifa holatini o'zgartirish (SPA uchun)
  changePageState: function (page) {
    // Bu yerda sahifa content'ini o'zgartirishingiz mumkin
    var titleEl = document.getElementById('pageTitle');
    if (titleEl) {
      titleEl.textContent = this.getPageTitle(page);
    }

    // Sahifa ko'rinishini o'zgartirish
    document.querySelectorAll('.section').forEach(function (section) {
      section.style.display = 'none';
    });

    var targetSection = document.getElementById(page);
    if (targetSection) {
      targetSection.style.display = 'block';
    }
  },

  // Sahifa sarlavhasini olish
  getPageTitle: function (page) {
    var titles = {
      profile: 'Shaxsiy Profil',
      settings: 'Sozlamalar',
      notifications: 'Bildirishnomalar',
      help: 'Yordam',
      dashboard: 'Dashboard'
    };
    return titles[page] || 'Dashboard';
  },

  init: function () {
    var self = this;

    // Barcha dropdown itemlarga listener qo'shish
    document.querySelectorAll('[data-page]').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        var page = this.getAttribute('data-page');
        self.navigateTo(page);

        // Dropdown'ni yopish
        ProfileDropdownManager.close();
      });
    });
  }
};

/**
 * Profile Dropdown Manager
 * Dropdown ochish/yopish va animatsiyalarni boshqarish
 */
var ProfileDropdownManager = {

  trigger: null,
  dropdown: null,
  overlay: null,

  init: function () {
    this.trigger = document.getElementById('profileTrigger');
    this.dropdown = document.getElementById('profileDropdown');
    this.overlay = document.getElementById('dropdownOverlay');

    if (!this.trigger || !this.dropdown || !this.overlay) {
      return;
    }

    if (this.trigger.dataset.dropdownBound === "true") {
      return;
    }

    this.trigger.dataset.dropdownBound = "true";

    this.attachEventListeners();
  },

  attachEventListeners: function () {
    var self = this;

    // Toggle dropdown
    this.trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      self.toggle();
    });

    // Close on overlay click
    this.overlay.addEventListener('click', function () {
      self.close();
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!self.trigger.contains(e.target) && !self.dropdown.contains(e.target)) {
        self.close();
      }
    });

    // Close on ESC key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        self.close();
      }
    });
  },

  toggle: function () {
    if (this.dropdown.classList.contains('show')) {
      this.close();
    } else {
      this.open();
    }
  },

  open: function () {
    this.trigger.classList.add('active');
    this.dropdown.classList.add('show');
    this.overlay.classList.add('show');
  },

  close: function () {
    this.trigger.classList.remove('active');
    this.dropdown.classList.remove('show');
    this.overlay.classList.remove('show');
  }

};

/**
 * Statistics Manager
 * Statistika ma'lumotlarini boshqarish
 */
var StatisticsManager = {
  init: function () {
    this.updateTodayDate();
    this.startRealTimeClock();
  },

  // Bugungi sanani yangilash
  updateTodayDate: function () {
    var months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    var days = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];

    var now = new Date();
    var dayName = days[now.getDay()];
    var day = now.getDate();
    var month = months[now.getMonth()];

    var todayLabel = dayName + ', ' + day + ' ' + month;
    var el = document.getElementById('todayLabel');
    if (el) el.textContent = todayLabel;
  },

  // Real vaqt (har daqiqada yangilanadi)
  startRealTimeClock: function () {
    var self = this;
    this.updateTodayDate();

    // Har daqiqada yangilanadi
    setInterval(function () {
      self.updateTodayDate();
    }, 60000);
  },

  // ✅ FIX: Mijozlar/bitimlar demo-hisoblagichi (156/89) butunlay olib tashlandi —
  // bu haqiqiy backend ma'lumoti emas, statik demo raqam edi. UI dan ham,
  // localStorage dan ham chiqarildi. Quyidagi metodlar faqat window.CRMTopbar
  // orqali tashqaridan chaqirilsa xatolik bermasligi uchun bo'sh qoldirilgan:
  loadStats: function () {},
  resetTodayActions: function () {},
  incrementAction: function () {}
};

var TopbarProfileManager = {

  init: async function () {

    console.log("🚀 Initializing Topbar Profile Manager")

    await this.loadUserFromAPI()

    this.listenForUpdates()

  },

  // BACKENDDAN USER OLISH
  loadUserFromAPI: async function () {

    try {

      const Auth = window.AuthSystem
      const user =
        Auth && typeof Auth.getCurrentUser === "function"
          ? Auth.getCurrentUser()
          : null

      if (!user) {
        console.log("❌ User topilmadi")
        return
      }

      console.log("✅ API USER:", user)

      // BACKEND → FRONTEND MAPPING
      const mappedData = {
        fullName: user.full_name || user.fullName || user.ceo_name || "",
        email: user.email || "",
        phone: user.phone || user.ceo_phone || "",
        company: user.company_name || user.company || user.store_name || "",
        department: this.mapRole(user.role),
        avatar: user.avatar || user.avatar_url || user.profile_picture || ""
      };

      this.updateAllUI(mappedData)

    } catch (error) {

      console.error(
        "❌ Profile API Error:",
        error
      )

    }

  },

  // ROLE TRANSLATE
  mapRole: function (role) {

    const roleMap = {

      admin: "Boshqaruv",
      manager: "Manager",
      seller: "Sotuvchi"

    }

    return roleMap[role] || role

  },

  // UI UPDATE
  updateAllUI: function (data) {

    console.log(
      "🎨 Updating UI:",
      data
    )

    // FULL NAME
    if (data.fullName) {

      this.setText(
        'profileName',
        data.fullName
      )

      this.setText(
        'dropdownName',
        data.fullName
      )

      const initials =
        this.getInitials(data.fullName)

      this.setText(
        'topbarAvatarFallback',
        initials
      )

      this.setText(
        'dropdownAvatarFallback',
        initials
      )

    }

    // EMAIL
    if (data.email) {

      this.setText(
        'dropdownEmail',
        data.email
      )

    }

    // PHONE
    if (data.phone) {

      this.setText(
        'dropdownPhone',
        data.phone
      )

    }

    // COMPANY
    if (data.company) {

      this.setText(
        'profileEmail',
        data.company
      )

    }

    // ROLE
    if (data.department) {

      this.setText(
        'dropdownRole',
        data.department
      )

    }

    // AVATAR
    if (data.avatar) {

      this.updateAvatar(data.avatar)

    }

  },

  // TEXT SETTER
  setText: function (id, value) {

    const el =
      document.getElementById(id)

    if (el) {

      el.textContent = value

    }

  },

  // AVATAR UPDATE
  updateAvatar: function (avatarUrl) {

    const elements = [

      {
        img: document.getElementById("topbarAvatar"),
        fallback: document.getElementById("topbarAvatarFallback")
      },

      {
        img: document.getElementById("dropdownAvatar"),
        fallback: document.getElementById("dropdownAvatarFallback")
      }

    ];

    elements.forEach(function (el) {

      if (!el.img || !el.fallback) return;

      if (avatarUrl) {

        el.img.src = normalizeApiAssetUrl(avatarUrl);

        el.img.classList.add("show");

        el.fallback.style.display = "none";

      } else {

        el.img.classList.remove("show");

        el.fallback.style.display = "flex";

      }

    });
    // ✅ FIX 1: forEach dan keyin el mavjud emas (scope tugaydi).
    // el.img.src = ... qatorlari ReferenceError berardi → avatar ko'rinmasdi.
    console.log("━━━ Avatar updated:", normalizeApiAssetUrl(avatarUrl));

  },

  // INITIALS
  getInitials: function (name) {

    if (!name || typeof name !== "string") {
      return "AU"
    }

    var parts = name.trim().split(" ")

    if (parts.length === 1) {

      return parts[0]
        .substring(0, 2)
        .toUpperCase()

    }

    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase()

  },

  // REALTIME UPDATE
  listenForUpdates: function () {

    const self = this

    window.addEventListener(
      'profileUpdated',

      function (e) {

        console.log(
          "🔄 Profile Updated Event:",
          e.detail
        )

        self.updateAllUI(e.detail)

      }

    )

  }

}

/**
 * Logout Manager
 * Tizimdan chiqish jarayonini boshqarish
 */
var LogoutManager = {
  init: function () {
    var logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn || logoutBtn.dataset.logoutBound === "true") {
      return;
    }

    logoutBtn.dataset.logoutBound = "true";

    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      LogoutManager.logout();
    });
  },

  logout: function () {
    if (confirm('Haqiqatan ham tizimdan chiqmoqchimisiz?')) {
      if (window.AuthSystem && typeof window.AuthSystem.logout === "function") {
        window.AuthSystem.logout();
        return;
      }

      // Ma'lumotlarni tozalash
      this.clearUserData();

      // Login sahifasiga yo'naltirish
      this.redirectToLogin();
    }
  },

  clearUserData: function () {
    // MUHIM: Faqat foydalanuvchi ma'lumotlarini tozalang
    // Tizim sozlamalarini saqlab qoling
    var keysToRemove = [
      // 'profile_data',
      // 'profile_avatar',
      // 'auth_token',
      // 'user_session',
      // 'crm_current_user',
      // 'crm_session_active',
      // 'currentUser',
      // 'isLoggedIn',
      // 'crm_today_actions',
      // 'crm_last_update_date'
    ];

    keysToRemove.forEach(function (key) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // Yoki barcha ma'lumotlarni tozalash
    // localStorage.clear();
  },

  redirectToLogin: function () {
    // Login sahifasiga yo'naltirish
    window.location.href = 'login.html';

    // Yoki hash routing uchun:
    // window.location.hash = 'login';

    // Yoki SPA uchun:
    // var event = new CustomEvent('navigate', { detail: { page: 'login' } });
    // window.dispatchEvent(event);
  }
};

/**
 * Application Initialization
 * Barcha modullarni ishga tushirish
 */
function initializeApp() {
  console.log('Initializing CRM Topbar Application...');

  // 1. Navigation tizimini ishga tushirish
  NavigationManager.init();

  // 2. Profile dropdown'ni sozlash
  ProfileDropdownManager.init();

  // 3. Profil ma'lumotlarini yuklash
  TopbarProfileManager.init();

  // 4. Statistika tizimini ishga tushirish
  StatisticsManager.init();

  // 5. Logout funksiyasini ulash
  LogoutManager.init();

  // 6. Dashboard statistikalarini API orqali yuklash
  if (typeof DashboardStatisticsManager !== 'undefined') {
    DashboardStatisticsManager.init();
  }

  console.log('Application initialized successfully!');
}

// DOM yuklanganida ishga tushirish
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

/**
 * Global API - Boshqa sahifalardan foydalanish uchun
 * 
 * Misol:
 * CRMTopbar.updateProfile({ fullName: 'Yangi Ism' });
 * CRMTopbar.incrementTodayActions();
 * CRMTopbar.navigate('profile');
 */
window.CRMTopbar = {
  // Profilni yangilash
  updateProfile: function (data) {
    data = data || {};

    // TopbarProfileManager.updateAllUI({
    //   fullName: data.full_name || data.fullName || "",
    //   email: data.email || "",
    //   phone: data.phone || "",
    //   company: data.company_name || data.company || data.storeName || "",
    //   department: data.department || data.role || "",
    //   avatar: data.avatar_url || data.avatar || ""
    // });
    // ✅ FIX 2: data.profile.xxx → TypeError edi. Callerlar to'g'ridan-to'g'ri
    // backend user objectini beradi ({full_name, email, ...}), data.profile yo'q.
    TopbarProfileManager.updateAllUI({
      fullName: data.full_name || data.fullName || "",
      email: data.email || "",
      phone: data.phone || "",
      company: data.company_name || data.company || data.storeName || "",
      department: data.department || data.role || "",
      avatar: data.avatar_url || data.avatar || ""
    });
  },

  // Bugungi harakatlarni oshirish
  incrementTodayActions: function () {
    StatisticsManager.incrementAction();
  },

  // Sahifaga o'tish
  navigate: function (page) {
    NavigationManager.navigateTo(page);
  },

  // Dropdown'ni ochish/yopish
  toggleDropdown: function () {
    ProfileDropdownManager.toggle();
  },

  // Statistikani yangilash
  updateStats: function (data) {
    var stats = localStorage.getItem('crm_statistics');
    var current = stats ? JSON.parse(stats) : {};
    localStorage.setItem('crm_statistics', JSON.stringify(Object.assign(current, data)));
    StatisticsManager.loadStats();
  }
};

// ----------------------------------------------------------------------------------------

// document.addEventListener("DOMContentLoaded", () => {
//   const currentUser = JSON.parse(localStorage.getItem("currentUser"));

//   if (!currentUser) {
//     window.location.href = "login.html";
//     return;
//   }

//   // Profil dropdownni to‘ldiramiz
//   initProfile(currentUser);
// });


// profilga chiqarish
function initProfile(user) {
  if (!user) return;

  const displayName = user.fullName || user.fullname || "";
  const fallback = document.getElementById("dropdownAvatarFallback");
  const name = document.getElementById("dropdownName");
  const email = document.getElementById("dropdownEmail");

  if (fallback) fallback.innerText = getInitials(displayName);
  if (name) name.innerText = displayName;
  if (email) email.innerText = user.email || "";
}

// MOBILE BOTTOM NAV CONTROL (WITH STATE SAVE)
const MOBILE_PAGE_KEY = 'activeMobileSection';

document.querySelectorAll('.mobile-bottom-nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    if (!target) return;

    // Sections
    document.querySelectorAll('.section').forEach(s =>
      s.classList.remove('active')
    );
    document.getElementById(target)?.classList.add('active');

    // Nav buttons
    document.querySelectorAll('.mobile-bottom-nav button').forEach(b =>
      b.classList.remove('active')
    );
    btn.classList.add('active');

    // Title
    const title = btn.querySelector('span')?.innerText;
    if (title) {
      document.getElementById('pageTitle').innerText = title;
    }

    // 💾 SAVE STATE
    localStorage.setItem(MOBILE_PAGE_KEY, target);
  });
});

// 🔁 RESTORE ACTIVE PAGE ON LOAD (MOBILE ONLY)
document.addEventListener('DOMContentLoaded', () => {
  // faqat mobile uchun
  if (window.innerWidth > 991) return;

  const savedSection = localStorage.getItem(MOBILE_PAGE_KEY);
  if (!savedSection) return;

  const sectionEl = document.getElementById(savedSection);
  const navBtn = document.querySelector(
    `.mobile-bottom-nav button[data-target="${savedSection}"]`
  );

  if (sectionEl && navBtn) {
    // Sections
    document.querySelectorAll('.section').forEach(s =>
      s.classList.remove('active')
    );
    sectionEl.classList.add('active');

    // Nav buttons
    document.querySelectorAll('.mobile-bottom-nav button').forEach(b =>
      b.classList.remove('active')
    );
    navBtn.classList.add('active');

    // Title
    const title = navBtn.querySelector('span')?.innerText;
    if (title) {
      document.getElementById('pageTitle').innerText = title;
    }
  }
});


// ===== RESPONSIVE TABLE FIX (AUTO DATA-LABEL) =====
// ✅ Bu funksiya endi faqat boshqa jadvallar uchun kerak
// Transactions jadvali uchun data-label to'g'ridan-to'g'ri HTML da qo'shiladi
function applyResponsiveTables() {
  document.querySelectorAll("table:not(#transactionsTable, #productTable)").forEach(table => {
    const headers = Array.from(table.querySelectorAll("thead th"))
      .map(th => th.innerText.trim());

    table.querySelectorAll("tbody tr").forEach(tr => {
      Array.from(tr.children).forEach((td, i) => {
        if (!td.getAttribute("data-label") && headers[i]) {
          td.setAttribute("data-label", headers[i]);
        }
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", applyResponsiveTables);

// ===== SAFE RESPONSIVE TABLE WRAPPER =====
document.querySelectorAll("table").forEach(table => {
  if (!table.parentElement.classList.contains("table-responsive-safe")) {
    const wrapper = document.createElement("div");
    wrapper.className = "table-responsive-safe";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  }
});

// /////////////////////////////////////////////////////////////////
/* ========== AUTHENTICATION & STORAGE ========== */

// Foydalanuvchi ma'lumotlarini olish
function getUserData() {
  const Auth = window.AuthSystem;

  if (Auth && typeof Auth.getCurrentUser === "function") {
    return Auth.getCurrentUser();
  }

  const userData = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  console.log('Dashboard - Getting user data:', userData);

  try {
    return userData ? JSON.parse(userData) : null;
  } catch (err) {
    console.warn("Foydalanuvchi ma'lumoti o'qilmadi:", err);
    return null;
  }
}

// Foydalanuvchi ma'lumotlarini saqlash
function saveUserData(userData) {
  const Auth = window.AuthSystem;

  if (Auth && typeof Auth.updateCurrentUserData === "function") {
    Auth.updateCurrentUserData(userData);
    return;
  }

  localStorage.setItem('currentUser', JSON.stringify(userData));
  console.log('Dashboard - User data saved:', userData);
}

// Foydalanuvchini tekshirish
function checkAuth() {
  const Auth = window.AuthSystem;

  if (Auth && typeof Auth.isSessionValid === "function") {
    if (!Auth.isSessionValid()) {
      window.location.href = 'login.html';
      return false;
    }

    return true;
  }

  const isLoggedIn = localStorage.getItem('isLoggedIn') || sessionStorage.getItem('isLoggedIn');
  console.log('Dashboard - Checking auth:', isLoggedIn);

  if (!isLoggedIn) {
    console.log('Not logged in, redirecting...');
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Chiqish funksiyasi
function logout() {
  console.log('Logging out...');
  if (window.AuthSystem && typeof window.AuthSystem.logout === "function") {
    window.AuthSystem.logout();
    return;
  }

  localStorage.removeItem('currentUser');
  localStorage.removeItem('isLoggedIn');
  sessionStorage.removeItem('currentUser');
  sessionStorage.removeItem('isLoggedIn');
  window.location.href = 'login.html';
}

/* ========== PROFILE DISPLAY ========== */

// Initsialarni olish
function getInitials(fullName) {
  if (!fullName) return 'AU';
  const names = fullName.trim().split(' ');
  if (names.length >= 2) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }
  return fullName.substring(0, 2).toUpperCase();
}

// Profil ma'lumotlarini yangilash
function updateProfileDisplay() {
  console.log('Updating profile display...');

  const userData = getUserData();

  if (!userData) {
    console.error('Foydalanuvchi ma\'lumotlari topilmadi!');
    return;
  }

  console.log('User data for display:', userData);

  const initials = getInitials(userData.fullName);
  console.log('Initials:', initials);

  // Topbar profil ma'lumotlari
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const topbarAvatarFallback = document.getElementById('topbarAvatarFallback');

  console.log('Topbar elements:', {
    profileName: profileName,
    profileEmail: profileEmail,
    topbarAvatarFallback: topbarAvatarFallback
  });

  if (profileName) {
    profileName.textContent = userData.fullName;
    console.log('Set profile name:', userData.fullName);
  }
  if (profileEmail) {
    profileEmail.textContent = userData.storeName;
    console.log('Set profile email/store:', userData.storeName);
  }
  if (topbarAvatarFallback) {
    topbarAvatarFallback.textContent = initials;
    console.log('Set topbar initials:', initials);
  }

  // Dropdown profil ma'lumotlari
  const dropdownName = document.getElementById('dropdownName');
  const dropdownEmail = document.getElementById('dropdownEmail');
  const dropdownPhone = document.getElementById('dropdownPhone');
  const dropdownRole = document.getElementById('dropdownRole');
  const dropdownAvatarFallback = document.getElementById('dropdownAvatarFallback');

  console.log('Dropdown elements:', {
    dropdownName: dropdownName,
    dropdownEmail: dropdownEmail,
    dropdownPhone: dropdownPhone,
    dropdownRole: dropdownRole,
    dropdownAvatarFallback: dropdownAvatarFallback
  });

  if (dropdownName) {
    dropdownName.textContent = userData.fullName;
    console.log('Set dropdown name:', userData.fullName);
  }
  if (dropdownEmail) {
    dropdownEmail.textContent = userData.email;
    console.log('Set dropdown email:', userData.email);
  }
  if (dropdownPhone) {
    dropdownPhone.textContent = userData.phone;
    console.log('Set dropdown phone:', userData.phone);
  }
  if (dropdownRole) {
    dropdownRole.textContent = userData.role;
    console.log('Set dropdown role:', userData.role);
  }
  if (dropdownAvatarFallback) {
    dropdownAvatarFallback.textContent = initials;
    console.log('Set dropdown initials:', initials);
  }

  // Statistika ma'lumotlari
  const statCustomers = document.getElementById('statCustomers');
  const statDeals = document.getElementById('statDeals');
  const statToday = document.getElementById('statToday');

  console.log('Stats elements:', {
    statCustomers: statCustomers,
    statDeals: statDeals,
    statToday: statToday
  });

  const stats = userData.stats || { customers: 0, deals: 0, today: 0 };

  if (statCustomers) {
    statCustomers.textContent = stats.customers || 0;
    console.log('Set customers stat:', stats.customers || 0);
  }
  if (statDeals) {
    statDeals.textContent = stats.deals || 0;
    console.log('Set deals stat:', stats.deals || 0);
  }
  if (statToday) {
    statToday.textContent = stats.today || 0;
    console.log('Set today stat:', stats.today || 0);
  }

  console.log('Profile display updated successfully!');
}

// Statistikani yangilash funksiyasi
function updateUserStats(type, value) {
  const userData = getUserData();
  if (!userData) return;

  userData.stats = userData.stats || { customers: 0, deals: 0, today: 0 };

  if (Object.prototype.hasOwnProperty.call(userData.stats, type)) {
    userData.stats[type] = value;
    saveUserData(userData);
    updateProfileDisplay();
  }
}

// Increment funksiyasi
function incrementStat(type) {
  const userData = getUserData();
  if (!userData) return;

  userData.stats = userData.stats || { customers: 0, deals: 0, today: 0 };

  if (Object.prototype.hasOwnProperty.call(userData.stats, type)) {
    userData.stats[type]++;
    saveUserData(userData);
    updateProfileDisplay();
  }
}

/* ========== PROFILE DROPDOWN ========== */

function initProfileDropdown() {
  const profileTrigger = document.getElementById('profileTrigger');
  const profileDropdown = document.getElementById('profileDropdown');

  console.log('Init profile dropdown:', {
    trigger: profileTrigger,
    dropdown: profileDropdown
  });

  if (profileTrigger && profileDropdown) {
    if (profileTrigger.dataset.dropdownBound === "true") {
      return;
    }

    profileTrigger.dataset.dropdownBound = "true";

    profileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('active');
      console.log('Dropdown toggled');
    });

    // Tashqarida bosish orqali yopish
    document.addEventListener('click', (e) => {
      if (!profileTrigger.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.remove('active');
      }
    });
  }
}

/* ========== LOGOUT ========== */

function initLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  console.log('Init logout button:', logoutBtn);

  if (logoutBtn && logoutBtn.dataset.logoutBound !== "true") {
    logoutBtn.dataset.logoutBound = "true";
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Haqiqatan ham chiqmoqchimisiz?')) {
        logout();
      }
    });
  }
}

/* ========== INITIALIZATION ========== */
async function initDashboard() {

  console.log("=== Initializing Dashboard ===");

  if (!checkAuth()) {
    return;
  }

  initProfileDropdown();
  initLogout();

    console.log("=== Dashboard Initialized ===");

  // BUG FIX: categories/products/sales'ni bu yerda QAYTA yuklash olib
  // tashlandi — bu doim asosiy DOMContentLoaded blokidagi syncAllApiData()
  // bilan takrorlanardi (tartibiga qaramay), token/parallel-request
  // "401 keyin 200" holatini kuchaytirar edi. syncAllApiData() ularni
  // allaqachon yuklaydi.
  //
  // getDashboardStatistics() esa DashboardStatisticsManager.init() (boshqa,
  // alohida init oqimi) orqali ham chaqiriladi — shuning uchun FAQAT shu
  // ikkisi orasida flag bilan bitta marta ishlashini ta'minlaymiz.
  if (dashboardBootstrapped) {
    console.log("ℹ️ Dashboard statistikasi allaqachon boshqa oqim orqali yuklangan, qayta yuklanmaydi.");
    return;
  }
  dashboardBootstrapped = true;

  await getDashboardStatistics();

  // Profit va inventory local fallback bilan ham yakuniy qiymat bilan
  updateProfitUI();
  updateInventoryBalanceUI();

  console.log(
    "✅ Dashboard fully ready"
  );
}
// function initDashboard() {
//   console.log('=== Initializing Dashboard ===');

//   // Auth tekshirish
//   if (!checkAuth()) {
//     return;
//   }

//   // ✅ FIX 6: updateProfileDisplay() olib tashlandi — eski localStorage-based funksiya.
//   // initializeApp() → TopbarProfileManager.init() barcha profil UI ni boshqaradi.

//   // Dropdown va logout
//   initProfileDropdown();
//   initLogout();

//   console.log("=== Dashboard Initialized ===");

//   getDashboardStatistics();
// }

// Sahifa yuklanganda ishga tushirish
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}

// Global qilib export qilish
window.updateUserStats = updateUserStats;
window.incrementStat = incrementStat;
window.getUserData = getUserData;
window.saveUserData = saveUserData;
window.logout = logout;

// =========================================
// CHANGE PASSWORD API — VERIFIED ENDPOINT
// =========================================
async function changePassword(oldPassword, newPassword) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔐 CHANGE PASSWORD API");
  console.log("📤 REQUEST: PUT /store/password/change");

  try {
    const response = await crmApi.put(
      "/store/password/change",
      {
        old_password: oldPassword,
        new_password: newPassword
      }
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ CHANGE PASSWORD SUCCESS");
    console.log("🌐 HTTP:", response.status);
    console.log("📊 RESPONSE:", response.data);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return {
      success: true,
      status: response.status,
      data: response.data,
      message:
        response.data?.message ||
        "Parol muvaffaqiyatli o'zgartirildi."
    };

  } catch (error) {

    const status = error?.response?.status;

    const backendMessage =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.response?.data?.error;

    console.error("❌ CHANGE PASSWORD FAILED");

    console.table({
      success: false,
      status,
      url: error?.config?.url || null,
      message: backendMessage || error?.message
    });

    let message = "Parolni o'zgartirishda xatolik yuz berdi.";

    if (status === 400) {
      message =
        backendMessage ||
        "Eski parol noto'g'ri yoki yangi parol talabga javob bermaydi.";
    }

    if (status === 401) {
      message =
        "Sessiya tugagan. Qaytadan tizimga kiring.";
    }

    if (status === 404) {
      message =
        "Parol API endpointi backendda topilmadi.";
    }

    return {
      success: false,
      status,
      message
    };
  }
}
window.changePassword = changePassword;


// Change Password
// ============================================================
// 🔐 SECURITY TAB - boshqa kodlarga tegmaydi, mustaqil ishlaydi
// ============================================================
(function () {
  function initSecurityTab() {
    var changeBtn = document.getElementById("changePasswordBtn");
    var changeForm = document.getElementById("changePasswordForm");
    var saveBtn = document.getElementById("saveNewPasswordBtn");
    var cancelBtn = document.getElementById("cancelPasswordBtn");
    var oldPassInput = document.getElementById("oldPasswordInput");
    var newPassInput = document.getElementById("newPasswordInput");
    var confirmPassInput = document.getElementById("confirmPasswordInput");
    var msgEl = document.getElementById("passwordMessage");

    if (!changeBtn || !changeForm) return;

    function showMsg(text, ok) {
      if (!msgEl) return;
      msgEl.textContent = text;
      msgEl.style.display = "block";
      msgEl.style.color = ok ? "#16a34a" : "#dc2626";
    }

    function reset() {
      changeForm.style.display = "none";
      changeBtn.textContent = "Parolni yangilash";
      if (oldPassInput) oldPassInput.value = "";
      if (newPassInput) newPassInput.value = "";
      if (confirmPassInput) confirmPassInput.value = "";
      if (msgEl) { msgEl.style.display = "none"; msgEl.textContent = ""; }
    }

    changeBtn.addEventListener("click", function () {
      if (changeForm.style.display !== "none") {
        reset();
      } else {
        changeForm.style.display = "block";
        changeBtn.textContent = "Yopish";
      }
    });

    if (cancelBtn) cancelBtn.addEventListener("click", reset);

    // if (saveBtn) {
    //   saveBtn.addEventListener("click", async function () {
    //     if (msgEl) { msgEl.style.display = "none"; }

    //     var oldPass = oldPassInput ? oldPassInput.value : "";
    //     var newPass = newPassInput ? newPassInput.value : "";
    //     var confirmPass = confirmPassInput ? confirmPassInput.value : "";

    //     if (!oldPass) return showMsg("Eski parolni kiriting!", false);
    //     if (newPass.length < 6) return showMsg("Yangi parol kamida 6 ta belgi bo'lishi kerak!", false);
    //     if (newPass !== confirmPass) return showMsg("Parollar mos kelmadi!", false);

    //     var Auth = window.AuthSystem;
    //     if (!Auth || typeof Auth.changePassword !== "function") {
    //       return showMsg("Auth tizimi topilmadi!", false);
    //     }
    //     console.log("━━━━━━━━━━━━━━━━━━");
    //     console.log("🔐 CHANGE PASSWORD");
    //     console.log("📤 REQUEST");
    //     console.table({
    //       old_password: oldPass,
    //       new_password: newPass
    //     });

    //     var result = await Auth.changePassword(oldPass, newPass);

    //     console.log("━━━━━━━━━━━━━━━━━━");

    //     if (result.success) {

    //       console.log("✅ STATUS : SUCCESS");
    //       console.table(result);

    //       alert("✅ Parol muvaffaqiyatli o'zgartirildi!");

    //       showMsg("✅ Parol muvaffaqiyatli yangilandi!", true);

    //       saveBtn.disabled = true;

    //       setTimeout(function () {
    //         reset();
    //         saveBtn.disabled = false;
    //       }, 2000);

    //     } else {

    //       console.log("❌ STATUS : ERROR");
    //       console.table(result);

    //       alert("❌ " + result.message);

    //       showMsg(result.message || "Xatolik yuz berdi!", false);

    //     }
    //   });
    // }
  }

  document.addEventListener(
    "DOMContentLoaded",

    function () {

      // ELEMENTLAR
      const changeBtn =
        document.getElementById(
          "changePasswordBtn"
        )

      const form =
        document.getElementById(
          "changePasswordForm"
        )

      const saveBtn =
        document.getElementById(
          "saveNewPasswordBtn"
        )

      const cancelBtn =
        document.getElementById(
          "cancelPasswordBtn"
        )

      const message =
        document.getElementById(
          "passwordMessage"
        )

      // FORM OPEN
      if (changeBtn) {

        changeBtn.addEventListener(
          "click",

          function () {

            form.style.display =
              "block"

          }

        )

      }

      // CANCEL
      if (cancelBtn) {

        cancelBtn.addEventListener(
          "click",

          function () {

            form.style.display =
              "none"

          }

        )

      }

      // SAVE PASSWORD
      if (saveBtn) {

        saveBtn.addEventListener(
          "click",

          async function () {

            // INPUTS
            const oldPassword =
              document.getElementById(
                "oldPasswordInput"
              ).value

            const newPassword =
              document.getElementById(
                "newPasswordInput"
              ).value

            const confirmPassword =
              document.getElementById(
                "confirmPasswordInput"
              ).value

            // VALIDATION
            if (
              !oldPassword ||
              !newPassword ||
              !confirmPassword
            ) {

              showPasswordMessage(
                "Barcha maydonlarni to'ldiring",
                "red"
              )

              return

            }

            // PASSWORD CHECK
            if (
              newPassword !==
              confirmPassword
            ) {

              showPasswordMessage(
                "Yangi parollar mos emas",
                "red"
              )

              return

            }

            // LENGTH CHECK
            if (
              newPassword.length < 6
            ) {

              showPasswordMessage(
                "Parol kamida 6 ta belgi bo'lishi kerak",
                "red"
              )

              return

            }

            // API REQUEST
            const result =
              await changePassword(
                oldPassword,
                newPassword
              )

            // SUCCESS
            if (result.success) {

              showPasswordMessage(
                "Parol muvaffaqiyatli o'zgartirildi",
                "green"
              )

              // CLEAR INPUTS
              document.getElementById(
                "oldPasswordInput"
              ).value = ""

              document.getElementById(
                "newPasswordInput"
              ).value = ""

              document.getElementById(
                "confirmPasswordInput"
              ).value = ""

            }

            // ERROR
            else {

              showPasswordMessage(
                result.message,
                "red"
              )

            }

          }

        )

      }

      // MESSAGE FUNCTION
      function showPasswordMessage(
        text,
        color
      ) {

        message.style.display =
          "block"

        message.textContent =
          text

        message.style.color =
          color

      }

    }
  )

  // DOM tayyor bo'lganda ishga tushir
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSecurityTab);
  } else {
    initSecurityTab();
  }
})();

// Backend DASHBOARD API
// DASHBOARD MANAGER
var DashboardStatisticsManager = {

  init: async function () {

    // BUG FIX: boshqa oqim allaqachon bootstrap qilgan bo'lsa, qayta yuklamaymiz.
    if (dashboardBootstrapped) {
      console.log("ℹ️ DASHBOARD INIT — allaqachon bootstrap qilingan, skip.");
      return;
    }
    dashboardBootstrapped = true;

    console.log(
      "🚀 DASHBOARD INIT"
    )

    // API LOAD
    const data =
      await getDashboardStatistics()
    // AGAR DATA KELSA
    if (data) {

      this.updateDashboard(
        data
      )

    }

  },

  // MONEY FORMAT
  formatMoney: function (amount) {

    if (!amount) {
      return "0"
    }

    return Number(amount)
      .toLocaleString(
        "uz-UZ"
      )

  },

  // DASHBOARD UPDATE
  updateDashboard: function (data) {

    console.log(
      "🎨 DASHBOARD UI UPDATE"
    )

    console.log(data)

    // 1. OYLIK TUSHUM
    const revenueElement =
      document.querySelector(
        '[data-key="totalRevenue"]'
      )

    if (revenueElement) {

      revenueElement.innerHTML =
        `
                ${this.formatMoney(
          data.monthly_revenue
        )}
                <small>UZS</small>
                `

    }

    // REVENUE CHANGE
    const revenueChange =
      document.getElementById(
        "monthlyRevenueChange"
      )

   if (revenueChange) {
      const growth = Number(data.monthly_revenue_growth);

      if (!Number.isFinite(growth) || growth === 0) {
        revenueChange.textContent = "—";
      } else if (growth > 0) {
        revenueChange.textContent = `▲ ${growth}% o'sish`;
      } else {
        revenueChange.textContent =
          `▼ ${Math.abs(growth)}% kamayish`;
      }
    }
    // 2. DAILY SALES
    const dailySales =
      document.getElementById(
        "dailySalesCounter"
      )

    if (dailySales) {

      dailySales.innerHTML =
        `
                ${this.formatMoney(
          data.daily_sales
        )}
                <small>UZS</small>
                `
    }

    // DAILY CHANGE
    const dailyChange =
      document.getElementById(
        "dailySalesChange"
      )

    if (dailyChange) {
      const change = Number(data.daily_sales_change);

      if (!Number.isFinite(change) || change === 0) {
        dailyChange.textContent = "—";
      } else if (change > 0) {
        dailyChange.textContent =
          `▲ ${change}% kechaga nisbatan`;
      } else {
        dailyChange.textContent =
          `▼ ${Math.abs(change)}% kechaga nisbatan`;
      }
    }

    // 3. MONTHLY PROFIT
    const profitElement =
      document.querySelector(
        '[data-key="totalProfit"]'
      )

    if (profitElement) {

      profitElement.innerHTML =
        `
                ${this.formatMoney(
          data.monthly_profit
        )}
                <small>UZS</small>
                `

    }

    // 4. INVENTORY BALANCE
    const inventoryElement =
      document.querySelector(
        '[data-key="inventoryBalance"]'
      )

    if (inventoryElement) {

      inventoryElement.innerHTML =
        `
                ${this.formatMoney(
          data.inventory_balance
        )}
                <small>UZS</small>
                `

    }

  },

  // OVERDUE UI
  updateOverdueCards: function (
    data
  ) {

    const container =
      document.getElementById(
        "overdueCards"
      )

    if (!container) return

    container.innerHTML =
      `
            <div class="overdue-card">

                <h4>
                    ${data.overdue_count}
                </h4>

                <p>
                    Muddati o'tgan to'lovlar
                </p>

                <strong>
                    ${this.formatMoney(
        data.overdue_payments
      )} UZS
                </strong>

            </div>
            `

  },
  // OVERDUE API uchun
  renderOverdueCardsApi: function (
    debtors
  ) {

    const container =
      document.getElementById(
        "overdueCards"
      );

    if (!container) return;

    container.innerHTML = "";

    debtors.forEach(debtor => {

      const urgencyClass =
        debtor.overdueDays >= 7
          ? "critical"
          : debtor.overdueDays >= 3
            ? "warning"
            : "mild";

      container.innerHTML += `
      <div class="overdue-card-mini ${urgencyClass}">
        <div class="overdue-mini-left">
          <div class="overdue-mini-name">
            ${debtor.name}
          </div>

          <div class="overdue-mini-amount">
            ${debtor.amount.toLocaleString()} so'm
          </div>
        </div>

        <div class="overdue-mini-right">
          <div class="overdue-mini-days ${urgencyClass}">
            ${debtor.overdueDays} kun
          </div>
        </div>
      </div>
    `;
    });

  },

  // LOW STOCK UI
  updateLowStock: function (
    data
  ) {

    const container =
      document.getElementById(
        "lowStockContainer"
      )

    if (!container) return

    container.innerHTML =
      `
            <div class="low-stock-item">

                <strong>
                    ${data.low_stock_count}
                </strong>

                <p>
                    Kam qolgan mahsulotlar
                </p>

            </div>
            `

  }

}

// Backend DASHBOARD API 
// =========================================
// DASHBOARD STATISTICS — FIXED
// =========================================
async function getDashboardStatistics() {
  console.log("📊 DASHBOARD API START");

  // OFFLINE MODE
  if (OFFLINE_DATA_MODE) {

    const todayRevenue = calculateTodayRevenue();
    const monthlyRevenue = calculateMonthlyRevenue();

    const previousMonthRevenue =
      getPreviousMonthRevenue();

    const monthlyGrowth =
      previousMonthRevenue > 0
        ? Math.round(
            ((monthlyRevenue - previousMonthRevenue) /
              previousMonthRevenue) * 100
          )
        : 0;

    const inventoryBalance =
      calculateInventoryBalance();

    const data = {
      monthly_revenue: monthlyRevenue,
      monthly_revenue_growth: monthlyGrowth,
      daily_sales: todayRevenue,
      daily_sales_change: 0,
      monthly_profit: calculateMonthlyProfit(),
      inventory_balance: inventoryBalance
    };

    DashboardStatisticsManager.updateDashboard(data);

    return data;
  }

  // ONLINE MODE
  try {

    // BUG FIX: /v1/dashboard/stats backendda mavjud emas (404 → har doim
    // fallbackData'ga tushib, "0" ko'rsatardi). Backend routes.js/statistics.route.js'da
    // tasdiqlangan haqiqiy endpoint: GET /statistics/full. U aynan shu quyida
    // o'qilayotgan field nomlarini (monthly_revenue, monthly_revenue_growth,
    // daily_sales, daily_sales_change, monthly_profit, inventory_balance) qaytaradi —
    // shuning uchun pastdagi parsing kodiga tegilmadi, faqat URL to'g'irlandi.
    const response = await window.crmApi.get(
      "/statistics/full"
    );

    const raw =
      response.data?.data ||
      response.data;

    const data = {
      monthly_revenue:
        Number(raw.monthly_revenue) || 0,

      monthly_revenue_growth:
        Number(raw.monthly_revenue_growth) || 0,

      daily_sales:
        Number(raw.daily_sales) || 0,

      daily_sales_change:
        Number(raw.daily_sales_change) || 0,

      monthly_profit:
        Number(raw.monthly_profit) || 0,

      inventory_balance:
        Number(raw.inventory_balance) || 0
    };

    console.log("✅ DASHBOARD STATISTICS");
    console.table([data]);

    DashboardStatisticsManager.updateDashboard(data);

    return data;

  } catch (error) {

    console.error("❌ DASHBOARD API ERROR");

    console.table({
      status: error?.response?.status || null,
      url: error?.config?.url || null,
      message:
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message
    });

    // Backend statistics ishlamasa,
    // frontenddagi real ma'lumotlardan hisoblaymiz.
    const monthlyRevenue =
      calculateMonthlyRevenue();

    const previousMonthRevenue =
      getPreviousMonthRevenue();

    const monthlyGrowth =
      previousMonthRevenue > 0
        ? Math.round(
            ((monthlyRevenue - previousMonthRevenue) /
              previousMonthRevenue) * 100
          )
        : 0;

    const todayRevenue =
      calculateTodayRevenue();

    const yesterdayRevenue =
      calculateYesterdayRevenue
        ? calculateYesterdayRevenue()
        : 0;

    const dailyChange =
      yesterdayRevenue > 0
        ? Math.round(
            ((todayRevenue - yesterdayRevenue) /
              yesterdayRevenue) * 100
          )
        : 0;

    const fallbackData = {
      monthly_revenue: monthlyRevenue,

      monthly_revenue_growth:
        monthlyGrowth,

      daily_sales:
        todayRevenue,

      daily_sales_change:
        dailyChange,

      monthly_profit:
        calculateMonthlyProfit(),

      inventory_balance:
        calculateInventoryBalance()
    };

        DashboardStatisticsManager.updateDashboard(
          fallbackData
        );

        return fallbackData;
      }
    }

// Automatically bind to window
window.getDashboardStatistics = getDashboardStatistics;

// Backend API Weekly Chart
// async function getWeeklyTrend() {

//   // const token =
//   //   localStorage.getItem("access_token");

//   const token = AuthSystem.getAccessToken()

//   if (!token) {

//     console.error("❌ TOKEN TOPILMADI");

//     return [];

//   }

//   try {

//     const response =
//       await axios.get(
//         `${API_URL}/api/v1/dashboard/weekly-trend`,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`
//           }
//         }
//       );

//     console.log("📈 WEEKLY TREND");
//     console.log(response.data);

//     return response.data;

//   } catch (error) {

//     console.error(
//       "❌ WEEKLY TREND ERROR"
//     );

//     console.error(error);

//     return [];

//   }
// }

async function getWeeklyTrend() {

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📈 WEEKLY TREND");

  try {

    let result;

    // ===============================================
    // ONLINE
    // ===============================================

    if (!OFFLINE_DATA_MODE) {

      result = await AuthSystem.getSales({
        status: "active",
        sort_order: "ascending"
      });

      console.log(
        "📥 WEEKLY SALES API:",
        result
      );

      if (
        !result ||
        !result.success
      ) {
        console.error(
          "❌ WEEKLY SALES API ERROR:",
          result?.backendMessage ||
          result?.responseData
        );

        return [];
      }

    }

    // ===============================================
    // SALES MANBAI
    // ===============================================

    let sourceSales = [];

    if (OFFLINE_DATA_MODE) {

      sourceSales = Array.isArray(sales)
        ? sales
        : [];

    } else {

      sourceSales =
        Array.isArray(result.data)
          ? result.data
          : [];

    }

    // ===============================================
    // 7 KUN
    // ===============================================

    const dayNames = [
      "Yak",
      "Dush",
      "Sesh",
      "Char",
      "Pay",
      "Juma",
      "Shan"
    ];

    const trend = [];

    for (let i = 6; i >= 0; i--) {

      const date = new Date();

      date.setHours(
        0,
        0,
        0,
        0
      );

      date.setDate(
        date.getDate() - i
      );

      const dateKey =
        getDateKey(date);

      let amount = 0;

      // =============================================
      // ONLINE YANGI SALE FORMAT
      // =============================================

      if (!OFFLINE_DATA_MODE) {

        sourceSales.forEach(sale => {

          if (
            !sale ||
            sale.status !== "active"
          ) {
            return;
          }

          const saleDate =
            sale.createdAt ||
            sale.updatedAt;

          if (
            !saleDate ||
            getDateKey(saleDate) !== dateKey
          ) {
            return;
          }

          if (
            Array.isArray(sale.products)
          ) {

            sale.products.forEach(item => {

              const quantity =
                Number(item.quantity) || 0;

              const price =
                Number(item.selling_price) || 0;

              amount +=
                price * quantity;
            });

          } else {

            amount +=
              Number(sale.total_price) || 0;
          }

        });

      }

      // =============================================
      // OFFLINE / ESKI FORMAT
      // =============================================

      else {

        sourceSales.forEach(sale => {

          if (
            sale.status !== "sold"
          ) {
            return;
          }

          if (
            getDateKey(sale.date) !== dateKey
          ) {
            return;
          }

          amount +=
            Number(sale.total) || 0;
        });

      }

      trend.push({

        day:
          dayNames[date.getDay()],

        amount:
          Math.round(amount)

      });

    }

    console.log(
      "✅ WEEKLY TREND RESULT:",
      trend
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return trend;

  } catch (error) {

    console.error(
      "❌ WEEKLY TREND ERROR:",
      error?.response?.data ||
      error?.message ||
      error
    );

    return [];
  }
}

async function getDailyRevenue() {

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 DAILY REVENUE");

  try {

    // ===============================================
    // ONLINE
    // ===============================================

    if (!OFFLINE_DATA_MODE) {

      const result =
        await AuthSystem.getSales({
          status: "active",
          sort_order: "descending"
        });

      console.log(
        "📥 DAILY SALES API:",
        result
      );

      if (
        !result ||
        !result.success
      ) {

        console.error(
          "❌ DAILY SALES API ERROR:",
          result?.backendMessage ||
          result?.responseData
        );

        return {
          daily_revenue: 0
        };
      }

      const today =
        getToday();

      let dailyRevenue = 0;

      const rawSales =
        Array.isArray(result.data)
          ? result.data
          : [];

      rawSales.forEach(sale => {

        if (
          !sale ||
          sale.status !== "active"
        ) {
          return;
        }

        const saleDate =
          sale.createdAt ||
          sale.updatedAt;

        if (
          !saleDate ||
          getDateKey(saleDate) !== today
        ) {
          return;
        }

        // =========================================
        // YANGI API:
        // products[]
        // =========================================

        if (
          Array.isArray(sale.products)
        ) {

          sale.products.forEach(item => {

            const quantity =
              Number(item.quantity) || 0;

            const sellingPrice =
              Number(item.selling_price) || 0;

            dailyRevenue +=
              quantity * sellingPrice;

          });

        }

        // =========================================
        // FALLBACK
        // =========================================

        else {

          dailyRevenue +=
            Number(sale.total_price) || 0;

        }

      });

      const data = {
        daily_revenue:
          Math.round(dailyRevenue)
      };

      console.log(
        "✅ DAILY REVENUE:",
        data
      );

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      return data;
    }

    // ===============================================
    // OFFLINE
    // ===============================================

    const data = {
      daily_revenue:
        calculateTodayRevenue()
    };

    console.log(
      "📊 DAILY REVENUE (OFFLINE):",
      data
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return data;

  } catch (error) {

    console.error(
      "❌ DAILY REVENUE ERROR:",
      error?.response?.data ||
      error?.message ||
      error
    );

    return {
      daily_revenue: 0
    };
  }
}

async function getLowStockAlerts() {
  // OFFLINE DATA MODE START
  if (OFFLINE_DATA_MODE) {
    const lowStock = products.filter(p => {
      const initial = Number(p.initialStock) || 0;
      const stock = Number(p.stock) || 0;
      return stock <= 0 || (initial > 0 && stock / initial <= 0.2);
    });
    console.log("⚠️ LOW STOCK (OFFLINE)", lowStock);
    return lowStock;
  }
  // OFFLINE DATA MODE END

  // Backendda alohida /dashboard/low-stock-alerts endpointi yo'q.
  // /product/get orqali allaqachon yuklangan `products` massividan,
  // minimum_quantity chegarasiga qarab, frontendda hisoblaymiz.
  try {
    const lowStock = products.filter(p => {
      const stock = Number(p.stock) || 0;
      const minStock = Number(p.minStock) || 0;
      return stock <= minStock;
    });
    console.log("⚠️ LOW STOCK", lowStock);
    return lowStock;
  } catch (error) {
    console.error("❌ LOW STOCK ERROR", error);
    return [];
  }
}

// NOTE: a second, duplicate `async function getDailyRevenue()` used to be
// defined here. It bypassed window.crmApi and called axios.get() directly
// with a manually-read AuthSystem.getAccessToken() — no auto-refresh-on-401
// logic, so an expired/near-expired token caused a hard 401 Unauthorized.
// Because JS keeps only the LAST function declaration with a given name,
// this broken duplicate was silently overriding the working getDailyRevenue()
// defined above (which uses window.crmApi.get(), the same authenticated
// client used everywhere else in the app, including its refresh interceptor).
// Removed — the version above is now the only one, and it is used everywhere.

// NOTE: a second, duplicate `async function getLowStockAlerts()` used to be
// defined here, with the same bug as the old duplicate getDailyRevenue():
// raw axios.get() + manually-read token, no refresh-on-401 handling, silently
// overriding the working window.crmApi-based version defined above. Removed.

// // Backend API Overdue Payments
async function getOverduePayments() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⏰ OVERDUE PAYMENTS API");

  try {
    // Backendda alohida /dashboard/overdue-payments endpointi yo'q.
    // /statistics/full ichidagi overdue_payments/overdue_count dan foydalanamiz.
    const result = await AuthSystem.getStatistics();

    if (!result || !result.success) {
      console.error("❌ OVERDUE PAYMENTS ERROR:", result?.backendMessage);
      return { overdue_payments: 0, overdue_count: 0 };
    }

    const stats = result.data?.data || result.data || {};
    const data = {
      overdue_payments: Number(stats.overdue_payments) || 0,
      overdue_count: Number(stats.overdue_count) || 0
    };

    console.log("✅ OVERDUE PAYMENTS:", data);
    console.log("━━━━━━━━━━━━━━━━━━━━━━");

    return data;
  } catch (error) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ STATUS: FAILED", error?.message || error);
    return { overdue_payments: 0, overdue_count: 0 };
  }
}

// // Backend API DailySalesStats
async function getDailySalesStats() {
  if (OFFLINE_DATA_MODE) {
    return {
      today_revenue: calculateTodayRevenue()
    };
  }

  try {
    const response = await window.crmApi.get(
      "/statistics/daily-revenue"
    );

    const data = response.data;

    return {
      today_revenue: Number(
        data.today_revenue ??
        data.daily_revenue ??
        data.revenue ??
        0
      )
    };
  } catch (error) {
    console.error(
      "❌ DAILY REVENUE ERROR:",
      error?.response?.status,
      error?.response?.data || error.message
    );

    return null;
  }
}

// // Backend API DAILY TRANSACTIONS 
async function getDailyTransactions(period = "daily") {
  console.log("━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🛒 DAILY TRANSACTIONS");
  console.log("📅 PERIOD:", period);

  try {
    const allSales = Array.isArray(sales)
      ? sales
      : [];

    const now = new Date();

    const filtered = allSales.filter(sale => {
      if (sale.status && sale.status !== "sold") {
        return false;
      }

      const saleDate = new Date(
        sale.createdAt ||
        sale.created_at ||
        sale.date ||
        sale.sale_date
      );

      if (Number.isNaN(saleDate.getTime())) {
        return false;
      }

      if (period === "daily") {
        return saleDate.toDateString() === now.toDateString();
      }

      if (period === "weekly") {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);

        return saleDate >= weekAgo;
      }

      if (period === "monthly") {
        return (
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear()
        );
      }

      return true;
    });

    return {
      items: filtered,
      total: filtered.reduce(
        (sum, sale) => sum + (Number(sale.total) || 0),
        0
      )
    };

  } catch (error) {
    console.error("❌ TRANSACTIONS ERROR:", error);

    return {
      items: [],
      total: 0
    };
  }
}

// ==========================================
// TRANSACTIONS EXCEL EXPORT
// Professional XLSX Export
// ==========================================
function exportTransactionsExcel() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 EXPORT START");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // ------------------------------------------
    // 1. SALES DATA CHECK
    // ------------------------------------------
    if (!Array.isArray(sales)) {
      console.error("❌ EXPORT: sales array mavjud emas");
      return;
    }

    // Har bosishda filterning ENG YANGI qiymatini olamiz
    const currentFilter = String(transactionFilter || "all")
      .trim()
      .toLowerCase();

    const today = getToday();

    console.log("🔎 CURRENT FILTER:", currentFilter);
    console.log("📅 TODAY:", today);
    console.log("📦 TOTAL SALES:", sales.length);

    let filteredSales = [];
    let fileName = "";

    // ------------------------------------------
    // 2. DAILY
    // ------------------------------------------
    if (currentFilter === "daily") {
      filteredSales = sales.filter((sale) => {
        if (!sale || !sale.date) return false;

        return getDateKey(sale.date) === today;
      });

      fileName = `Kunlik_Savdo_${today}`;

      console.log("📅 FILTER: DAILY");
    }

    // ------------------------------------------
    // 3. WEEKLY
    // Oxirgi 7 kun: bugun + oldingi 6 kun
    // ------------------------------------------
    else if (currentFilter === "weekly") {
      const now = new Date();

      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 6);

      const end = new Date(now);
      end.setHours(23, 59, 59, 999);

      filteredSales = sales.filter((sale) => {
        if (!sale || !sale.date) return false;

        const saleDate = toLocalDate(sale.date);

        if (!(saleDate instanceof Date) || isNaN(saleDate)) {
          return false;
        }

        return saleDate >= start && saleDate <= end;
      });

      fileName = `Haftalik_Savdo_${today}`;

      console.log("📅 FILTER: WEEKLY");
      console.log("🟢 START:", start);
      console.log("🔴 END:", end);
    }

    // ------------------------------------------
    // 4. MONTHLY
    // ------------------------------------------
    else if (currentFilter === "monthly") {
      const [year, month] = today.split("-");

      filteredSales = sales.filter((sale) => {
        if (!sale || !sale.date) return false;

        const saleDate = getDateKey(sale.date);

        if (!saleDate) return false;

        const [saleYear, saleMonth] =
          saleDate.split("-");

        return (
          saleYear === year &&
          saleMonth === month
        );
      });

      fileName = `Oylik_Savdo_${year}-${month}`;

      console.log("📅 FILTER: MONTHLY");
      console.log("📅 YEAR:", year);
      console.log("📅 MONTH:", month);
    }

    // ------------------------------------------
    // 5. ALL
    // ------------------------------------------
    else {
      filteredSales = [...sales];

      fileName = `Savdolar_${today}`;

      console.log("📅 FILTER: ALL");
    }

    // ------------------------------------------
    // 6. DATA CHECK
    // ------------------------------------------
    if (!filteredSales.length) {
      console.warn(
        "⚠️ EXPORT: Tanlangan davrda savdo mavjud emas."
      );

      console.log(
        "ℹ️ FILTER:",
        currentFilter
      );

      console.log(
        "ℹ️ TOTAL SALES:",
        sales.length
      );

      return;
    }

    console.log(
      "📦 FILTERED SALES:",
      filteredSales.length
    );

    // ------------------------------------------
    // 7. TABLE DATA
    // ------------------------------------------
    const rows = filteredSales.map((sale, index) => {
      const date = toLocalDate(sale.date);

      return {
        "#": index + 1,

        "Mahsulot":
          sale.name ||
          sale.product_name ||
          "Noma'lum",

        "Miqdor":
          Number(
            sale.qty ??
            sale.quantity ??
            0
          ),

        "Birlik":
          sale.unit || "",

        "Narx":
          Number(
            sale.price ??
            0
          ),

        "Valyuta":
          sale.currency ||
          "UZS",

        "Jami":
          Number(
            sale.total ??
            sale.total_amount ??
            0
          ),

        "To'lov turi":
          sale.paymentType === "card"
            ? "Karta"
            : sale.paymentType === "cash"
              ? "Naqd"
              : sale.paymentType || "",

        "Sana":
          date instanceof Date &&
          !isNaN(date)
            ? date.toLocaleDateString("uz-UZ")
            : "",

        "Vaqt":
          date instanceof Date &&
          !isNaN(date)
            ? date.toLocaleTimeString(
                "uz-UZ",
                {
                  hour: "2-digit",
                  minute: "2-digit"
                }
              )
            : "",

        "Status":
          sale.status === "sold"
            ? "Sotildi"
            : sale.status === "returned"
              ? "Qaytarildi"
              : sale.status || ""
      };
    });

    console.log(
      "📊 EXPORT ROWS:",
      rows.length
    );

    // ------------------------------------------
    // 8. XLSX LIBRARY CHECK
    // ------------------------------------------
    if (
      typeof XLSX === "undefined" ||
      !XLSX.utils ||
      !XLSX.writeFile
    ) {
      console.error(
        "❌ XLSX library topilmadi."
      );

      return;
    }

    // ------------------------------------------
    // 9. CREATE WORKSHEET
    // ------------------------------------------
    const worksheet =
      XLSX.utils.json_to_sheet(rows);

    // ------------------------------------------
    // 10. COLUMN WIDTHS
    // ------------------------------------------
    worksheet["!cols"] = [
      { wch: 6 },   // #
      { wch: 30 },  // Mahsulot
      { wch: 12 },  // Miqdor
      { wch: 12 },  // Birlik
      { wch: 16 },  // Narx
      { wch: 12 },  // Valyuta
      { wch: 18 },  // Jami
      { wch: 18 },  // To'lov turi
      { wch: 15 },  // Sana
      { wch: 12 },  // Vaqt
      { wch: 16 }   // Status
    ];

    // ------------------------------------------
    // 11. CREATE WORKBOOK
    // ------------------------------------------
    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Savdolar"
    );

    // ------------------------------------------
    // 12. EXPORT XLSX ONLY
    // ------------------------------------------
    XLSX.writeFile(
      workbook,
      `${fileName}.xlsx`,
      {
        bookType: "xlsx",
        compression: true
      }
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ XLSX EXPORT SUCCESS");
    console.log("📄 FILE:", `${fileName}.xlsx`);
    console.log("📊 ROWS:", rows.length);
    console.log("🔎 FILTER:", currentFilter);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  } catch (error) {
    console.error(
      "❌ EXPORT ERROR:",
      error
    );
  }
}

// NOTE: a second, fully identical `async function apiLoadCategories()` used
// to be defined here (harmless duplicate — same logic as the one earlier in
// this file). Removed as dead code to avoid the same "last declaration wins"
// risk if one copy is ever edited without the other.

async function createCategory(name) {

  try {

    const result = await AuthSystem.createCategory({
      category_name: name
    });

    if (!result || !result.success) {
      console.error("❌ CREATE CATEGORY ERROR:", result?.backendMessage);
      return null;
    }

    console.log(
      "✅ CATEGORY CREATED"
    );

    console.table(
      result.data
    );

    await apiLoadCategories();

    return result.data;

  } catch (error) {

    console.error(
      "❌ CREATE CATEGORY ERROR"
    );

    console.log(
      "STATUS:",
      error.response?.status
    );

    console.log(
      "DATA:",
      error.response?.data
    );

  }
}


// // Backend API Delete Categories
// async function deleteCategoryApi(
//   categoryId
// ) {

//   try {

//     const response =
//       await window.crmApi.delete(
//         `/api/v1/products/categories/${categoryId}`
//       );

//     console.log(
//       "🗑 CATEGORY DELETED"
//     );

//     console.log(
//       response.data
//     );

//     await apiLoadCategories();

//   } catch (error) {

//     console.error(
//       "❌ DELETE ERROR"
//     );

//     console.error(error);

//   }

// }

// document
//   .getElementById(
//     "deleteCategory"
//   )
//   .addEventListener(
//     "click",
//     async () => {

//       const select =
//         document.getElementById(
//           "categoryList"
//         );

//       const categoryId =
//         select.value;

//       if (!categoryId)
//         return;

//       const confirmDelete =
//         confirm(
//           "Kategoriyani o'chirishni xohlaysizmi?"
//         );

//       if (
//         !confirmDelete
//       )
//         return;

//       await deleteCategoryApi(
//         categoryId
//       );

//     }
//   );

// // Backend PRODUCT SEARCH API
async function searchProductApi(keyword) {
  try {

    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 PRODUCT SEARCH API");
    console.log("📝 QUERY:", keyword);

    const response = await window.crmApi.get(
      "/api/v1/sales/search-product",
      {
        params: { q: keyword }
      }
    );

    console.log("✅ SEARCH SUCCESS");
    console.log("📦 RESULT COUNT:", response.data.length);
    console.table(response.data);

    return response.data;

  } catch (error) {

    console.log("❌ SEARCH FAILED");

    if (error.response) {
      console.log(error.response.data);
    }

    return [];
  }
}

// // Backend DEBTORS API
async function getDebtorsStats() {
  try {
    const result = await AuthSystem.getDebts();

    if (!result || !result.success) {
      return {
        monthly_collected: 0,
        overdue_count: 0,
        overdue_total: 0,
        upcoming_count: 0,
        upcoming_total: 0
      };
    }

    const debts =
      result.data?.debts ||
      result.data?.data ||
      result.debts ||
      [];

    const now = new Date();

    let overdue_count = 0;
    let overdue_total = 0;
    let upcoming_count = 0;
    let upcoming_total = 0;

    debts.forEach(debt => {
      const remaining =
        Number(
          debt.total_remaining ??
          debt.remaining_amount ??
          debt.remaining ??
          0
        );

      if (remaining <= 0) return;

      const dueDate = new Date(
        debt.due_date ||
        debt.dueDate ||
        debt.payment_date
      );

      if (Number.isNaN(dueDate.getTime())) return;

      if (dueDate < now) {
        overdue_count++;
        overdue_total += remaining;
      } else {
        upcoming_count++;
        upcoming_total += remaining;
      }
    });

    return {
      monthly_collected: 0,
      overdue_count,
      overdue_total,
      upcoming_count,
      upcoming_total
    };

  } catch (error) {
    console.error("❌ DEBT STATS:", error);

    return {
      monthly_collected: 0,
      overdue_count: 0,
      overdue_total: 0,
      upcoming_count: 0,
      upcoming_total: 0
    };
  }
}

// // Backend DEBTORS List API

// ================================
// GET PROFILE
// ================================
async function apiGetProfile() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👤 PROFILE API");
  console.log("📤 REQUEST");
  console.log("GET /api/v1/settings/profile");
  console.log("🕒", new Date().toLocaleString());

  try {
    const response = await window.crmApi.get("/settings/profile");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ STATUS : SUCCESS");
    console.log("🌐 HTTP :", response.status);
    console.log("📊 RESPONSE");
    console.table([response.data]);

    const profile = response.data;

    console.log("👤 Full Name :", profile.full_name);
    console.log("📧 Email     :", profile.email);
    console.log("📱 Phone     :", profile.phone);
    console.log("🏢 Company   :", profile.company_name);
    console.log("🏷 Role      :", profile.role);
    console.log("🏢 Department:", profile.department);
    console.log("🌙 Dark Mode :", profile.dark_mode);
    console.log("🔐 2FA       :", profile.two_factor_enabled);
    console.log("📩 Email Not :", profile.email_notifications);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // AuthSystem dagi userni yangilash
    if (window.AuthSystem?.updateCurrentUserData) {
      window.AuthSystem.updateCurrentUserData(profile);
    }

    // Topbarni yangilash
    if (window.CRMTopbar?.updateProfile) {
      window.CRMTopbar.updateProfile(profile);
    }

    return profile;

  } catch (error) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("❌ STATUS : ERROR");
    console.log("🌐 HTTP :", error?.response?.status);
    console.log("📊 RESPONSE :", error?.response?.data || error.message);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    throw error;
  }
}

// // Backend SETTINGS PROFILE API
// =========================================
// GET SETTINGS PROFILE — FIXED
// =========================================
async function apiLoadSettingsProfile() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚙️ SETTINGS PROFILE API");
  console.log("📤 REQUEST: GET /v1/settings/profile");

  try {
    const response = await window.crmApi.get(
      "/v1/settings/profile"
    );

    const profile =
      response.data?.data ||
      response.data?.profile ||
      response.data;

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ PROFILE LOAD SUCCESS");
    console.log("🌐 HTTP:", response.status);
    console.table([profile]);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    window.settingsProfile = profile;

    if (window.AuthSystem?.updateCurrentUserData) {
      window.AuthSystem.updateCurrentUserData(profile);
    }

    if (window.CRMTopbar?.updateProfile) {
      window.CRMTopbar.updateProfile(profile);
    }

    if (window.TopbarProfileManager) {
      window.TopbarProfileManager.updateAllUI({
        fullName:
          profile.full_name ||
          profile.fullName ||
          "",
        email:
          profile.email ||
          "",
        phone:
          profile.phone ||
          "",
        company:
          profile.company_name ||
          profile.company ||
          "",
        department:
          profile.department ||
          profile.role ||
          "",
        avatar:
          profile.avatar_url ||
          profile.avatar ||
          ""
      });
    }

    return profile;

  } catch (error) {
    console.error("❌ PROFILE LOAD ERROR");

    console.table({
      status: error?.response?.status || null,
      url: error?.config?.url || null,
      message:
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Profil yuklanmadi"
    });

    return null;
  }
}

// // Backend UPDATE PROFILE API
// =========================================
// PROFILE UPDATE API — FIXED
// =========================================
async function apiUpdateProfile(profileData) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👤 UPDATE PROFILE API");
  console.log("📤 REQUEST: PUT /v1/settings/profile");
  console.table([profileData]);

  try {
    const response = await window.crmApi.put(
      "/settings/profile",
      profileData
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ PROFILE UPDATE SUCCESS");
    console.log("🌐 HTTP:", response.status);
    console.table([response.data]);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const profile = response.data?.data || response.data?.profile || response.data;

    // Auth storage'ni yangilash
    if (window.AuthSystem?.updateCurrentUserData) {
      window.AuthSystem.updateCurrentUserData(profile);
    }

    // Topbar
    if (window.TopbarProfileManager) {
      window.TopbarProfileManager.updateAllUI({
        fullName:
          profile.full_name ||
          profile.fullName ||
          "",
        email:
          profile.email ||
          "",
        phone:
          profile.phone ||
          "",
        company:
          profile.company_name ||
          profile.company ||
          "",
        department:
          profile.department ||
          profile.role ||
          "",
        avatar:
          profile.avatar_url ||
          profile.avatar ||
          ""
      });
    }

    // Boshqa UI modullariga signal
    window.dispatchEvent(
      new CustomEvent("profileUpdated", {
        detail: profile
      })
    );

    if (window.CRMTopbar?.updateProfile) {
      window.CRMTopbar.updateProfile(profile);
    }

    return {
      success: true,
      data: profile
    };

  } catch (error) {
    console.error("❌ PROFILE UPDATE ERROR");

    console.table({
      success: false,
      status: error?.response?.status || null,
      url: error?.config?.url || null,
      message:
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Profilni saqlashda xatolik"
    });

    return {
      success: false,
      status: error?.response?.status || null,
      message:
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Profilni saqlashda xatolik yuz berdi."
    };
  }
}

// // Backend UPDATE AVATAR API
async function apiUpdateAvatar(file) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🖼 UPDATE AVATAR");
  console.log("📤 REQUEST");
  console.log(file);

  try {

    const formData = new FormData();
    formData.append("avatar", file);

    const response = await window.crmApi.put(
      "/api/v1/settings/profile/avatar",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      }
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ STATUS : SUCCESS");
    console.log("🌐 HTTP :", response.status);
    console.table(response.data);

    // UI ni yangilash
    if (window.CRMTopbar) {
      window.CRMTopbar.updateProfile(response.data);
    }

    return {
      success: true,
      data: response.data
    };

  } catch (error) {

    console.log("━━━━━━━━━━━━━━━━━━━━━━");
    console.log("❌ STATUS : ERROR");
    console.log("🌐 HTTP :", error.response?.status);
    console.log(error.response?.data || error);

    return {
      success: false,
      message: getApiErrorMessage(error, "Avatar yangilanmadi")
    };
  }
}

// // Backend UPDATE SYSTEM SETTINGS API
async function apiUpdateSystemSettings(data) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚙ UPDATE SYSTEM SETTINGS");
  console.log("📤 REQUEST");
  console.table([{
    dark_mode: data.dark_mode,
    email_notifications: data.email_notifications
  }]);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const response = await window.crmApi.put("/api/v1/settings/system", {
      dark_mode: data.dark_mode,
      email_notifications: data.email_notifications
    });

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ STATUS : SUCCESS");
    console.log("🌐 HTTP :", response.status);
    console.log("📊 RESPONSE");
    console.table([response.data]);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return response.data;

  } catch (error) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("❌ STATUS : ERROR");
    console.log("🌐 HTTP :", error?.response?.status);
    console.log("📄 Response :", error?.response?.data || error.message);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    throw error;
  }
}

// // Backend TOGGLE 2FA API
async function apiToggle2FA(enabled) {

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔐 TOGGLE 2FA");
  console.log("📤 REQUEST");
  console.log("PUT /api/v1/settings/security/2fa");
  console.table({
    enabled: enabled
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {

    const response = await window.crmApi.put(
      "/api/v1/settings/security/2fa",
      null,
      {
        params: {
          enabled: enabled
        }
      }
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ STATUS : SUCCESS");
    console.log("🌐 HTTP :", response.status);
    console.table([response.data]);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return response.data;

  } catch (error) {

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("❌ STATUS : ERROR");
    console.log("🌐 HTTP :", error.response?.status);
    console.log("📄 Response :", error.response?.data);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    throw error;
  }

}
// =========================================
// GET PROFILE (NEW API)
// =========================================

async function apiGetProfileNew() {

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👤 PROFILE API");
  console.log("📤 REQUEST");
  console.log("GET /store/profile/get");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {

    const response = await window.crmApi.get("/store/profile/get");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ STATUS : SUCCESS");
    console.log("🌐 HTTP :", response.status);
    console.log("📊 PROFILE");
    console.table([response.data]);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return {
    profile: {
        full_name: response.data.ceo_name,
        phone: response.data.ceo_phone,
        company_name: response.data.store_name,
        avatar_url: response.data.profile_picture || "",
        email: "",
        role: ""
    },
    stats: {}
};

  } catch (error) {

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("❌ STATUS : ERROR");
    console.log("🌐 HTTP :", error?.response?.status);
    console.log("📄 RESPONSE :", error?.response?.data || error.message);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    throw error;

  }

}
async function loadProfileNew() {

  const data = await apiGetProfileNew();

  if (!data) return null;

  // Eski UI funksiyasidan foydalanamiz
  if (typeof updateProfileDisplay === "function") {
    updateProfileDisplay(data.profile);
  }

  // Agar Topbar Manager mavjud bo'lsa
  if (window.TopbarProfileManager) {

    // ✅ FIX 3a: response.data emas data.profile — apiGetProfileNew() {profile, stats} qaytaradi
    window.TopbarProfileManager.updateAllUI({
      fullName: data.profile.full_name || "",
      email: data.profile.email || "",
      phone: data.profile.phone || "",
      company: data.profile.company_name || "",
      department: data.profile.role || "",
      avatar: data.profile.avatar_url || ""
    });

  }

  return data;

}

window.loadProfileNew = loadProfileNew;
// ✅ FIX 3b: Ikkinchi loadProfileNew() o'chirildi — birinchisini override qilar edi
// va mavjud bo'lmagan updateProfileStats() → ReferenceError berardi.  