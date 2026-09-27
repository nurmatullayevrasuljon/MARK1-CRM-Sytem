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

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "https://mark1-crm.netlify.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
  }),
);
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));
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
