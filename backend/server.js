require("dotenv").config();
const { db } = require("./config/db");

const path = require("path");
const cors = require("cors");
const express = require("express");
const cookieParser = require("cookie-parser");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const app = express();

const indexRoutes = require("./routes/index");

const { startReminderCron } = require("./config/reminder");

const allowedOrigins = [
  "https://mark1.uz",
  "https://www.mark1.uz",
  "https://admin.mark1.uz",
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
    origin: [
      "https://mark1-crm.netlify.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],

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
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use("/api/uploads", express.static(path.join(__dirname, "uploads"), {
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
