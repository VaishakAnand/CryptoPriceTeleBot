const express = require("express");
const router = express.Router();
const simulatePurchase = require("../simulate_binance_functions.js");

router.post("/alert/:symbol", (req, res) => {
  simulatePurchase(req.params.symbol);
  res.status(200).send("ok");
});

module.exports = router;
