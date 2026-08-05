const express = require("express");
const { createFile } = require("../controllers/file.controller");
const upload = require("../config/multer");
const router = express.Router();

router.post("/create", upload.single("file"), createFile);

module.exports = router;
