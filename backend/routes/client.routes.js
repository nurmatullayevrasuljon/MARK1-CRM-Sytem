const express = require("express");
const {
  createClient,
  updateClient,
  deleteClient,
  getClients,
} = require("../controllers/client.controller");
const router = express.Router();

router.post("/create", createClient);
router.put("/update", updateClient);
router.delete("/delete", deleteClient);
router.get("/get", getClients);

module.exports = router;
