/**
 * MARK1 CRM — Backend Load Testing & Capacity Benchmark.
 *
 * Ishga tushirish: node qa/load/load-test.js
 * Muhit: Lokal QA server (http://127.0.0.1:3001)
 */
const http = require("http");

const BASE_URL = process.env.QA_API_URL || "http://127.0.0.1:3001";
const PHONE = "901234567";
const PASSWORD = "mark1qa2026";

function request(method, path, headers = {}, body = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const start = performance.now();
    const reqHeaders = { ...headers };
    let bodyData = null;

    if (body) {
      bodyData = JSON.stringify(body);
      reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(bodyData);
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
        timeout: 10000,
      },
      (res) => {
        let resBody = "";
        res.on("data", (chunk) => {
          resBody += chunk;
        });
        res.on("end", () => {
          const duration = performance.now() - start;
          let parsed = null;
          try {
            parsed = JSON.parse(resBody);
          } catch {}
          resolve({
            statusCode: res.statusCode,
            duration,
            body: parsed || resBody,
            error: null,
          });
        });
      },
    );

    req.on("timeout", () => {
      req.destroy();
      resolve({
        statusCode: 408,
        duration: performance.now() - start,
        body: null,
        error: "TIMEOUT",
      });
    });

    req.on("error", (err) => {
      resolve({
        statusCode: 500,
        duration: performance.now() - start,
        body: null,
        error: err.message,
      });
    });

    if (bodyData) req.write(bodyData);
    req.end();
  });
}

function calculatePercentiles(latencies) {
  if (!latencies.length) return { p50: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const getP = (p) => sorted[Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1)];
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    p50: Math.round(getP(50) * 10) / 10,
    p90: Math.round(getP(90) * 10) / 10,
    p95: Math.round(getP(95) * 10) / 10,
    p99: Math.round(getP(99) * 10) / 10,
    min: Math.round(sorted[0] * 10) / 10,
    max: Math.round(sorted[sorted.length - 1] * 10) / 10,
    avg: Math.round((sum / sorted.length) * 10) / 10,
  };
}

(async () => {
  console.log("=== MARK1 CRM LOAD TESTING & CAPACITY BENCHMARK ===");
  console.log(`URL: ${BASE_URL}`);

  // 1. Login
  const loginRes = await request("POST", "/api/auth/store/signin", {}, {
    ceo_phone: PHONE,
    password: PASSWORD,
  });

  if (loginRes.statusCode !== 200 || !loginRes.body?.access_token) {
    console.error("FAIL: Login amalga oshmadi:", loginRes.statusCode, loginRes.body);
    process.exit(1);
  }

  const token = loginRes.body.access_token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log("✓ Login muvaffaqiyatli, token olindi.");

  // 2. Mahsulotlarni olish
  const prodRes = await request("GET", "/api/product/get?page=1&limit=5", authHeaders);
  const products = prodRes.body?.data || [];
  if (!products.length) {
    console.error("WARN: Test mahsulotlari topilmadi, faqat read-only testlar o'tkaziladi.");
  } else {
    console.log(`✓ ${products.length} ta mahsulot POS savdosi uchun tayyorlandi.`);
  }

  // Workload mix
  const workloadActions = [
    { name: "dashboard_stats", method: "GET", path: "/api/statistics/full", weight: 30 },
    { name: "products_list", method: "GET", "/api/product/get?page=1&limit=20": null, path: "/api/product/get?page=1&limit=20", weight: 25 },
    { name: "debtors_list", method: "GET", path: "/api/debt/get", weight: 20 },
    { name: "sales_history", method: "GET", path: "/api/sale/get?page=1&limit=20", weight: 15 },
    {
      name: "pos_cash_sale",
      method: "POST",
      path: "/api/sale/create",
      weight: 10,
      getBody: () => {
        const prod = products[0];
        if (!prod) return null;
        return {
          products: [{ product_id: prod._id, quantity: 1, selling_price: prod.selling_price || 10000 }],
          paid_by_cash: prod.selling_price || 10000,
          paid_by_card: 0,
        };
      },
    },
  ];

  function pickAction() {
    const totalWeight = workloadActions.reduce((acc, a) => acc + a.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const a of workloadActions) {
      if (rand < a.weight) return a;
      rand -= a.weight;
    }
    return workloadActions[0];
  }

  async function runStage(vuCount, durationSeconds) {
    console.log(`\n--- Bosqich: ${vuCount} ta parallel foydalanuvchi (${durationSeconds} sekund) ---`);
    const latencies = [];
    const statusCodes = {};
    const endpointMetrics = {};
    const endTime = Date.now() + durationSeconds * 1000;
    let completedRequests = 0;

    async function worker() {
      while (Date.now() < endTime) {
        const action = pickAction();
        const body = action.getBody ? action.getBody() : null;
        const res = await request(action.method, action.path, authHeaders, body);

        completedRequests++;
        latencies.push(res.duration);
        statusCodes[res.statusCode] = (statusCodes[res.statusCode] || 0) + 1;

        if (!endpointMetrics[action.name]) {
          endpointMetrics[action.name] = { count: 0, latencies: [], errors: 0 };
        }
        endpointMetrics[action.name].count++;
        endpointMetrics[action.name].latencies.push(res.duration);
        if (res.statusCode >= 400) endpointMetrics[action.name].errors++;
      }
    }

    const workers = [];
    for (let i = 0; i < vuCount; i++) {
      workers.push(worker());
    }
    await Promise.all(workers);

    const rps = Math.round((completedRequests / durationSeconds) * 10) / 10;
    const stats = calculatePercentiles(latencies);
    const errorCount = Object.keys(statusCodes)
      .filter((c) => Number(c) >= 400)
      .reduce((acc, c) => acc + statusCodes[c], 0);
    const errorRate = Math.round((errorCount / completedRequests) * 1000) / 10;

    console.log(`Natija: ${completedRequests} ta so'rov, ${rps} RPS, xatolik: ${errorRate}% (${errorCount} ta)`);
    console.log(`Kechikish: min=${stats.min}ms, p50=${stats.p50}ms, p90=${stats.p90}ms, p95=${stats.p95}ms, p99=${stats.p99}ms, max=${stats.max}ms`);
    console.log(`Status kodlari:`, JSON.stringify(statusCodes));

    console.log("Endpointlar bo'yicha tahlil:");
    for (const [name, data] of Object.entries(endpointMetrics)) {
      const epStats = calculatePercentiles(data.latencies);
      console.log(`  ${name.padEnd(18)} so'rov: ${String(data.count).padStart(4)}, p50: ${String(epStats.p50).padStart(5)}ms, p95: ${String(epStats.p95).padStart(5)}ms, xato: ${data.errors}`);
    }

    return {
      vuCount,
      completedRequests,
      durationSeconds,
      rps,
      errorRate,
      statusCodes,
      ...stats,
      endpointMetrics,
    };
  }

  // Stages
  const stage1 = await runStage(1, 4);   // Smoke / Baseline
  const stage2 = await runStage(10, 4);  // Low load (10 VU)
  const stage3 = await runStage(25, 4);  // Moderate load (25 VU)
  const stage4 = await runStage(50, 4);  // High load (50 VU)

  console.log("\n=======================================================");
  console.log("=== SIG'IM XULOSASI (CAPACITY SUMMARY) ===");
  console.log("=======================================================");
  console.log("| VU | So'rovlar | RPS    | p50 (ms) | p95 (ms) | p99 (ms) | Xatolik % |");
  console.log("|----|----------|--------|----------|----------|----------|-----------|");
  for (const s of [stage1, stage2, stage3, stage4]) {
    console.log(
      `| ${String(s.vuCount).padStart(2)} | ${String(s.completedRequests).padStart(8)} | ${String(s.rps).padStart(6)} | ${String(s.p50).padStart(8)} | ${String(s.p95).padStart(8)} | ${String(s.p99).padStart(8)} | ${String(s.errorRate + "%").padStart(9)} |`,
    );
  }
  console.log("=======================================================");
  process.exit(0);
})();
