require("dotenv").config();
const { db } = require("./config/db");

const fs = require("fs");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const express = require("express");
const cookieParser = require("cookie-parser");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const indexRoutes = require("./routes/index");
const { apiLimiter } = require("./middlewares/rateLimit.middleware");

const { startReminderCron } = require("./config/reminder");

const app = express();

// Render kabi proxy ortida ishlaganda CLIENT IP ni to'g'ri olish uchun
// majburiy — aks holda rate limiting barcha foydalanuvchini bitta
// "IP" deb hisoblaydi. `1` = faqat bitta proxy hop ishonchli.
app.set("trust proxy", 1);

const allowedOrigins = [
  "https://mark1.uz",
  "https://www.mark1.uz",
  "https://admin.mark1.uz",
  "https://mark1-crm.netlify.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:3000",
];
if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(",").forEach((o) => {
    const trimmed = o.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy: Ushbu manbadan kirish taqiqlangan"));
      }
    },
    credentials: true,
  }),
);
// Xavfsizlik headerlari (X-Content-Type-Options, X-Frame-Options,
// Referrer-Policy va boshqalar) — helmet orqali yagona joyda.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use("/api", apiLimiter);

// Upload papkasini yo'q bo'lsa ham yaratib qo'yamiz — aks holda
// fayl yuklash (multer) ishlamay qoladi.
const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

app.use("/api/uploads", express.static(uploadsDir, {
  dotfiles: "ignore",
  setHeaders: (res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
  },
}));
app.use("/api", indexRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT;

db().then(() => {
  startReminderCron();
  console.log("Reminder cron ishga tushdi");
});

app.listen(PORT, () =>
  console.log(`Server is running on: http://localhost:${PORT}`),
);
